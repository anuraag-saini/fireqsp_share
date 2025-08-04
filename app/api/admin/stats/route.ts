// app/api/admin/stats/route.ts - Fixed ESLint errors
import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com',
  'admin@fireqsp.com'
]

export async function GET() {
  try {
    console.log('🔍 Admin stats API called')
    
    // Check authentication
    const user = await currentUser()
    console.log('Current user:', user?.emailAddresses[0]?.emailAddress)
    
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      console.log('❌ Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Admin access granted, using supabaseAdmin client')

    // Test connection first
    const { data: testData, error: testError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('❌ Supabase connection error:', testError)
      return NextResponse.json({ 
        error: 'Supabase connection failed', 
        details: testError.message 
      }, { status: 500 })
    }

    console.log('✅ Supabase connected. Sample data:', testData)

    // Get total users count
    console.log('📊 Fetching user stats...')
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      console.error('Users count error:', usersError)
    } else {
      console.log('Total users:', totalUsers)
    }

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    console.log('📅 Checking active users since:', thirtyDaysAgo.toISOString())
    
    const { count: activeUsers, error: activeError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('last_active', thirtyDaysAgo.toISOString())
      .eq('status', 'active')

    if (activeError) {
      console.error('Active users error:', activeError)
    } else {
      console.log('Active users (30 days):', activeUsers)
    }

    // Get total extractions
    const { count: totalExtractions, error: extractionsError } = await supabaseAdmin
      .from('extractions')
      .select('*', { count: 'exact', head: true })

    if (extractionsError) {
      console.error('Extractions count error:', extractionsError)
    } else {
      console.log('Total extractions:', totalExtractions)
    }

    // Get successful extractions
    const { count: successfulExtractions } = await supabaseAdmin
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    // Get failed extractions  
    const { count: failedExtractions } = await supabaseAdmin
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')

    // Calculate revenue
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan_type, status')

    if (subError) {
      console.error('Subscriptions error:', subError)
    }

    let totalRevenue = 0
    subscriptions?.forEach(sub => {
      const status = sub.status || 'active'
      console.log(`💳 Processing subscription: ${sub.plan_type}, status: ${status}`)
      if (status === 'active') {
        switch (sub.plan_type) {
          case 'basic': totalRevenue += 19; break
          case 'pro': totalRevenue += 99; break  
          case 'enterprise': totalRevenue += 299; break
          case 'trial': totalRevenue += 0; break
        }
      }
    })

    // API calls (extractions in last 30 days)
    const { count: apiCalls } = await supabaseAdmin
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Error rate
    const errorRate = totalExtractions && failedExtractions 
      ? Math.round((failedExtractions / totalExtractions) * 100 * 100) / 100 
      : 0

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalExtractions: totalExtractions || 0,
      successfulExtractions: successfulExtractions || 0,
      failedExtractions: failedExtractions || 0,
      totalRevenue,
      apiCalls: apiCalls || 0,
      errorRate
    }

    console.log('📈 Final stats:', stats)
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('❌ Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}