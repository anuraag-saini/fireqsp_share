import { NextResponse } from 'next/server'
import { BackgroundProcessor } from '@/lib/background-processor'

export async function POST() {
  try {
    console.log('🧪 TEST: Starting background processor test')
    
    // Use dummy data for testing
    const result = await BackgroundProcessor.processExtractionJob(
      'test-job-123',
      'test-user-123', 
      'test@example.com',
      1
    )
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test completed',
      result 
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 })
  }
}