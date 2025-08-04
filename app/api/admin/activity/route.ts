// app/api/admin/activity/route.ts - Fixed ESLint errors
import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com',
  'admin@fireqsp.com'
]

export async function GET() {
  try {
    console.log('📈 Admin activity API called')
    
    const user = await currentUser()
    
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      console.log('❌ Unauthorized activity access')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Admin activity access granted, using supabaseAdmin client')

    // Get recent extractions
    const { data: extractions, error: extractionsError } = await supabaseAdmin
      .from('extractions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (extractionsError) {
      console.error('❌ Extractions query error:', extractionsError)
      throw extractionsError
    }

    console.log(`📊 Found ${extractions?.length || 0} recent extractions`)

    // Get user emails for extractions
    const userIds = [...new Set(extractions?.map(e => e.user_id) || [])]
    const { data: userEmails } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id, user_email')
      .in('user_id', userIds)

    const userEmailMap = userEmails?.reduce((acc, user) => {
      acc[user.user_id] = user.user_email
      return acc
    }, {} as Record<string, string>) || {}

    console.log(`📧 Got emails for ${Object.keys(userEmailMap).length} users`)

    // Transform extractions to activities
    const extractionActivities = extractions?.map(extraction => {
      let action = 'PDF Extraction Started'
      let details = `Processing ${extraction.file_count} files`

      if (extraction.status === 'completed') {
        action = 'Extraction Completed'
        details = `Found ${extraction.interaction_count || 0} interactions from ${extraction.file_count} files`
      } else if (extraction.status === 'failed') {
        action = 'Extraction Failed'
        details = `Failed to process ${extraction.file_count} files`
      } else if (extraction.status === 'processing') {
        action = 'Extraction In Progress'
        details = `Processing ${extraction.file_count} files`
      }

      // Clean email display - handle various email patterns
      const rawEmail = userEmailMap[extraction.user_id] || 'unknown@user.com'
      let displayEmail = rawEmail
      
      if (rawEmail.includes('@placeholder.com')) {
        displayEmail = rawEmail.replace('existing-user-', '').replace('@placeholder.com', '@unknown.com')
      } else if (rawEmail.includes('clerk-error')) {
        displayEmail = 'clerk-fetch-error@unknown.com'
      } else if (rawEmail === 'email-fetch-failed') {
        displayEmail = 'email-fetch-failed@unknown.com'
      }

      return {
        id: extraction.id,
        userId: extraction.user_id,
        userEmail: displayEmail,
        action,
        details,
        status: extraction.status,
        title: extraction.title || 'Untitled Extraction',
        timestamp: extraction.created_at
      }
    }) || []

    // Get recent user registrations (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: newUsers } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id, user_email, created_at, plan_type, status')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    console.log(`👥 Found ${newUsers?.length || 0} recent user registrations`)

    const userActivities = newUsers?.map(user => {
      // Clean email display
      let displayEmail = user.user_email
      if (user.user_email.includes('@placeholder.com')) {
        displayEmail = user.user_email.replace('existing-user-', '').replace('@placeholder.com', '@unknown.com')
      } else if (user.user_email.includes('clerk-error')) {
        displayEmail = 'clerk-fetch-error@unknown.com'
      } else if (user.user_email === 'email-fetch-failed') {
        displayEmail = 'email-fetch-failed@unknown.com'
      }

      return {
        id: `user_${user.user_id}`,
        userId: user.user_id,
        userEmail: displayEmail,
        action: 'New User Registration',
        details: `Signed up for ${user.plan_type || 'trial'} plan`,
        status: user.status || 'active',
        title: 'User Registration',
        timestamp: user.created_at
      }
    }) || []

    // Combine and sort activities
    const allActivities = [...extractionActivities, ...userActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50)

    console.log(`✅ Returning ${allActivities.length} total activities`)

    return NextResponse.json({ activities: allActivities })
    
  } catch (error) {
    console.error('❌ Admin activity fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}