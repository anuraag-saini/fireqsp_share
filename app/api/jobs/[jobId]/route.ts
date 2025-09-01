// app/api/jobs/[jobId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, handleAuthError } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireAuth()
    const { jobId } = await params

    console.log(`Checking job status for jobId: ${jobId}, userId: ${user.id}`)

    // First, check if the job exists at all (without user filter)
    const { data: anyJob, error: anyJobError } = await supabase
      .from('extraction_jobs')
      .select('id, user_id, status')
      .eq('id', jobId)
      .single()

    if (anyJobError || !anyJob) {
      console.error('Job does not exist in database:', jobId)
      return NextResponse.json({ 
        error: 'Job not found in database',
        debug: {
          jobId: jobId,
          exists: false
        }
      }, { status: 404 })
    }

    // Check if user matches
    if (anyJob.user_id !== user.id) {
      console.error(`Job user mismatch. Job user: ${anyJob.user_id}, Current user: ${user.id}`)
      return NextResponse.json({ 
        error: 'Job not found - user mismatch',
        debug: {
          jobId: jobId,
          exists: true,
          jobUserId: anyJob.user_id,
          currentUserId: user.id
        }
      }, { status: 404 })
    }

    // Get full job data
    const { data: job, error } = await supabase
      .from('extraction_jobs')
      .select(`
        id,
        status,
        total_files,
        files_processed,
        files_successful, 
        files_failed,
        current_file,
        interactions_found,
        failed_files,
        created_at,
        started_at,
        completed_at,
        extraction_id
      `)
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Failed to get job details' }, { status: 500 })
    }

    console.log(`Job found: ${job.status}, ${job.files_processed}/${job.total_files} files processed`)

    return NextResponse.json(job)

  } catch (error) {
    console.error('Status API error:', error)
    return handleAuthError(error)
  }
}