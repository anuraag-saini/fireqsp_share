import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { extractPagesFromPDF, createFilesHash } from '@/lib/pdf-processing'
import { extractInteractionsFromPages, extractReferencesFromPages, extractDiseaseTypeFromPages } from '@/lib/extraction'
import { SupabaseExtraction } from '@/lib/supabase-utils'
import { Interaction } from '@/lib/prompts'

export async function POST(request: NextRequest) {
  let extraction: any = null
  
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const userEmail = formData.get('userEmail') as string
    // const diseaseType = formData.get('diseaseType') as string || 'Others'

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' }, 
        { status: 400 }
      )
    }

    console.log(`Processing ${files.length} files for user: ${userEmail}`)

    // Check simple cache first
    const cacheKey = createFilesHash(files)
    const cachedResult = SupabaseExtraction.getCachedResult(cacheKey)
    
    if (cachedResult) {
      console.log('Returning cached result')
      return NextResponse.json({
        ...cachedResult,
        fromCache: true
      })
    }

    // Create extraction record
    extraction = await SupabaseExtraction.createExtraction({
      user_id: user.id,
      title: 'Processing...',
      //title: `Extraction - ${new Date().toLocaleDateString()}`,
      status: 'processing',
      file_count: files.length,
      interaction_count: 0,
      interactions: null,
      source_references: null,
      errors: null
    })

    // Process all files together (simplified!)
    const allPages: any[] = []
    const fileErrors: string[] = []

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`)
        const pages = await extractPagesFromPDF(file)
        // Remove the filterReferencePages step - let AI handle it
        allPages.push(...pages)
        console.log(`Successfully processed ${file.name}: ${pages.length} pages`)
        
      } catch (error) {
        const errorMessage = `Failed to process ${file.name}: ${error instanceof Error ? error.message : error}`
        console.error(errorMessage)
        fileErrors.push(errorMessage)
        // Continue processing other files instead of stopping
      }
    }

    if (allPages.length === 0) {
      await SupabaseExtraction.updateExtraction(extraction.id, { 
        status: 'failed',
        errors: fileErrors
      })
      
      return NextResponse.json({
        error: 'No content could be extracted from any files',
        extraction_id: extraction.id,
        errors: fileErrors
      }, { status: 400 })
    }

    console.log(`Total pages extracted: ${allPages.length}`)
    // Extract disease type from content (NEW!)
    console.log('Extracting disease type from content...')
    const { diseaseType, errors: diseaseErrors } = await extractDiseaseTypeFromPages(allPages)
    console.log(`Detected disease type: ${diseaseType}`)

    // Extract interactions and references (simplified - no progress callbacks)
    const { interactions, errors: interactionErrors } = await extractInteractionsFromPages(
      allPages,
      diseaseType
    )

    const { references, errors: referenceErrors } = await extractReferencesFromPages(allPages)

    const allErrors = [...fileErrors, ...diseaseErrors, ...interactionErrors, ...referenceErrors]
    
    console.log(`Extracted ${interactions.length} interactions`)

    // Check if no interactions found
    if (interactions.length === 0) {
      await SupabaseExtraction.saveExtractionResults(
        extraction.id,
        [],
        references,
        [...allErrors, 'No interactions found in the uploaded documents']
      )

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

    // Save everything to database in one operation
    // Create simple title: Disease (X files) - Date
    const baseTitle = diseaseType && diseaseType !== 'General' ? diseaseType : 'Untitled'
    const finalTitle = `${baseTitle} (${files.length} file${files.length > 1 ? 's' : ''}) - ${formatDateForTitle()}`

    // Save everything to database 
    await SupabaseExtraction.saveExtractionResults(
      extraction.id,
      interactions,
      references,
      allErrors
    )

    // Update the title
    await SupabaseExtraction.updateExtraction(extraction.id, { 
      title: finalTitle
    })

    // Build clean result (no transformations needed!)
    const result = {
      extraction_id: extraction.id,
      interactions: interactions.map((interaction, index): Interaction => ({
        id: interaction.id || `interaction_${extraction.id}_${index}`,
        mechanism: interaction.mechanism,
        source: interaction.source,  // Keep nested object as-is!
        target: interaction.target,   // Keep nested object as-is!
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
        totalInteractions: interactions.length,
        filesWithErrors: fileErrors.length
      }
    }

    // Cache the result
    SupabaseExtraction.setCachedResult(cacheKey, result, 24)

    console.log(`Extraction complete: ${interactions.length} interactions found`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Extraction API error:', error)
    
    // Update extraction status to failed if we have one
    if (extraction?.id) {
      try {
        await SupabaseExtraction.updateExtraction(extraction.id, { 
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        })
      } catch (updateError) {
        console.error('Failed to update extraction status:', updateError)
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
  function formatDateForTitle(): string {
    const now = new Date()
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (now.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (now.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }
}