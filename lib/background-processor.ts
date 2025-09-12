// lib/background-processor.ts
import { extractPagesFromPDF } from './pdf-processing'
import { extractInteractionsFromPages, extractReferencesFromPages, extractDiseaseTypeFromPages } from './extraction'
import { SupabaseExtraction } from './supabase-utils'
import { Interaction } from './prompts'
import { incrementUserExtraction } from './usage-tracking'
import { JobManager } from './job-manager'
import { FileStorage } from './file-storage'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Add this function at the top of the file, after imports
async function checkAndFailStuckJobs() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    
    // Find stuck jobs
    const { data: stuckJobs } = await supabase
      .from('extraction_jobs')
      .select('id')
      .eq('status', 'processing')
      .lt('created_at', twoHoursAgo)
    
    if (stuckJobs && stuckJobs.length > 0) {
      console.log(`⏰ Found ${stuckJobs.length} stuck jobs, marking as failed`)
      
      // Mark jobs as failed
      for (const job of stuckJobs) {
        await supabase
          .from('extraction_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)
        
        // Also mark extractions as failed
        await supabase
          .from('extractions')
          .update({
            status: 'failed',
            errors: ['Job timeout after 2 hours - system hang detected'],
            updated_at: new Date().toISOString()
          })
          .eq('job_id', job.id)
      }
    }
  } catch (error) {
    console.error('Error checking stuck jobs:', error)
  }
}

