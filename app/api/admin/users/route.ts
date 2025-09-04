// app/api/admin/users/route.ts - Fetch from Clerk + Subscription Management
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createClerkClient } from '@clerk/nextjs/server'

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com',
  'admin@fireqsp.com'
]

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
})

export async function GET() {
  try {
    console.log('👥 Admin users API called - fetching from Clerk')
    
    const user = await requireAuth()
    
    if (!ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      console.log('❌ Unauthorized users access')
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    console.log('✅ Admin users access granted, fetching from Clerk...')

    // Get users from Clerk with correct syntax
    const clerkUsers = await clerkClient.users.getUserList({
      limit: 100,
      orderBy: '-created_at'
    })

    console.log(`📋 Found ${clerkUsers.data?.length || 0} users from Clerk`)

    // Get subscription data from Supabase for all users
    const { data: subscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')

    const subscriptionMap = new Map(
      (subscriptions || []).map(sub => [sub.user_id, sub])
    )

    // Enrich Clerk users with subscription and extraction data
    const enrichedUsers = await Promise.all(
      clerkUsers.data.map(async (clerkUser) => {
        const subscription = subscriptionMap.get(clerkUser.id)
        
        // Get extraction count
        const { count: extractionsCount } = await supabaseAdmin
          .from('extractions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', clerkUser.id)

        // Get recent extractions (30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const { count: recentExtractions } = await supabaseAdmin
          .from('extractions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', clerkUser.id)
          .gte('created_at', thirtyDaysAgo.toISOString())

        // Calculate spending (simplified)
        let totalSpent = 0
        const planType = subscription?.plan_type || 'trial'
        const userStatus = subscription?.status || 'trial'
        
        if (userStatus === 'active' && subscription) {
          const monthsActive = Math.max(1, Math.ceil(
            (new Date().getTime() - new Date(subscription.created_at).getTime()) / 
            (1000 * 60 * 60 * 24 * 30)
          ))
          
          switch (planType) {
            case 'basic': totalSpent = 19 * Math.min(monthsActive, 12); break
            case 'pro': totalSpent = 99 * Math.min(monthsActive, 12); break
            case 'enterprise': totalSpent = 299 * Math.min(monthsActive, 12); break
            default: totalSpent = 0; break
          }
        }

        return {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || 'No email',
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 
                clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Unknown',
          plan: planType,
          status: userStatus,
          joinDate: new Date(clerkUser.createdAt).toISOString(),
          lastActive: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt).toISOString() : 
                     new Date(clerkUser.createdAt).toISOString(),
          extractionsCount: extractionsCount || 0,
          apiCallsThisMonth: recentExtractions || 0,
          totalSpent: Math.round(totalSpent),
          hasSubscription: !!subscription,
          isAdminGranted: subscription?.granted_by_admin || false,
          clerkData: {
            imageUrl: clerkUser.imageUrl,
            username: clerkUser.username,
            phoneNumbers: clerkUser.phoneNumbers.map(p => p.phoneNumber)
          }
        }
      })
    )

    console.log(`✅ Enriched ${enrichedUsers.length} users with subscription and extraction data`)

    return NextResponse.json({ users: enrichedUsers })
    
  } catch (error) {
    console.error('❌ Admin users fetch error:', error)
    return handleAuthError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    if (!ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { userId, action, planType } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 })
    }

    console.log(`🔧 Admin action: ${action} for user: ${userId}`)

    switch (action) {
      case 'grant_subscription': {
        const plan = planType || 'pro'
        
        // Upsert subscription
        await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            plan_type: plan,
            status: 'active',
            granted_by_admin: true,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        console.log(`✅ Granted ${plan} subscription to user ${userId}`)
        break
      }

      case 'revoke_subscription': {
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        console.log(`✅ Revoked subscription for user ${userId}`)
        break
      }

      case 'suspend': {
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ 
            status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        break
      }

      case 'activate': {
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        break
      }

      case 'view': {
        // Get detailed user info from Clerk
        const clerkUser = await clerkClient.users.getUser(userId)
        
        // Get subscription details
        const { data: userSubscription } = await supabaseAdmin
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        // Get recent extractions
        const { data: userExtractions } = await supabaseAdmin
          .from('extractions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
        
        return NextResponse.json({ 
          user: {
            ...clerkUser,
            subscription: userSubscription
          },
          extractions: userExtractions || []
        })
      }

      case 'ban_user': {
        // Ban user in Clerk (this will prevent login)
        await clerkClient.users.banUser(userId)
        
        // Also suspend subscription
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ 
            status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        
        console.log(`✅ Banned user ${userId} in Clerk and suspended subscription`)
        break
      }

      case 'unban_user': {
        // Unban user in Clerk
        await clerkClient.users.unbanUser(userId)
        
        // Reactivate subscription if exists
        const { data: subscription } = await supabaseAdmin
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (subscription) {
          await supabaseAdmin
            .from('user_subscriptions')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
        }
        
        console.log(`✅ Unbanned user ${userId} in Clerk and reactivated subscription`)
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('❌ Admin user action error:', error)
    return handleAuthError(error)
  }
}