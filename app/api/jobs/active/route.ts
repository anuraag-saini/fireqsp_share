// app/api/jobs/active/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active jobs (queued or processing)
    const { data: jobs, error } = await supabase
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
        created_at,
        started_at
      `)
      .eq('user_id', user.id)
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch active jobs:', error)
      return NextResponse.json({ error: 'Failed to fetch active jobs' }, { status: 500 })
    }

    return NextResponse.json(jobs || [])

  } catch (error) {
    console.error('Active jobs API error:', error)
    return NextResponse.json({ error: 'Failed to fetch active jobs' }, { status: 500 })
  }
}