// ONLY change this function in your current background-processor.ts file:
async function updateExtractionTitleAndDisease(
  extractionId: string,
  interactions: any[],
  allPages: any[] = []
): Promise<{ diseaseType: string, title: string }> {
  let diseaseType = 'General'
  let title = diseaseType
  
  console.log('🔍 Updating title and disease type...')
  console.log(`Interactions available: ${interactions.length}, Pages available: ${allPages.length}`)
  
  try {
    if (interactions.length > 0) {
      // Method 1: Combine all reference texts to get better context
      const combinedReferences = interactions
        .map(int => int.reference_text || '')
        .filter(text => text.length > 20) // Only substantial reference texts
        .slice(0, 3) // Take first 3 substantial references
        .join('\n\n')
      
      console.log('📋 Combined reference text for disease detection:')
      console.log(combinedReferences.substring(0, 500) + (combinedReferences.length > 500 ? '...' : ''))
      console.log(`📏 Total length: ${combinedReferences.length} characters`)
      
      if (combinedReferences.length > 50) {
        // Create a single "page" from combined reference texts
        const referencePage = [{
          page_content: combinedReferences,
          metadata: { page: 1, file_name: interactions[0].filename || 'unknown' }
        }]
        
        console.log('🤖 Calling OpenAI for disease detection...')
        const { diseaseType: detectedType } = await extractDiseaseTypeFromPages(referencePage)
        console.log(`🎯 OpenAI returned disease type: "${detectedType}"`)
        
        diseaseType = detectedType || 'General'
        title = diseaseType
        
        console.log(`✨ Final disease detected from interactions: "${diseaseType}"`)
      } else {
        console.log('⚠️ Combined reference text too short, skipping disease detection')
      }
      
    } else if (allPages.length > 0) {
      // Fallback: use actual first page if no interactions
      console.log('📋 Using first page for disease detection as fallback')
      const firstPageContent = allPages[0]?.page_content?.substring(0, 200) + '...'
      console.log('First page content sample:', firstPageContent)
      
      const { diseaseType: detectedType } = await extractDiseaseTypeFromPages(allPages.slice(0, 1))
      diseaseType = detectedType || 'General'
      title = diseaseType
      
      console.log(`✨ Disease detected from pages: "${diseaseType}"`)
    }
    
  } catch (error) {
    console.error('❌ Disease type detection failed:', error)
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

export class BackgroundProcessor {
  static async processExtractionJob(
    jobId: string,
    userId: string,
    userEmail: string,
    fileCount: number
  ): Promise<{ success: boolean; error?: string }> {
    console.log("🚀 BACKGROUND PROCESSOR STARTED", {
      jobId,
      userId,
      userEmail,
      fileCount,
      timestamp: new Date().toISOString(),
    })    
    
    let extraction: any = null
    
    try {
      await checkAndFailStuckJobs()
      console.log(`Starting background processing for job: ${jobId}`)
      
      // Update job status to processing
      await JobManager.updateJobProgress(jobId, {
        status: 'processing',
        current_file: 'Initializing...'
      })
      
      // Get file list from storage
      console.log("🔹 Listing files from storage")
      const { data: fileList } = await supabase.storage
        .from('extraction-files')
        .list(`${userId}/${jobId}`)
      
      if (!fileList || fileList.length === 0) {
        throw new Error('No files found for processing')
      }
      
      console.log(`Found ${fileList.length} files to process`)
      
      // Create extraction record (interactions go to separate table)
      extraction = await SupabaseExtraction.createExtraction({
        user_id: userId,
        title: 'Processing...',
        status: 'processing',
        file_count: fileList.length,
        interaction_count: 0,
        source_references: null,
        errors: null,
        job_id: jobId,
        disease_type: 'General'
      })
      
      // Link extraction to job using direct supabase call
      if (extraction?.id) {
        console.log(`✅ Created extraction record: ${extraction.id}`)
        // Update job with extraction_id
        await JobManager.updateJobProgress(jobId, {
          extraction_id: extraction.id
        })
        console.log(`🔗 Linked job ${jobId} to extraction ${extraction.id}`)
      }
      
      // Process files individually with batch logic to avoid timeouts
      console.log('🔥 Processing files individually with timeout protection')
      
      const BATCH_SIZE = 1 // Process 1 file at a time for maximum reliability
      const allInteractions: any[] = []
      const allReferences: Record<string, string> = {}
      const allErrors: string[] = []
      const allPages: any[] = [] // Keep track of all pages for disease detection
      let filesSuccessful = 0
      let filesProcessed = 0
      let filesFailed = 0

      // Process files in batches
      for (let startIndex = 0; startIndex < fileList.length; startIndex += BATCH_SIZE) {
        const endIndex = Math.min(startIndex + BATCH_SIZE, fileList.length)
        console.log(`📦 Processing batch ${startIndex + 1}-${endIndex} of ${fileList.length} files`)
        
        const batchPages: any[] = []
        
        // Process files in current batch
        for (let fileIndex = startIndex; fileIndex < endIndex; fileIndex++) {
          const fileInfo = fileList[fileIndex]
          const fileName = fileInfo.name
          
          try {
            console.log(`📄 Processing file: ${fileName} (${fileIndex + 1}/${fileList.length})`)
            
            // Update current file status
            await JobManager.updateJobProgress(jobId, {
              current_file: fileName,
              files_processed: fileIndex
            })
            
            // Download file from storage
            const filePath = `${userId}/${jobId}/${fileName}`
            const fileBuffer = await FileStorage.downloadFile(filePath)
            
            if (!fileBuffer) {
              throw new Error('Failed to download file')
            }
            
            // Convert ArrayBuffer to File-like object for processing
            const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' })
            const file = new File([fileBlob], fileName, { type: 'application/pdf' })
            
            // Process PDF using existing logic
            const pages = await extractPagesFromPDF(file)
            
            // Add filename to each page for tracking
            const pagesWithFilename = pages.map(page => ({
              ...page,
              metadata: {
                ...page.metadata,
                file_name: fileName
              }
            }))
            
            batchPages.push(...pagesWithFilename)
            allPages.push(...pagesWithFilename) // Keep for disease detection
            console.log(`✅ Successfully processed ${fileName}: ${pages.length} pages`)
            
            // Delete file after successful processing
            await FileStorage.deleteFile(filePath)
            filesSuccessful++
            
          } catch (error) {
            const errorMessage = `Failed to process ${fileName}: ${error instanceof Error ? error.message : error}`
            console.error(errorMessage)
            allErrors.push(errorMessage)
            filesFailed++
            
            // Delete failed file too
            const filePath = `${userId}/${jobId}/${fileName}`
            await FileStorage.deleteFile(filePath)
          }
          
          filesProcessed++
        }
        
        // Process AI extraction for this batch
        if (batchPages.length > 0) {
          console.log(`🧠 Processing ${batchPages.length} pages with AI for batch ${startIndex + 1}-${endIndex}`)
          
          try {
            // Extract interactions using existing logic with timeout handling
            const { interactions, errors: interactionErrors, stats: interactionStats } = await extractInteractionsFromPages(
              batchPages,
              'General' // We'll detect disease type later from all interactions
            )

            console.log(`📊 Batch stats: ${interactionStats.successfulBatches}/${interactionStats.totalBatches} successful, ${interactionStats.timeoutBatches} timeouts`)

            // Extract references using existing logic with timeout handling
            const { references, errors: referenceErrors } = await extractReferencesFromPages(batchPages)
            
            // Accumulate results
            allInteractions.push(...interactions)
            Object.assign(allReferences, references)
            allErrors.push(...interactionErrors, ...referenceErrors)
            
            console.log(`✅ Found ${interactions.length} interactions in batch ${startIndex + 1}-${endIndex}`)
            
            // Update progress after each batch
            await JobManager.updateJobProgress(jobId, {
              files_successful: filesSuccessful,
              files_processed: filesProcessed,
              interactions_found: allInteractions.length
            })
            
            // Update extraction with accumulated results after each batch using NEW method
            await supabase
              .from('extractions')
              .update({
                source_references: allReferences,
                errors: allErrors,
                interaction_count: allInteractions.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', extraction.id)
            
            // Save interactions to separate table for better performance
            if (interactions.length > 0) {
              await SupabaseExtraction.saveInteractions(extraction.id, interactions)
              console.log(`✅ Saved ${interactions.length} interactions to separate table`)
            }
              
            // Update title and disease type after each successful batch
            await updateExtractionTitleAndDisease(extraction.id, allInteractions, allPages)
              
          } catch (aiError) {
            console.error(`AI processing failed for batch ${startIndex + 1}-${endIndex}:`, aiError)
            allErrors.push(`AI processing failed for batch ${startIndex + 1}-${endIndex}: ${aiError}`)
          }
        }
        
        // Small delay between batches to avoid overwhelming the system
        if (endIndex < fileList.length) {
          console.log(`⏳ Waiting 1 second before next batch...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`🎯 All ${fileList.length} files processed, finalizing`)
      
      // Determine final status based on success/failure ratio
      let finalStatus: 'completed' | 'partial' | 'failed' = 'failed'
      
      if (filesSuccessful === fileList.length) {
        finalStatus = 'completed'
        console.log('✅ All files processed successfully - status: completed')
      } else if (filesSuccessful > 0) {
        finalStatus = 'partial'
        console.log(`⚠️ ${filesSuccessful}/${fileList.length} files processed successfully - status: partial`)
      } else {
        finalStatus = 'failed'
        console.log('❌ No files processed successfully - status: failed')
      }
      
      // Final extraction update - ensure title and disease type are set
      const { diseaseType, title } = await updateExtractionTitleAndDisease(
        extraction.id, 
        allInteractions, 
        allPages
      )
      
      // Update final status
      await supabase
        .from('extractions')
        .update({
          status: finalStatus,
          interaction_count: allInteractions.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', extraction.id)
      
      // Complete the job
      await JobManager.updateJobProgress(jobId, {
        status: finalStatus,
        interactions_found: allInteractions.length,
        files_successful: filesSuccessful,
        files_failed: filesFailed,
        current_file: undefined
      })
      
      // Track usage only if we got some results
      if (finalStatus !== 'failed') {
        try {
          await incrementUserExtraction(userId)
        } catch (error) {
          console.error('Failed to track usage:', error)
        }
      }
      
      console.log(`✅ Background processing completed: status=${finalStatus}, interactions=${allInteractions.length}, title="${title}"`)
      
      return { success: true }
      
    } catch (error) {
      console.error('Background processing error:', error)
      
      // Update job status to failed
      await JobManager.updateJobProgress(jobId, {
        status: 'failed',
        current_file: undefined
      })
      
      // Update extraction status if we have one using direct supabase call
      if (extraction?.id) {
        try {
          // Even if processing failed, try to update title if we have any data
          await updateExtractionTitleAndDisease(extraction.id, [], [])
          
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
      
      // Clean up any remaining files
      try {
        await FileStorage.deleteJobFiles(userId, jobId)
      } catch (cleanupError) {
        console.error('Failed to cleanup files:', cleanupError)
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Background processing failed'
      }
    }
  }
}