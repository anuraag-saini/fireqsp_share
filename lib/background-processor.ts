// lib/background-processor.ts
import { extractPagesFromPDF, createFilesHash } from './pdf-processing'
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
        errors: null
        // Remove job_id from here - we'll update it separately
      })
      
      // After creating extraction, link it to the job
      if (extraction?.id) {
        // Update the job with extraction_id
        await JobManager.updateJobProgress(jobId, {
          // We'll add the extraction_id link here if needed
        })
        
        // Update extraction with job_id using direct supabase call
        await supabase
          .from('extractions')
          .update({ 
            job_id: jobId,
            disease_type: 'General' // Default value, will be updated later
          })
          .eq('id', extraction.id)
      }
      
      // Process files one by one
      const allPages: any[] = []
      const fileErrors: string[] = []
      const failedFiles: string[] = []
      let filesProcessed = 0
      let filesSuccessful = 0
      
      for (const fileInfo of fileList) {
        const fileName = fileInfo.name
        
        try {
          console.log(`Processing file: ${fileName}`)
          
          // Update current file status
          await JobManager.updateJobProgress(jobId, {
            current_file: fileName,
            files_processed: filesProcessed
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
          
          // Process PDF (using your existing logic)
          const pages = await extractPagesFromPDF(file)
          allPages.push(...pages)
          
          console.log(`Successfully processed ${fileName}: ${pages.length} pages`)
          
          // Delete file after successful processing
          await FileStorage.deleteFile(filePath)
          
          filesSuccessful++
          
        } catch (error) {
          const errorMessage = `Failed to process ${fileName}: ${error instanceof Error ? error.message : error}`
          console.error(errorMessage)
          fileErrors.push(errorMessage)
          failedFiles.push(fileName)
          
          // Delete failed file too
          const filePath = `${userId}/${jobId}/${fileName}`
          await FileStorage.deleteFile(filePath)
        }
        
        filesProcessed++
        
        // Update progress
        await JobManager.updateJobProgress(jobId, {
          files_processed: filesProcessed,
          files_successful: filesSuccessful,
          files_failed: failedFiles.length,
          failed_files: failedFiles
        })
      }
      
      // Check if we have any content to process
      if (allPages.length === 0) {
        await JobManager.updateJobProgress(jobId, {
          status: 'failed',
          current_file: 'No content extracted'
        })
        
        await SupabaseExtraction.updateExtraction(extraction.id, {
          status: 'failed',
          errors: [...fileErrors, 'No content could be extracted from any files']
        })
        
        return { success: false, error: 'No content could be extracted from any files' }
      }
      
      console.log(`Total pages extracted: ${allPages.length}`)
      
      // Extract disease type (using your existing logic)
      await JobManager.updateJobProgress(jobId, {
        current_file: 'Analyzing disease type...'
      })
      
      const { diseaseType, errors: diseaseErrors } = await extractDiseaseTypeFromPages(allPages)
      console.log(`Detected disease type: ${diseaseType}`)
      
      // After disease type detection, update the extraction
      await supabase
        .from('extractions')
        .update({ disease_type: diseaseType })
        .eq('id', extraction.id)
      
      // Extract interactions (using your existing logic)
      await JobManager.updateJobProgress(jobId, {
        current_file: 'Extracting interactions...'
      })
      
      const { interactions, errors: interactionErrors } = await extractInteractionsFromPages(
        allPages,
        diseaseType
      )
      
      // Extract references (using your existing logic)
      await JobManager.updateJobProgress(jobId, {
        current_file: 'Processing references...'
      })
      
      const { references, errors: referenceErrors } = await extractReferencesFromPages(allPages)
      
      const allErrors = [...fileErrors, ...diseaseErrors, ...interactionErrors, ...referenceErrors]
      
      console.log(`Extracted ${interactions.length} interactions`)
      
      // Update interactions found count
      await JobManager.updateJobProgress(jobId, {
        interactions_found: interactions.length,
        current_file: 'Finalizing...'
      })
      
      // Create final title (using your existing logic)
      const baseTitle = diseaseType && diseaseType !== 'General' ? diseaseType : 'Untitled'
      const finalTitle = `${baseTitle} (${filesProcessed} file${filesProcessed > 1 ? 's' : ''}) - ${formatDateForTitle()}`
      
      // Save everything to database (using your existing logic)
      if (interactions.length === 0) {
        await SupabaseExtraction.saveExtractionResults(
          extraction.id,
          [],
          references,
          [...allErrors, 'No interactions found in the uploaded documents']
        )
      } else {
        await SupabaseExtraction.saveExtractionResults(
          extraction.id,
          interactions,
          references,
          allErrors
        )
      }
      
      // Update extraction with final details
      await SupabaseExtraction.updateExtraction(extraction.id, {
        title: finalTitle,
        status: 'completed',
        interaction_count: interactions.length
        // Remove disease_type from here - we'll update it separately if needed
      })
      
      // Complete the job
      await JobManager.updateJobProgress(jobId, {
        status: 'completed',
        interactions_found: interactions.length,
        current_file: undefined
      })
      
      // Cache results (using your existing logic)
      if (interactions.length > 0) {
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
            totalFiles: filesProcessed,
            totalInteractions: interactions.length,
            filesWithErrors: failedFiles.length
          }
        }
        
        // Cache the result (you might need to create a file hash for caching)
        // SupabaseExtraction.setCachedResult(cacheKey, result, 24)
      }
      
      // Track usage (using your existing logic)
      try {
        await incrementUserExtraction(userId)
      } catch (error) {
        console.error('Failed to track usage:', error)
        // Don't fail the job if usage tracking fails
      }
      
      console.log(`Background processing completed successfully: ${interactions.length} interactions found`)
      
      return { success: true }
      
    } catch (error) {
      console.error('Background processing error:', error)
      
      // Update job status to failed
      await JobManager.updateJobProgress(jobId, {
        status: 'failed',
        current_file: undefined
      })
      
      // Update extraction status if we have one
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