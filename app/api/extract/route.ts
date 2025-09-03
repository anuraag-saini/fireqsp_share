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

    // Create extraction record with all required fields
    extraction = await SupabaseExtraction.createExtraction({
      user_id: user.id,
      title: 'Processing...',
      status: 'processing',
      file_count: files.length,
      interaction_count: 0,
      interactions: null,
      source_references: null,
      errors: null,
      job_id: null,
      disease_type: 'General'
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
      await supabase
        .from('extractions')
        .update({ 
          status: 'failed',
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
    console.log('Extracting disease type from content...')
    const { diseaseType, errors: diseaseErrors } = await extractDiseaseTypeFromPages(allPages)
    console.log(`Detected disease type: ${diseaseType}`)

    const { interactions, errors: interactionErrors } = await extractInteractionsFromPages(
      allPages,
      diseaseType
    )

    const { references, errors: referenceErrors } = await extractReferencesFromPages(allPages)

    const allErrors = [...fileErrors, ...diseaseErrors, ...interactionErrors, ...referenceErrors]
    
    console.log(`Extracted ${interactions.length} interactions`)

    // Add filename to each interaction
    const interactionsWithFilename = interactions.map(interaction => ({
      ...interaction,
      filename: interaction.filename || allPages.find(page => 
        page.page_content.includes(interaction.reference_text?.substring(0, 50) || '')
      )?.metadata?.file_name || 'Unknown'
    }))

    if (interactionsWithFilename.length === 0) {
      await supabase
        .from('extractions')
        .update({
          status: 'completed',
          interactions: [],
          source_references: references,
          errors: [...allErrors, 'No interactions found in the uploaded documents'],
          interaction_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', extraction.id)

      return NextResponse.json({
        extraction_id: extraction.id,
        interactions: [],
        references,
        errors: [...allErrors, 'No interactions found in the uploaded documents'],
        summary: {
          totalFiles: files.length,
          totalInteractions: 0,
          filesWithErrors: fileErrors.length
        },
        message: 'No interactions found'
      })
    }

    // Create proper title
    const baseTitle = diseaseType && diseaseType !== 'General' ? diseaseType : 'Untitled'

    // Save all results to database using direct supabase call
    await supabase
      .from('extractions')
      .update({
        status: 'completed',
        title: baseTitle,
        disease_type: diseaseType,
        interactions: interactionsWithFilename,
        source_references: references,
        errors: allErrors,
        interaction_count: interactionsWithFilename.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', extraction.id)

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

    console.log(`Extraction complete: ${interactionsWithFilename.length} interactions found`)

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
        await supabase
          .from('extractions')
          .update({ 
            status: 'failed',
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