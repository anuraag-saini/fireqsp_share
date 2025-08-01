// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

// Admin email check (same as frontend)
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

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: activeUsers } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('last_active', thirtyDaysAgo.toISOString())

    // Get total extractions
    const { count: totalExtractions } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true })

    // Calculate total revenue (simplified - in production you'd query Stripe)
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('plan_type, status')

    let totalRevenue = 0
    subscriptions?.forEach(sub => {
      // Default to active if status column doesn't exist yet
      const userStatus = sub.status || 'active'
      if (userStatus === 'active') {
        switch (sub.plan_type) {
          case 'basic': totalRevenue += 19; break
          case 'pro': totalRevenue += 99; break
          case 'enterprise': totalRevenue += 299; break
        }
      }
    })

    // Get API calls count (last 30 days)
    const { count: apiCalls } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Calculate error rate (simplified)
    const { count: failedExtractions } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const errorRate = (totalExtractions && failedExtractions) ? failedExtractions / totalExtractions * 100 : 0

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalExtractions: totalExtractions || 0,
      totalRevenue,
      apiCalls: apiCalls || 0,
      errorRate
    }

    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}