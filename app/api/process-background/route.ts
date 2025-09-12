// app/api/process-background/route.ts - Debug Version
import { NextRequest, NextResponse } from 'next/server'
import { BackgroundProcessor } from '@/lib/background-processor'

export const maxDuration = 800 // 13 minutes (800 seconds) for Vercel Pro

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  console.log('🎯 PROCESS-BACKGROUND ROUTE CALLED', {
    timestamp,
    url: request.url,
    method: request.method
  })

  try {
    // Parse request body
    console.log('📝 Parsing request body...')
    const requestBody = await request.json()
    console.log('Request body received:', requestBody)

    const { jobId, userId, userEmail, fileCount } = requestBody
    
    // Validate required parameters
    const missingParams = []
    if (!jobId) missingParams.push('jobId')
    if (!userId) missingParams.push('userId')  
    if (!userEmail) missingParams.push('userEmail')
    if (!fileCount) missingParams.push('fileCount')
    
    if (missingParams.length > 0) {
      console.error('❌ Missing parameters:', missingParams)
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          missing: missingParams,
          received: requestBody
        },
        { status: 400 }
      )
    }
    
    console.log('✅ All required parameters present:', {
      jobId,
      userId,
      userEmail,
      fileCount
    })
    
    // DIAGNOSTIC SECTION
    console.log('🔍 Testing BackgroundProcessor import...')
    console.log('BackgroundProcessor:', typeof BackgroundProcessor)
    console.log('processExtractionJob:', typeof BackgroundProcessor.processExtractionJob)
    
    try {
      console.log('🚀 About to call BackgroundProcessor.processExtractionJob...')
      
      const processingPromise = BackgroundProcessor.processExtractionJob(
        jobId,
        userId,
        userEmail,
        fileCount
      )
      
      console.log('🎯 processExtractionJob call returned:', typeof processingPromise)
      
      processingPromise.then(() => {
        console.log('✅ Background processing completed successfully for job:', jobId)
      }).catch(error => {
        console.error('❌ Background processing failed:', {
          error: error.message,
          stack: error.stack,
          jobId,
          userId,
          timestamp: new Date().toISOString()
        })
      })
      
    } catch (syncError) {
      console.error('❌ Synchronous error calling BackgroundProcessor:', syncError)
    }
    
    console.log('📤 Returning immediate response (async processing started)')
    
    // Return immediately - don't wait for processing to complete
    return NextResponse.json({ 
      success: true, 
      message: 'Background processing started',
      jobId,
      timestamp,
      debug: {
        receivedParams: { jobId, userId, userEmail, fileCount },
        processingStarted: true
      }
    })
    
  } catch (error) {
    console.error('❌ PROCESS-BACKGROUND ERROR:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp,
      url: request.url
    })
    
    return NextResponse.json(
      {
        error: 'Failed to start background processing',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
        debug: {
          route: '/api/process-background',
          environment: process.env.NODE_ENV
        }
      },
      { status: 500 }
    )
  }
}