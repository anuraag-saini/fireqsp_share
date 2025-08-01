// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com', // Replace with your actual admin email
  'admin@fireqsp.com'
]

// GET - Fetch all users
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get users with their subscription and usage data
    const { data: users, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        extractions:extractions(count)
      `)
      .order('created_at', { ascending: false })
      .limit(100) // Limit to recent 100 users

    if (error) throw error

    // Calculate additional metrics for each user
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        // Get extraction count for this user
        const { count: extractionsCount } = await supabase
          .from('extractions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.user_id)

        // Calculate total spent (simplified)
        let totalSpent = 0
        const userStatus = user.status || 'active' // Default to active if column doesn't exist
        if (userStatus === 'active') {
          const monthsActive = Math.ceil(
            (new Date().getTime() - new Date(user.created_at).getTime()) / 
            (1000 * 60 * 60 * 24 * 30)
          )
          
          switch (user.plan_type) {
            case 'basic': totalSpent = 19 * monthsActive; break
            case 'pro': totalSpent = 99 * monthsActive; break
            case 'enterprise': totalSpent = 299 * monthsActive; break
          }
        }

        return {
          id: user.user_id,
          email: user.user_email,
          name: user.user_email.split('@')[0], // Simple name from email
          plan: user.plan_type || 'trial',
          status: userStatus,
          joinDate: user.created_at,
          lastActive: user.last_active || user.created_at,
          extractionsCount: extractionsCount || 0,
          apiCallsThisMonth: extractionsCount || 0, // Simplified
          totalSpent
        }
      })
    )

    return NextResponse.json({ users: enrichedUsers })
    
  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST - Handle user actions (suspend, delete, etc.)
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

    switch (action) {
      case 'suspend':
        await supabase
          .from('user_subscriptions')
          .update({ status: 'suspended' })
          .eq('user_id', userId)
        break

      case 'delete':
        // In production, you might want to soft delete or archive instead
        await supabase
          .from('user_subscriptions')
          .delete()
          .eq('user_id', userId)
        
        // Also delete user's extractions
        await supabase
          .from('extractions')
          .delete()
          .eq('user_id', userId)
        break

      case 'view':{
        // Return detailed user info
        const { data: userDetails } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        return NextResponse.json({ user: userDetails })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Admin user action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}