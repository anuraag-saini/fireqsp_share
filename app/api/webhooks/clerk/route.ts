import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { WebhookEvent } from '@clerk/nextjs/server'
import { Webhook } from 'svix'

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!

export async function POST(req: Request) {
  console.log('🔥 WEBHOOK CALLED - Starting processing...')
  try {

    // Get the raw body
    const rawBody = await req.text()
    console.log('📝 Raw body length:', rawBody.length)

    const headersList = await headers()
    console.log('📋 Headers received:', {
      'svix-id': headersList.get('svix-id'),
      'svix-timestamp': headersList.get('svix-timestamp'),
      'svix-signature': headersList.get('svix-signature') ? 'present' : 'missing'
    })
    
    // Get webhook headers
    const svix_id = headersList.get('svix-id')
    const svix_timestamp = headersList.get('svix-timestamp')
    const svix_signature = headersList.get('svix-signature')

    // Verify webhook signature using svix
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing required webhook headers')
      return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 })
    }

    const wh = new Webhook(CLERK_WEBHOOK_SECRET)
    let payload: WebhookEvent

    try {
      payload = wh.verify(rawBody, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const eventType = payload.type
    console.log(`Processing webhook event: ${eventType}`)

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const user = payload.data
      console.log('👤 User data:', {
        id: user?.id,
        email: user.email_addresses?.[0]?.email_address,
        created_at: user.created_at
      })
      
      if (!user?.id) {
        console.error('Missing user ID in webhook payload')
        return NextResponse.json({ error: 'Invalid user data' }, { status: 400 })
      }

      const user_id = user.id
      const user_email = user.email_addresses?.[0]?.email_address ?? ''
      
      // Handle timestamp properly - Clerk sends Unix timestamp in milliseconds
      const created_at = user.created_at 
        ? new Date(user.created_at).toISOString()
        : new Date().toISOString()
        
      const now = new Date().toISOString()
      const currentMonth = now.slice(0, 7) // YYYY-MM

      console.log(`Processing user: ${user_id} (${user_email})`)

      try {
        // Upsert into user_subscriptions
        const { error: subscriptionError } = await supabaseAdmin
          .from('user_subscriptions')
          .upsert(
            {
              user_id,
              user_email,
              plan_type: 'trial',
              status: 'active',
              trial_start_date: created_at,
              created_at,
              updated_at: now,
              last_active: now,
            },
            { onConflict: 'user_id' }
          )

        if (subscriptionError) {
          console.error('Error upserting user subscription:', subscriptionError)
          throw subscriptionError
        }

        // Upsert into user_usage
        const { error: usageError } = await supabaseAdmin
          .from('user_usage')
          .upsert(
            {
              user_id,
              extraction_count: 0,
              current_month: currentMonth,
              updated_at: now,
            },
            { onConflict: 'user_id' }
          )

        if (usageError) {
          console.error('Error upserting user usage:', usageError)
          throw usageError
        }

        console.log(`Successfully processed user ${eventType}: ${user_id}`)
        return NextResponse.json({ success: true, event: eventType })

      } catch (dbError) {
        console.error(`Database error for user ${user_id}:`, dbError)
        return NextResponse.json({ error: 'Database operation failed' }, { status: 500 })
      }
    }

    // Handle user deletion
    if (eventType === 'user.deleted') {
      const user = payload.data
      
      if (!user?.id) {
        console.error('Missing user ID in deletion webhook payload')
        return NextResponse.json({ error: 'Invalid user data' }, { status: 400 })
      }

      try {
        // Delete user data
        await supabaseAdmin.from('user_subscriptions').delete().eq('user_id', user.id)
        await supabaseAdmin.from('user_usage').delete().eq('user_id', user.id)
        
        console.log(`Successfully deleted user: ${user.id}`)
        return NextResponse.json({ success: true, event: eventType })
      } catch (dbError) {
        console.error(`Database error deleting user ${user.id}:`, dbError)
        return NextResponse.json({ error: 'Database deletion failed' }, { status: 500 })
      }
    }

    // Log unhandled events
    console.log(`Unhandled event type: ${eventType}`)
    return NextResponse.json({ ignored: true, event: eventType })

  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: err.message 
    }, { status: 500 })
  }
}