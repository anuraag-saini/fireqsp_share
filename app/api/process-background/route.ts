// app/api/process-background/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { BackgroundProcessor } from '@/lib/background-processor'

export async function POST(request: NextRequest) {
  try {

    const { jobId, userId, userEmail, fileCount } = await request.json()

    
    if (!jobId || !userId || !userEmail || !fileCount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    console.log(`Starting background processing for job ${jobId}`)
    
    // Process the job in the background WITHOUT waiting for completion
    // This makes the processing truly asynchronous
    BackgroundProcessor.processExtractionJob(
      jobId,
      userId,
      userEmail,
      fileCount
    ).catch(error => {
      console.error('Background processing failed:', error)
      // Error handling is done inside BackgroundProcessor
    })
    
    // Return immediately - don't wait for processing to complete
    return NextResponse.json({ 
      success: true, 
      message: 'Background processing started' 
    })
    
  } catch (error) {
    console.error('Background processing API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to start background processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}