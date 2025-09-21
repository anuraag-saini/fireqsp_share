// lib/background-processor.ts - Simplified with minimal logging
import { extractPagesFromPDF } from './pdf-processing'
import { extractInteractionsFromPages, extractReferencesFromPages, extractDiseaseTypeFromPages } from './extraction'
import { SupabaseExtraction } from './supabase-utils'
import { incrementUserExtraction } from './usage-tracking'
import { JobManager } from './job-manager'
import { FileStorage } from './file-storage'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

class JobCancelledException extends Error {
  constructor(jobId: string) {
    super(`Job ${jobId} was cancelled`)
    this.name = 'JobCancelledException'
  }
}

async function checkJobStatus(jobId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('extraction_jobs')
      .select('status')
      .eq('id', jobId)
      .single()
    
    return ['processing', 'queued'].includes(data?.status)
  } catch (error) {
    return false
  }
}

async function checkAndFailStuckJobs() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    
    const { data: stuckJobs } = await supabase
      .from('extraction_jobs')
      .select('id')
      .eq('status', 'processing')
      .lt('created_at', twoHoursAgo)

    if (stuckJobs && stuckJobs.length > 0) {
      for (const job of stuckJobs) {
        await supabase
          .from('extraction_jobs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', job.id)
        
        await supabase
          .from('extractions')
          .update({ 
            status: 'failed', 
            errors: ['Job timeout after 2 hours'],
            updated_at: new Date().toISOString()
          })
          .eq('job_id', job.id)
      }
    }
  } catch (error) {
    console.error('Error checking stuck jobs:', error)
  }
}

async function detectDiseaseTypeEarly(allPages: any[], jobId: string): Promise<string> {
  if (allPages.length === 0) return 'General'
  
  if (!await checkJobStatus(jobId)) {
    throw new JobCancelledException(jobId)
  }
  
  try {
    const firstFilePages = allPages
      .filter(page => page.metadata?.file_name === allPages[0]?.metadata?.file_name)
      .slice(0, 3)
    
    if (firstFilePages.length === 0) return 'General'
    
    const { diseaseType } = await extractDiseaseTypeFromPages(firstFilePages)
    return diseaseType || 'General'
    
  } catch (error) {
    if (error instanceof JobCancelledException) throw error
    return 'General'
  }
}

async function updateExtractionTitleAndDisease(
  extractionId: string,
  interactions: any[],
  allPages: any[] = [],
  preDetectedDisease?: string,
  jobId?: string
): Promise<{ diseaseType: string, title: string }> {
  let diseaseType = preDetectedDisease || 'General'
  let title = diseaseType
  
  if (jobId && !await checkJobStatus(jobId)) {
    throw new JobCancelledException(jobId)
  }
  
  if (!preDetectedDisease && allPages.length > 0) {
    try {
      const firstFilePages = allPages
        .filter(page => page.metadata?.file_name === allPages[0]?.metadata?.file_name)
        .slice(0, 2)
      
      if (firstFilePages.length > 0) {
        const result = await extractDiseaseTypeFromPages(firstFilePages)
        diseaseType = result.diseaseType || 'General'
        title = diseaseType
      }
    } catch (error) {
      if (error instanceof JobCancelledException) throw error
      diseaseType = 'General'
      title = diseaseType
    }
  }
  
  await supabase
    .from('extractions')
    .update({
      title: title,
      disease_type: diseaseType,
      updated_at: new Date().toISOString()
    })
    .eq('id', extractionId)
  
  return { diseaseType, title }
}

export class BackgroundProcessor {
  static async processExtractionJob(
    jobId: string,
    userId: string,
    userEmail: string,
    fileCount: number
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`🚀 Processing job ${jobId}`)
    
    let extraction: any = null
    let detectedDiseaseType: string = 'General'
    
