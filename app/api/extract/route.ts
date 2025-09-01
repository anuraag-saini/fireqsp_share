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

// Background processing handler with enhanced debugging
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
    
    // Step 2: Upload files
    console.log('📤 Step 2: Uploading files to storage...')
    const uploadPromises = files.map((file, index) => {
      console.log(`  - Uploading file ${index + 1}/${files.length}: ${file.name} (${file.size} bytes)`)
      return FileStorage.uploadFile(user.id, file, jobId)
    })
    
    const uploadResults = await Promise.all(uploadPromises)
    console.log('✅ All files uploaded successfully:', uploadResults)
    
    // Step 3: Trigger background processing
    console.log('🎯 Step 3: Triggering background processing...')
    
    const backgroundUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/process-background`
    console.log('Background URL:', backgroundUrl)
    
    const requestBody = {
      jobId,
      userId: user.id,
      userEmail,
      fileCount: files.length
    }
    console.log('Request body:', requestBody)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log('⚠️ Request timeout triggered (10s)')
      controller.abort()
    }, 10000)
    
    try {
      console.log('📡 Making fetch request to background processor...')
      
      const backgroundResponse = await fetch(backgroundUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      console.log('📡 Fetch response received:', {
        status: backgroundResponse.status,
        statusText: backgroundResponse.statusText,
        ok: backgroundResponse.ok
      })
      
      clearTimeout(timeoutId)

      if (!backgroundResponse.ok) {
        const errorText = await backgroundResponse.text()
        console.error('❌ Background response not OK:', {
          status: backgroundResponse.status,
          statusText: backgroundResponse.statusText,
          body: errorText
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || 'Unknown error' }
        }
        
        throw new Error(`Background processing failed to start: ${errorData.error || 'Unknown error'}`)
      }

      const responseData = await backgroundResponse.json()
      console.log('✅ Background processing started successfully:', responseData)

      return NextResponse.json({
        success: true,
        jobId,
        message: `Large upload detected (${files.length} files). Processing in background...`,
        useBackgroundJob: true,
        fileCount: files.length,
        debug: {
          backgroundUrl,
          uploadResults,
          responseData
        }
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('❌ Fetch error details:', {
        name: fetchError instanceof Error ? fetchError.name : 'Unknown',
        message: fetchError instanceof Error ? fetchError.message : fetchError,
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      })
      throw fetchError
    }

  } catch (error) {
    console.error('❌ BACKGROUND PROCESSING FAILED:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message === 'Concurrent job limit reached') {
        console.log('🚫 Concurrent job limit reached')
        return NextResponse.json(
          { error: 'Processing limit reached. Please wait for current extractions to complete or upgrade your plan.' },
          { status: 429 }
        )
      }
      
      if (error.name === 'AbortError') {
        console.log('⏱️ Request aborted due to timeout')
        return NextResponse.json(
          { error: 'Background processing timed out. Please try with fewer or smaller files.' },
          { status: 408 }
        )
      }

      // Network errors
      if (error.message.includes('fetch')) {
        console.log('🌐 Network/fetch error detected')
        return NextResponse.json(
          { 
            error: 'Network error: Could not reach background processor. Please try again.',
            details: error.message,
            debugInfo: {
              backgroundUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/process-background`,
              environment: process.env.NODE_ENV,
              timestamp: new Date().toISOString()
            }
          },
          { status: 500 }
        )
      }

      // Database errors
      if (error.message.includes('relation') || error.message.includes('table')) {
        console.log('🗄️ Database schema error detected')
        return NextResponse.json(
          { 
            error: 'Database configuration error. Please contact support.',
            details: 'Missing required database tables for background processing',
            debugInfo: {
              error: error.message,
              suggestion: 'Check if extraction_jobs table exists'
            }
          },
          { status: 500 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to start background processing. Please try with fewer or smaller files.',
        details: error instanceof Error ? error.message : 'Unknown error',
        debugInfo: {
          timestamp: new Date().toISOString(),
          userAgent: 'production',
          environment: process.env.NODE_ENV
        }
      },
      { status: 500 }
    )
  }
}