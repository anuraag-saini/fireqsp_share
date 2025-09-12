import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get all processing jobs
    const { data: processingJobs } = await supabase
      .from('extraction_jobs')
      .select('id, user_id, created_at, started_at, current_file, total_files, files_processed')
      .in('status', ['processing', 'queued'])
      .order('created_at', { ascending: false })
    
    return NextResponse.json({ 
      jobs: processingJobs || [],
      count: processingJobs?.length || 0
    })
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { jobId } = await request.json()
    
    if (jobId) {
      // Kill specific job
      await supabase
        .from('extraction_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
      
      await supabase
        .from('extractions')
        .update({
          status: 'failed',
          errors: ['Job manually stopped by admin'],
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId)
      
      return NextResponse.json({ message: 'Job killed successfully' })
    } else {
      // Kill all jobs older than 2 hours (original functionality)
      const oneHoursAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      
      const { data: stuckJobs } = await supabase
        .from('extraction_jobs')
        .select('id')
        .eq('status', 'processing')
        .lt('created_at', oneHoursAgo)
      
      if (!stuckJobs || stuckJobs.length === 0) {
        return NextResponse.json({ message: 'No stuck jobs found', count: 0 })
      }
      
      for (const job of stuckJobs) {
        await supabase
          .from('extraction_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)
        
        await supabase
          .from('extractions')
          .update({
            status: 'failed',
            errors: ['Job timeout - cleaned up by admin'],
            updated_at: new Date().toISOString()
          })
          .eq('job_id', job.id)
      }
      
      return NextResponse.json({ 
        message: `Cleaned up ${stuckJobs.length} stuck jobs`,
        count: stuckJobs.length
      })
    }
    
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}