    try {
      await checkAndFailStuckJobs()
      
      if (!await checkJobStatus(jobId)) {
        return { success: false, error: 'Job was cancelled' }
      }
      
      await JobManager.updateJobProgress(jobId, {
        status: 'processing',
        current_file: 'Initializing...'
      })
      
      const { data: fileList } = await supabase.storage
        .from('extraction-files')
        .list(`${userId}/${jobId}`)
      
      if (!fileList?.length) {
        throw new Error('No files found for processing')
      }
      
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
      
      if (extraction?.id) {
        await JobManager.updateJobProgress(jobId, {
          extraction_id: extraction.id
        })
      }
      
      const allInteractions: any[] = []
      const allReferences: Record<string, string> = {}
      const allErrors: string[] = []
      const allPages: any[] = []
      let filesSuccessful = 0
      let filesFailed = 0
      let diseaseDetected = false

      for (let fileIndex = 0; fileIndex < fileList.length; fileIndex++) {
        if (!await checkJobStatus(jobId)) {
          throw new JobCancelledException(jobId)
        }
        
        const fileInfo = fileList[fileIndex]
        const fileName = fileInfo.name
        
        try {
          await JobManager.updateJobProgress(jobId, {
            current_file: fileName,
            files_processed: fileIndex
          })
          
          const filePath = `${userId}/${jobId}/${fileName}`
          const fileBuffer = await FileStorage.downloadFile(filePath)
          
          if (!fileBuffer) {
            throw new Error('Failed to download file')
          }

          const file = {
            name: fileName,
            size: fileBuffer.byteLength,
            type: 'application/pdf',
            lastModified: Date.now(),
            stream: () => new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(fileBuffer))
                controller.close()
              }
            }),
            arrayBuffer: () => Promise.resolve(fileBuffer.slice()),
            slice: (start = 0, end = fileBuffer.byteLength) => 
              new Blob([fileBuffer.slice(start, end)], { type: 'application/pdf' }),
            text: () => Promise.resolve(''),
            webkitRelativePath: ''
          } as File
          
          const pages = await extractPagesFromPDF(file)
          
          const pagesWithFilename = pages.map(page => ({
            ...page,
            metadata: {
              ...page.metadata,
              file_name: fileName
            }
          }))
          
          allPages.push(...pagesWithFilename)
          
          // Detect disease type early
          if (!diseaseDetected && allPages.length >= 3) {
            detectedDiseaseType = await detectDiseaseTypeEarly(allPages, jobId)
            diseaseDetected = true
            
            await supabase
              .from('extractions')
              .update({
                disease_type: detectedDiseaseType,
                title: detectedDiseaseType,
                updated_at: new Date().toISOString()
              })
              .eq('id', extraction.id)
          }
          
          await FileStorage.deleteFile(filePath)
          filesSuccessful++
          
        } catch (error) {
          if (error instanceof JobCancelledException) throw error
          
          allErrors.push(`Failed to process ${fileName}: ${error}`)
          filesFailed++
          
          const filePath = `${userId}/${jobId}/${fileName}`
          await FileStorage.deleteFile(filePath)
        }
      }
      
      // Process AI extraction
      if (allPages.length > 0) {
        try {
          if (!await checkJobStatus(jobId)) {
            throw new JobCancelledException(jobId)
          }
          
          const { interactions, errors: interactionErrors } = await extractInteractionsFromPages(
            allPages,
            detectedDiseaseType,
            async (progress) => {
              // Update job progress in real-time
              await JobManager.updateJobProgress(jobId, {
                current_file: `Processing ${progress.fileName} (${progress.fileIndex + 1}/${progress.totalFiles})`
              })
            },
            jobId
          )

          const { references, errors: referenceErrors } = await extractReferencesFromPages(
            allPages,
            jobId
          )
          
          allInteractions.push(...interactions)
          Object.assign(allReferences, references)
          allErrors.push(...interactionErrors, ...referenceErrors)
          
          // Update progress
          await JobManager.updateJobProgress(jobId, {
            files_successful: filesSuccessful,
            files_processed: fileList.length,
            interactions_found: allInteractions.length
          })
          
          await supabase
            .from('extractions')
            .update({
              source_references: allReferences,
              errors: allErrors,
              interaction_count: allInteractions.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', extraction.id)
          
          if (interactions.length > 0) {
            await SupabaseExtraction.saveInteractions(extraction.id, interactions)
          }
            
        } catch (aiError) {
          if (aiError instanceof JobCancelledException) throw aiError
          allErrors.push(`AI processing failed: ${aiError}`)
        }
      }
      
      const finalStatus = filesSuccessful === fileList.length ? 'completed' : 
                         filesSuccessful > 0 ? 'partial' : 'failed'
      
      const { diseaseType, title } = await updateExtractionTitleAndDisease(
        extraction.id, 
        allInteractions, 
        allPages,
        detectedDiseaseType,
        jobId
      )
      
      await supabase
        .from('extractions')
        .update({
          status: finalStatus,
          interaction_count: allInteractions.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', extraction.id)
      
      await JobManager.updateJobProgress(jobId, {
        status: finalStatus,
        interactions_found: allInteractions.length,
        files_successful: filesSuccessful,
        files_failed: filesFailed,
        current_file: undefined
      })
      
      if (finalStatus !== 'failed') {
        try {
          await incrementUserExtraction(userId)
        } catch (error) {
          // Silent fail on usage tracking
        }
      }
      
      console.log(`✅ Job ${jobId} completed: ${finalStatus}, ${allInteractions.length} interactions, disease: ${diseaseType}`)
      
      return { success: true }
      
    } catch (error) {
      if (error instanceof JobCancelledException) {
        console.log(`🛑 Job ${jobId} cancelled`)
        
        await JobManager.updateJobProgress(jobId, {
          status: 'failed',
          current_file: undefined
        })
        
        if (extraction?.id) {
          await supabase
            .from('extractions')
            .update({
              status: 'failed',
              errors: ['Job was cancelled'],
              updated_at: new Date().toISOString()
            })
            .eq('id', extraction.id)
        }
        
        try {
          await FileStorage.deleteJobFiles(userId, jobId)
        } catch (cleanupError) {
          // Silent fail on cleanup
        }
        
        return { success: false, error: 'Job was cancelled' }
      }
      
      console.error(`❌ Job ${jobId} failed:`, error)
      
      await JobManager.updateJobProgress(jobId, {
        status: 'failed',
        current_file: undefined
      })
      
      if (extraction?.id) {
        try {
          await updateExtractionTitleAndDisease(extraction.id, [], [], detectedDiseaseType, jobId)
          
          await supabase
            .from('extractions')
            .update({
              status: 'failed',
              errors: [error instanceof Error ? error.message : 'Unknown error'],
              updated_at: new Date().toISOString()
            })
            .eq('id', extraction.id)
        } catch (updateError) {
          // Silent fail on cleanup
        }
      }
      
      try {
        await FileStorage.deleteJobFiles(userId, jobId)
      } catch (cleanupError) {
        // Silent fail on cleanup
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }
    }
  }
}