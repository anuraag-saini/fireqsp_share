// app/api/admin/activity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com', // Replace with your actual admin email
  'admin@fireqsp.com'
]

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent extractions as activity feed
    const { data: extractions, error } = await supabase
      .from('extractions')
      .select(`
        id,
        user_id,
        title,
        status,
        file_count,
        interaction_count,
        created_at,
        user_subscriptions!inner(user_email)
      `)
      .order('created_at', { ascending: false })
      .limit(50) // Last 50 activities

    if (error) throw error

    // Transform to activity format
    const activities = extractions?.map(extraction => {
      let action = 'PDF Extraction'
      let details = `${extraction.file_count} files processed`

      if (extraction.status === 'completed') {
        action = 'Extraction Completed'
        details = `Found ${extraction.interaction_count} interactions from ${extraction.file_count} files`
      } else if (extraction.status === 'failed') {
        action = 'Extraction Failed'
        details = `Failed to process ${extraction.file_count} files`
      } else if (extraction.status === 'processing') {
        action = 'Extraction In Progress'
        details = `Processing ${extraction.file_count} files`
      }

      return {
        id: extraction.id,
        userId: extraction.user_id,
        userEmail: extraction.user_subscriptions?.[0]?.user_email || 'Unknown',
        action,
        details,
        timestamp: extraction.created_at
      }
    }) || []

    // You can add more activity types here, like:
    // - User registrations
    // - Subscription changes
    // - Payment events
    // - API errors

    // Get recent user registrations
    const { data: newUsers } = await supabase
      .from('user_subscriptions')
      .select('user_id, user_email, created_at, plan_type')
      .order('created_at', { ascending: false })
      .limit(10)

    const userActivities = newUsers?.map(user => ({
      id: `user_${user.user_id}`,
      userId: user.user_id,
      userEmail: user.user_email,
      action: 'New User Registration',
      details: `Signed up for ${user.plan_type} plan`,
      timestamp: user.created_at
    })) || []

    // Combine all activities and sort by timestamp
    const allActivities = [...activities, ...userActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50) // Keep only the 50 most recent

    return NextResponse.json({ activities: allActivities })
    
  } catch (error) {
    console.error('Admin activity fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}