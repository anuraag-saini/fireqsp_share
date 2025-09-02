import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { FileStorage } from '@/lib/file-storage'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const jobId = formData.get('jobId') as string

    if (!file || !userId || !jobId) {
      return NextResponse.json({ error: 'Missing file, userId, or jobId' }, { status: 400 })
    }

    // Verify user authorization
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use your existing FileStorage.uploadFile (server-side with service role)
    const filePath = await FileStorage.uploadFile(userId, file, jobId)
    
    return NextResponse.json({ success: true, filePath })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}