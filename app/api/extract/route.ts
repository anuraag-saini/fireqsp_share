import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/auth'
import { extractPagesFromPDF } from '@/lib/pdf-processing'
import { extractInteractionsFromPages, extractReferencesFromPages } from '@/lib/extraction'
import { JobManager } from '@/lib/job-manager'
import { FileStorage } from '@/lib/file-storage'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { jobId, fileIndex, userId, extractionId } = await request.json()

    console.log(`🔥 Processing single file: jobId=${jobId}, fileIndex=${fileIndex}`)

    // Get file list to know which file to process
    const { data: fileList } = await supabase.storage
      .from('extraction-files')
      .list(`${userId}/${jobId}`)

    if (!fileList || fileIndex >= fileList.length) {
      throw new Error(`File index ${fileIndex} out of range`)
    }

    const fileInfo = fileList[fileIndex]
    const fileName = fileInfo.name

    console.log(`📄 Processing file: ${fileName} (${fileIndex + 1}/${fileList.length})`)

    // Update job progress - processing this file
    await JobManager.updateJobProgress(jobId, {
      current_file: fileName,
      files_processed: fileIndex
    })

    try {
      // Download and process file (using your existing logic)
      const filePath = `${userId}/${jobId}/${fileName}`
      const fileBuffer = await FileStorage.downloadFile(filePath)
      
      const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' })
      const file = new File([fileBlob], fileName, { type: 'application/pdf' })
      
      const pages = await extractPagesFromPDF(file)
      console.log(`✅ Extracted ${pages.length} pages from ${fileName}`)
      
      const { interactions, errors: interactionErrors } = await extractInteractionsFromPages(
        pages,
        'General'
      )
      
      const { references, errors: referenceErrors } = await extractReferencesFromPages(pages)
      
      const allErrors = [...interactionErrors, ...referenceErrors]
      console.log(`✅ Found ${interactions.length} interactions in ${fileName}`)

      // Add filename to each interaction
      const interactionsWithFilename = interactions.map(interaction => ({
        ...interaction,
        filename: fileName
      }))

      // Update extraction with this file's results (accumulate)
      const { data: currentExtraction } = await supabase
        .from('extractions')
        .select('interactions, source_references, errors, interaction_count')
        .eq('id', extractionId)
        .single()

      const updatedInteractions = [
        ...(currentExtraction?.interactions || []),
        ...interactionsWithFilename
      ]

      const updatedReferences = {
        ...(currentExtraction?.source_references || {}),
        ...references
      }

      const updatedErrors = [
        ...(currentExtraction?.errors || []),
        ...allErrors
      ]

      await supabase
        .from('extractions')
        .update({
          interactions: updatedInteractions,
          source_references: updatedReferences,
          errors: updatedErrors,
          interaction_count: updatedInteractions.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', extractionId)

      // Clean up processed file
      await FileStorage.deleteFile(filePath)

      // Update job progress
      await JobManager.updateJobProgress(jobId, {
        files_successful: fileIndex + 1,
        files_processed: fileIndex + 1,
        interactions_found: updatedInteractions.length
      })

      console.log(`✅ File ${fileName} processed successfully`)

    } catch (fileError) {
      console.error(`❌ Failed to process ${fileName}:`, fileError)
      
      // Update failed file count
      const { data: currentJob } = await supabase
        .from('extraction_jobs')
        .select('files_failed, failed_files')
        .eq('id', jobId)
        .single()

      await JobManager.updateJobProgress(jobId, {
        files_failed: (currentJob?.files_failed || 0) + 1,
        failed_files: [...(currentJob?.failed_files || []), fileName]
      })

      // Clean up failed file
      const filePath = `${userId}/${jobId}/${fileName}`
      await FileStorage.deleteFile(filePath)
    }

    // Check if more files need processing
    const nextFileIndex = fileIndex + 1
    if (nextFileIndex < fileList.length) {
      // Process next file with a small delay
      console.log(`➡️ Triggering next file: ${nextFileIndex}`)
      
      setTimeout(async () => {
        try {
          await fetch(`${process.env.NEXTAUTH_URL}/api/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId,
              fileIndex: nextFileIndex,
              userId,
              extractionId
            })
          })
        } catch (error) {
          console.error('Failed to trigger next file:', error)
          await JobManager.updateJobProgress(jobId, { status: 'failed' })
        }
      }, 1000) // 1 second delay to avoid overwhelming Vercel

    } else {
      // All files processed - finalize job
      console.log(`🎯 All files processed, finalizing job`)
      await finalizeJob(jobId, extractionId, userId)
    }

    return NextResponse.json({ 
      success: true, 
      fileName,
      fileIndex,
      totalFiles: fileList.length
    })

  } catch (error) {
    console.error('Single file processing error:', error)
    return handleAuthError(error)
  }
}

// Helper function to finalize the job
async function finalizeJob(jobId: string, extractionId: string, userId: string) {
  try {
    // Get final extraction data for post-processing
    const { data: extraction } = await supabase
      .from('extractions')
      .select('interactions')
      .eq('id', extractionId)
      .single()

    let diseaseType = 'General'
    let title = 'Extraction Complete'

    // If we have interactions, try to determine disease type
    if (extraction?.interactions && extraction.interactions.length > 0) {
      // This is simplified - we could improve this later
      const sampleText = extraction.interactions
        .slice(0, 3)
        .map((int: any) => int.reference_text || int.details)
        .join(' ')

      if (sampleText.toLowerCase().includes('diabetes')) diseaseType = 'Diabetes'
      else if (sampleText.toLowerCase().includes('ibd') || sampleText.toLowerCase().includes('inflammatory bowel')) diseaseType = 'IBD'
      // Add more disease detection logic as needed

      title = diseaseType !== 'General' ? diseaseType : 'Extraction Complete'
    }

    // Update extraction with final details
    await supabase
      .from('extractions')
      .update({ 
        disease_type: diseaseType,
        status: 'completed',
        title: title,
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)

    // Mark job as completed
    await JobManager.updateJobProgress(jobId, {
      status: 'completed',
      current_file: undefined
    })

    // Track usage
    try {
      const { incrementUserExtraction } = await import('@/lib/usage-tracking')
      await incrementUserExtraction(userId)
    } catch (error) {
      console.error('Failed to track usage:', error)
    }

    console.log(`✅ Job ${jobId} completed successfully`)

  } catch (error) {
    console.error('Failed to finalize job:', error)
    await JobManager.updateJobProgress(jobId, {
      status: 'failed',
      current_file: 'Finalization failed'
    })
  }
}