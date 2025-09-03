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
      
      // Create extraction record
      extraction = await SupabaseExtraction.createExtraction({
        user_id: userId,
        title: 'Processing...',
        status: 'processing',
        file_count: fileList.length,
        interaction_count: 0,
        interactions: null,
        source_references: null,
        errors: null,
        job_id: jobId,
        disease_type: 'General'
      })
      
      // Link extraction to job using direct supabase call
      if (extraction?.id) {
        console.log(`✅ Created extraction record: ${extraction.id}`)
      }
      
      // Process files individually with batch logic to avoid timeouts
      console.log('🔥 Processing files individually with timeout protection')
      
      const BATCH_SIZE = 1 // Process 1 file at a time for maximum reliability
      const allInteractions: any[] = []
      const allReferences: Record<string, string> = {}
      const allErrors: string[] = []
      let filesSuccessful = 0
      let filesProcessed = 0

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
            console.log(`✅ Successfully processed ${fileName}: ${pages.length} pages`)
            
            // Delete file after successful processing
            await FileStorage.deleteFile(filePath)
            filesSuccessful++
            
          } catch (error) {
            const errorMessage = `Failed to process ${fileName}: ${error instanceof Error ? error.message : error}`
            console.error(errorMessage)
            allErrors.push(errorMessage)
            
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
            // Extract interactions using existing logic
            const { interactions, errors: interactionErrors } = await extractInteractionsFromPages(
              batchPages,
              'General'
            )
            
            // Extract references using existing logic
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
            
            // Update extraction with accumulated results after each batch using direct supabase call
            await supabase
              .from('extractions')
              .update({
                interactions: allInteractions,
                source_references: allReferences,
                errors: allErrors,
                interaction_count: allInteractions.length,
                updated_at: new Date().toISOString()
              })
              .eq('id', extraction.id)
              
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
      
      // Final disease type detection and cleanup
      let diseaseType = 'General'
      let title = 'Extraction Complete'
      
      if (allInteractions.length > 0) {
        try {
          // Create pages from interactions for disease type detection
          const samplePages = allInteractions.slice(0, 5).map((int: any, index: number) => ({
            page_content: int.reference_text || int.details || int.mechanism,
            metadata: { page: index + 1, file_name: int.filename }
          }))
          
          const { diseaseType: detectedType } = await extractDiseaseTypeFromPages(samplePages)
          diseaseType = detectedType || 'General'
          title = diseaseType !== 'General' ? diseaseType : 'Extraction Complete'
        } catch (diseaseError) {
          console.error('Disease type detection failed:', diseaseError)
        }
      }
      
      // Final extraction update using direct supabase call
      await supabase
        .from('extractions')
        .update({
          title: title,
          disease_type: diseaseType,
          status: 'completed',
          interaction_count: allInteractions.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', extraction.id)
      
      // Complete the job
      await JobManager.updateJobProgress(jobId, {
        status: 'completed',
        interactions_found: allInteractions.length,
        current_file: undefined
      })
      
      // Track usage
      try {
        await incrementUserExtraction(userId)
      } catch (error) {
        console.error('Failed to track usage:', error)
      }
      
      console.log(`✅ Background processing completed successfully: ${allInteractions.length} interactions found`)
      
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