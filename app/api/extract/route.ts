import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { requireAuth, handleAuthError } from '@/lib/auth'
import { extractPagesFromPDF, createFilesHash } from '@/lib/pdf-processing'
import { extractInteractionsFromPages, extractReferencesFromPages, extractDiseaseTypeFromPages } from '@/lib/extraction'
import { SupabaseExtraction } from '@/lib/supabase-utils'
import { Interaction } from '@/lib/prompts'
import { incrementUserExtraction } from '@/lib/usage-tracking'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Centralized function to update disease type and title (same as in background-processor)
async function updateExtractionTitleAndDisease(
  extractionId: string,
  interactions: any[],
  allPages: any[] = []
): Promise<{ diseaseType: string, title: string }> {
  let diseaseType = 'Processing'
  let title = diseaseType
  
  console.log('🔍 Updating title and disease type...')
  
  try {
    if (interactions.length > 0) {
      // Create sample pages from interactions for disease detection
      const samplePages = interactions.slice(0, 5).map((int: any, index: number) => ({
        page_content: int.reference_text || int.details || int.mechanism,
        metadata: { page: index + 1, file_name: int.filename || 'unknown' }
      }))
      
      const { diseaseType: detectedType } = await extractDiseaseTypeFromPages(samplePages)
      // Use the detected disease type as both diseaseType and title
      diseaseType = detectedType || 'General'
      title = diseaseType
      
    } else if (allPages.length > 0) {
      // Fallback: use actual pages if no interactions
      const { diseaseType: detectedType } = await extractDiseaseTypeFromPages(allPages.slice(0, 3))
      diseaseType = detectedType || 'General'
      title = diseaseType
    }
    
  } catch (error) {
    console.error('Disease type detection failed:', error)
    diseaseType = 'General'
    title = diseaseType
  }
  
  // Update the extraction record
  await supabase
    .from('extractions')
    .update({
      title: title,
      disease_type: diseaseType,
      updated_at: new Date().toISOString()
    })
    .eq('id', extractionId)
  
  console.log(`✅ Updated extraction ${extractionId}: title="${title}", diseaseType="${diseaseType}"`)
  
  return { diseaseType, title }
}

export async function POST(request: NextRequest) {
  let extraction: any = null
  
  try {
    const user = await requireAuth()

    const formData = await request.formData()

    const files = formData.getAll('files') as File[]
    const userEmail = formData.get('userEmail') as string

    // Validate input
    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' }, 
        { status: 400 }
      )
    }

    console.log(`Processing ${files.length} files for user: ${userEmail}`)

    // Check cache first
    const cacheKey = createFilesHash(files)
    const cachedResult = SupabaseExtraction.getCachedResult(cacheKey)
    
    if (cachedResult) {
      console.log('Returning cached result')
      return NextResponse.json({
        ...cachedResult,
        fromCache: true
      })
    }

    // Create extraction record with 'Processing' as initial state
    extraction = await SupabaseExtraction.createExtraction({
      user_id: user.id,
      title: 'Processing',
      status: 'processing',
      file_count: files.length,
      interaction_count: 0,
      interactions: null,
      source_references: null,
      errors: null,
      job_id: null,
      disease_type: 'Processing'
    })

    // Process all files together
    const allPages: any[] = []
    const fileErrors: string[] = []

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`)
        const pages = await extractPagesFromPDF(file)
        
        // Add filename to each page for tracking
        const pagesWithFilename = pages.map(page => ({
          ...page,
          metadata: {
            ...page.metadata,
            file_name: file.name
          }
        }))
        
        allPages.push(...pagesWithFilename)
        console.log(`Successfully processed ${file.name}: ${pages.length} pages`)
        
      } catch (error) {
        const errorMessage = `Failed to process ${file.name}: ${error instanceof Error ? error.message : error}`
        console.error(errorMessage)
        fileErrors.push(errorMessage)
      }
    }

    if (allPages.length === 0) {
      // Update to 'General' if no content could be extracted
      await supabase
        .from('extractions')
        .update({ 
          status: 'failed',
          title: 'General',
          disease_type: 'General',
          errors: fileErrors,
          updated_at: new Date().toISOString()
        })
        .eq('id', extraction.id)
      
      return NextResponse.json({
        error: 'No content could be extracted from any files',
        extraction_id: extraction.id,
        errors: fileErrors
      }, { status: 400 })
    }

    console.log(`Total pages extracted: ${allPages.length}`)
    
    // Extract interactions first (with timeout handling from updated extraction.ts)
    const { interactions, errors: interactionErrors } = await extractInteractionsFromPages(
      allPages,
      'General' // We'll detect disease type from results
    )

    const { references, errors: referenceErrors } = await extractReferencesFromPages(allPages)

    const allErrors = [...fileErrors, ...interactionErrors, ...referenceErrors]
    
    console.log(`Extracted ${interactions.length} interactions`)

    // Add filename to each interaction
    const interactionsWithFilename = interactions.map(interaction => ({
      ...interaction,
      filename: interaction.filename || allPages.find(page => 
        page.page_content.includes(interaction.reference_text?.substring(0, 50) || '')
      )?.metadata?.file_name || 'Unknown'
    }))

    // Always save results first, then update disease type
    await supabase
      .from('extractions')
      .update({
        status: 'completed',
        interactions: interactionsWithFilename,
        source_references: references,
        errors: allErrors,
        interaction_count: interactionsWithFilename.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', extraction.id)

    // Now update disease type and title using centralized function
    const { diseaseType, title } = await updateExtractionTitleAndDisease(
      extraction.id, 
      interactionsWithFilename, 
      allPages
    )

    const result = {
      extraction_id: extraction.id,
      interactions: interactionsWithFilename.map((interaction, index): Interaction => ({
        id: interaction.id || `interaction_${extraction.id}_${index}`,
        mechanism: interaction.mechanism,
        source: interaction.source,
        target: interaction.target,
        interaction_type: interaction.interaction_type,
        details: interaction.details,
        confidence: interaction.confidence || 'medium',
        reference_text: interaction.reference_text,
        page_number: interaction.page_number,
        filename: interaction.filename || ''
      })),
      references,
      errors: allErrors,
      summary: {
        totalFiles: files.length,
        totalInteractions: interactionsWithFilename.length,
        filesWithErrors: fileErrors.length
      }
    }

    // Cache the result
    SupabaseExtraction.setCachedResult(cacheKey, result, 24)

    console.log(`Extraction complete: ${interactionsWithFilename.length} interactions found, disease: ${diseaseType}`)

    // Track usage
    try {
      const { userId } = await auth()
      if (userId) {
        await incrementUserExtraction(userId)
      }
    } catch (error) {
      console.error('Failed to track usage:', error)
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Extraction API error:', error)
    
    if (extraction?.id) {
      try {
        // Even on error, set to 'General' instead of leaving as 'Processing'
        await supabase
          .from('extractions')
          .update({ 
            status: 'failed',
            title: 'General',
            disease_type: 'General',
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            updated_at: new Date().toISOString()
          })
          .eq('id', extraction.id)
      } catch (updateError) {
        console.error('Failed to update extraction status:', updateError)
      }
    }
    
    return handleAuthError(error)
  }
}