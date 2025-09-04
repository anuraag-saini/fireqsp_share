import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClerkClient } from '@clerk/nextjs/server'
import { requireAuth } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
})

const ADMIN_EMAILS = [
  'asaini.anuraags@gmail.com',
  'admin@fireqsp.com'
]

export async function GET() {
  try {
    const user = await requireAuth()
    
    if (!ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    return NextResponse.json({
      openai_model: settings?.openai_model || 'gpt-4o-mini',
      available_models: [
        'gpt-4o-mini',
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
      ]
    })

  } catch (error) {
    console.error('GET settings error:', error)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    if (!ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { openai_model, action, userId, planType, userEmail } = await request.json()
    console.log('📥 Admin settings request:', { openai_model, action, userId, planType, userEmail })

    // Handle OpenAI model update
    if (openai_model) {
      console.log(`🤖 Updating OpenAI model to: ${openai_model}`)
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          id: 1, 
          openai_model,
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('❌ Failed to update model:', error)
        return NextResponse.json({ error: 'Failed to update model' }, { status: 500 })
      }
      
      console.log('✅ OpenAI model updated successfully')
      return NextResponse.json({ success: true, message: 'Model settings updated' })
    }

    // Handle user subscription updates
    if (action === 'grant_access_by_email') {
      console.log(`👤 Granting access to email: ${userEmail}`)
      
      if (!userEmail || !userEmail.includes('@')) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
      }
      
      try {
        // Find user by email in Clerk
        console.log('🔍 Looking up user in Clerk...')
        const clerkUsers = await clerkClient.users.getUserList({
          emailAddress: [userEmail]
        })
        
        if (!clerkUsers.data || clerkUsers.data.length === 0) {
          console.log('❌ User not found in Clerk')
          return NextResponse.json({ 
            error: `User ${userEmail} not found. User must register first.` 
          }, { status: 404 })
        }
        
        const clerkUser = clerkUsers.data[0]
        console.log(`✅ Found Clerk user: ${clerkUser.id}`)
        
        // Check if user already has subscription
        const { data: existingSubscription } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', clerkUser.id)
          .single()
        
        if (existingSubscription && existingSubscription.status === 'active') {
          console.log('⚠️ User already has active subscription')
          return NextResponse.json({ 
            error: `User ${userEmail} already has an active ${existingSubscription.plan_type} subscription` 
          }, { status: 400 })
        }
        
        // Grant/update subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: clerkUser.id,
            user_email: userEmail,
            plan_type: planType || 'pro',
            status: 'active',
            granted_by_admin: true, // 🔑 KEY FLAG
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            created_at: existingSubscription ? existingSubscription.created_at : new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.error('❌ Failed to grant subscription:', error)
          return NextResponse.json({ error: 'Failed to grant subscription' }, { status: 500 })
        }
        
        console.log(`✅ Granted ${planType} access to ${userEmail} (Admin)`)
        return NextResponse.json({ 
          success: true, 
          message: `✅ ${planType} access granted to ${userEmail}` 
        })
        
      } catch (clerkError) {
        console.error('❌ Clerk API error:', clerkError)
        return NextResponse.json({ 
          error: `Failed to find user: ${clerkError instanceof Error ? clerkError.message : 'Unknown error'}` 
        }, { status: 500 })
      }
    }

    // Handle revoke access
    if (action === 'revoke_access' && userId) {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (error) {
        return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
      }
      
      return NextResponse.json({ success: true, message: 'Access revoked' })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ POST settings error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update settings' 
    }, { status: 500 })
  }
}