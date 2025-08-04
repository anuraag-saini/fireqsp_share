// app/api/admin/users/route.ts - Fixed to match your working pattern
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'  // Using supabaseAdmin like your working routes

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com',
  'admin@fireqsp.com'
]

export async function GET(request: NextRequest) {
  try {
    console.log('👥 Admin users API called')
    
    const user = await currentUser()
    
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      console.log('❌ Unauthorized users access')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Admin users access granted, using supabaseAdmin client')

    // Get users from user_subscriptions
    const { data: users, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('❌ Supabase users error:', error)
      throw error
    }

    console.log(`📋 Found ${users?.length || 0} users`)

    // Enrich with extraction data
    const enrichedUsers = await Promise.all(
      (users || []).map(async (user) => {
        // Get extraction count
        const { count: extractionsCount } = await supabaseAdmin
          .from('extractions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)

        // Get recent extractions (30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const { count: recentExtractions } = await supabaseAdmin
          .from('extractions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .gte('created_at', thirtyDaysAgo.toISOString())

        // Calculate spending (simplified)
        let totalSpent = 0
        const userStatus = user.status || 'active'
        if (userStatus === 'active') {
          const monthsActive = Math.max(1, Math.ceil(
            (new Date().getTime() - new Date(user.created_at).getTime()) / 
            (1000 * 60 * 60 * 24 * 30)
          ))
          
          switch (user.plan_type) {
            case 'basic': totalSpent = 19 * Math.min(monthsActive, 12); break
            case 'pro': totalSpent = 99 * Math.min(monthsActive, 12); break
            case 'enterprise': totalSpent = 299 * Math.min(monthsActive, 12); break
            case 'trial': totalSpent = 0; break
          }
        }

        // Clean email display - handle different email patterns
        let displayEmail = user.user_email
        if (user.user_email.includes('@placeholder.com')) {
          displayEmail = user.user_email.replace('existing-user-', '').replace('@placeholder.com', '@unknown.com')
        } else if (user.user_email.includes('clerk-error')) {
          displayEmail = 'clerk-fetch-error@unknown.com'
        } else if (user.user_email === 'email-fetch-failed') {
          displayEmail = 'email-fetch-failed@unknown.com'
        }

        return {
          id: user.user_id,
          email: displayEmail,
          name: displayEmail.split('@')[0],
          plan: user.plan_type || 'trial',
          status: userStatus,
          joinDate: user.created_at,
          lastActive: user.last_active || user.created_at,
          extractionsCount: extractionsCount || 0,
          apiCallsThisMonth: recentExtractions || 0,
          totalSpent: Math.round(totalSpent)
        }
      })
    )

    console.log(`✅ Enriched ${enrichedUsers.length} users with extraction data`)

    return NextResponse.json({ users: enrichedUsers })
    
  } catch (error) {
    console.error('❌ Admin users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 })
    }

    console.log(`🔧 Admin action: ${action} for user: ${userId}`)

    switch (action) {
      case 'suspend':
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ status: 'suspended' })
          .eq('user_id', userId)
        break

      case 'activate':
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ status: 'active' })
          .eq('user_id', userId)
        break

      case 'delete':
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ status: 'deleted' })
          .eq('user_id', userId)
        break

      case 'view':
        const { data: userDetails } = await supabaseAdmin
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        const { data: userExtractions } = await supabaseAdmin
          .from('extractions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
        
        return NextResponse.json({ 
          user: userDetails,
          extractions: userExtractions || []
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('❌ Admin user action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}