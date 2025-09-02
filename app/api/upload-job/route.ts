import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { JobManager } from '@/lib/job-manager'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { fileCount, userEmail } = await request.json()

    if (!fileCount || !userEmail) {
      return NextResponse.json(
        { error: 'Missing fileCount or userEmail' },
        { status: 400 }
      )
    }

    console.log(`Creating upload job for ${fileCount} files, user: ${userEmail}`)

    // Create job record (no files yet)
    const jobId = await JobManager.createJob(user.id, fileCount)

    return NextResponse.json({
      success: true,
      jobId,
      userId: user.id,
      message: `Job created for ${fileCount} files`
    })

  } catch (error) {
    console.error('Upload job creation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create upload job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}