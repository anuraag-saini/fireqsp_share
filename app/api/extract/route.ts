import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { requireAuth, handleAuthError } from '@/lib/auth'
import { extractPagesFromPDF, createFilesHash } from '@/lib/pdf-processing'
import { extractInteractionsFromPages, extractReferencesFromPages, extractDiseaseTypeFromPages } from '@/lib/extraction'
import { SupabaseExtraction } from '@/lib/supabase-utils'
import { Interaction } from '@/lib/prompts'
import { incrementUserExtraction } from '@/lib/usage-tracking'
import { JobManager } from '@/lib/job-manager'
import { FileStorage } from '@/lib/file-storage'
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

    // NEW: Check if files are pre-uploaded to storage
    const usePreUploadedFiles = formData.get('usePreUploadedFiles') === 'true'
    const preUploadedJobId = formData.get('jobId') as string
    const fileCount = parseInt(formData.get('fileCount') as string || '0')

    // Handle pre-uploaded files case
    if (usePreUploadedFiles && preUploadedJobId && fileCount > 0) {
      console.log(`Processing ${fileCount} pre-uploaded files for job: ${preUploadedJobId}`)
      
      // Create job record and start background processing
      const actualJobId = await JobManager.createJob(user.id, fileCount)
      
      // Copy files from temp upload location to job location
      const { data: uploadedFiles } = await supabase.storage
        .from('extraction-files')
        .list(`${user.id}/${preUploadedJobId}`)
        
      if (uploadedFiles && uploadedFiles.length > 0) {
        // Files are already uploaded, start background processing
        BackgroundProcessor.processExtractionJob(
          actualJobId,
          user.id,
          userEmail,
          fileCount
        ).catch(error => {
          console.error('Background processing failed:', error)
        })

        return NextResponse.json({
          success: true,
          jobId: actualJobId,
          message: `Processing ${fileCount} files in background...`,
          useBackgroundJob: true,
          fileCount: fileCount
        })
      } else {
        return NextResponse.json(
          { error: 'Pre-uploaded files not found' },
          { status: 400 }
        )
      }
    }

    // Continue with regular processing (existing code)
    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' }, 
        { status: 400 }
      )
    }

    // Your existing code continues from here...

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' }, 
        { status: 400 }
      )
    }

    console.log(`Processing ${files.length} files for user: ${userEmail}`)

    // Check if we should use background processing
    const shouldUseBackgroundProcessing = files.length > 3 || 
      files.some((file: File) => file.size > 5 * 1024 * 1024) // > 5MB
    
    if (shouldUseBackgroundProcessing) {
      console.log('Large upload detected, using background processing')
      return await handleBackgroundProcessing(user, files, userEmail)
    }

    // Continue with synchronous processing for small uploads
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
      status: 'processing',
      file_count: files.length,
      interaction_count: 0,
      interactions: null,
      source_references: null,
      errors: null
    })

    // Process all files together
    const allPages: any[] = []
    const fileErrors: string[] = []

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`)
        const pages = await extractPagesFromPDF(file)
        allPages.push(...pages)
        console.log(`Successfully processed ${file.name}: ${pages.length} pages`)
        
      } catch (error) {
        const errorMessage = `Failed to process ${file.name}: ${error instanceof Error ? error.message : error}`
        console.error(errorMessage)
        fileErrors.push(errorMessage)
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

    // Create proper title with date
    const baseTitle = diseaseType && diseaseType !== 'General' ? diseaseType : 'Untitled'
    //const finalTitle = `${baseTitle} (${files.length} file${files.length > 1 ? 's' : ''}) - ${formatDateForTitle()}`

    await SupabaseExtraction.saveExtractionResults(
      extraction.id,
      interactions,
      references,
      allErrors
    )

    // Update title
    await SupabaseExtraction.updateExtraction(extraction.id, { 
      title: baseTitle
    })

    // Update disease_type in database
    const { error: diseaseUpdateError } = await supabase
      .from('extractions')
      .update({ disease_type: diseaseType })
      .eq('id', extraction.id)
    
    if (diseaseUpdateError) {
      console.error('Failed to update disease_type:', diseaseUpdateError)
    }

    const result = {
      extraction_id: extraction.id,
      interactions: interactions.map((interaction, index): Interaction => ({
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
        totalInteractions: interactions.length,
        filesWithErrors: fileErrors.length
      }
    }

    // Cache the result
    SupabaseExtraction.setCachedResult(cacheKey, result, 24)

    console.log(`Extraction complete: ${interactions.length} interactions found`)

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
        await SupabaseExtraction.updateExtraction(extraction.id, { 
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        })
      } catch (updateError) {
        console.error('Failed to update extraction status:', updateError)
      }
    }
    
    return handleAuthError(error)
  }
}

async function handleBackgroundProcessing(user: any, files: File[], userEmail: string) {
  console.log('🚀 BACKGROUND PROCESSING START', {
    userId: user.id,
    fileCount: files.length,
    userEmail,
    timestamp: new Date().toISOString()
  })

  try {
    // Step 1: Create job
    console.log('📝 Step 1: Creating job...')
    const jobId = await JobManager.createJob(user.id, files.length)
    console.log('✅ Job created successfully:', jobId)
    
    // Step 2: Check if files are already uploaded (client-side upload)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const isLargePayload = totalSize > 4 * 1024 * 1024 // 4MB
    
    if (isLargePayload) {
      // Files should already be uploaded by client - just start processing
      console.log('📦 Large payload detected - assuming files pre-uploaded to storage')
      
      // Verify files exist in storage (optional check)
      const { data: existingFiles } = await supabase.storage
        .from('extraction-files')
        .list(`${user.id}/${jobId}`)
      
      if (!existingFiles || existingFiles.length === 0) {
        // Files not found - they need to be uploaded
        console.log('📤 Files not found in storage, uploading now...')
        const uploadPromises = files.map(file => 
          FileStorage.uploadFile(user.id, file, jobId)
        )
        await Promise.all(uploadPromises)
      } else {
        console.log(`📦 Found ${existingFiles.length} pre-uploaded files`)
      }
      
    } else {
      // Small payload - upload normally
      console.log('📤 Step 2: Uploading files to storage...')
      const uploadPromises = files.map(file => 
        FileStorage.uploadFile(user.id, file, jobId)
      )
      await Promise.all(uploadPromises)
    }
    
    // Step 3: Trigger background processing (same as before)
    console.log('🎯 Step 3: Triggering background processing...')
    
    const backgroundUrl = `${process.env.NEXTAUTH_URL}/api/process-background`
    const requestBody = { jobId, userId: user.id, userEmail, fileCount: files.length }
    
    const response = await fetch(backgroundUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Background processing failed: ${response.statusText}`)
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: `Processing ${files.length} files in background...`,
      useBackgroundJob: true,
      fileCount: files.length
    })

  } catch (error) {
    console.error('❌ BACKGROUND PROCESSING FAILED:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start background processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
