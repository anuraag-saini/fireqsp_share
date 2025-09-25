// app/api/webhooks/clerk/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { Webhook } from 'svix'

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!

/**
 * Clerk Webhook Handler
 * Handles user lifecycle events: user.created, user.updated, user.deleted
 * 
 * Setup:
 * 1. Go to Clerk Dashboard → Webhooks
 * 2. Add endpoint: https://yourdomain.com/api/webhooks/clerk
 * 3. Subscribe to events: user.created, user.updated, user.deleted
 * 4. Copy webhook secret to .env.local as CLERK_WEBHOOK_SECRET
 */
export async function POST(req: Request) {
  console.log('📥 Clerk webhook received')
  
  try {
    // Get the raw body for signature verification
    const rawBody = await req.text()
    
    // Get Svix headers for verification
    const headersList = await headers()
    const svix_id = headersList.get('svix-id')
    const svix_timestamp = headersList.get('svix-timestamp')
    const svix_signature = headersList.get('svix-signature')

    // Verify required headers exist
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('❌ Missing Svix headers')
      return NextResponse.json(
        { error: 'Missing webhook headers' }, 
        { status: 400 }
      )
    }

    // Verify webhook signature using Svix
    const wh = new Webhook(WEBHOOK_SECRET)
    let payload: WebhookEvent

    try {
      payload = wh.verify(rawBody, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid webhook signature' }, 
        { status: 401 }
      )
    }

    const eventType = payload.type
    console.log(`📋 Processing event: ${eventType}`)

    // Handle user creation and updates
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const user = payload.data
      
      if (!user?.id) {
        console.error('❌ Missing user ID in webhook payload')
        return NextResponse.json(
          { error: 'Invalid user data' }, 
          { status: 400 }
        )
      }

      const userId = user.id
      const userEmail = user.email_addresses?.[0]?.email_address ?? ''
      const createdAt = user.created_at 
        ? new Date(user.created_at).toISOString()
        : new Date().toISOString()

      console.log(`👤 User ${eventType}: ${userId} (${userEmail})`)

      // TODO: Add your database operations here
      // Example with Supabase:
      /*
      const { error } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email: userEmail,
          created_at: createdAt,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error
      */

      console.log(`✅ Successfully processed ${eventType}`)
      return NextResponse.json({ success: true, event: eventType })
    }

    // Handle user deletion
    if (eventType === 'user.deleted') {
      const user = payload.data
      
      if (!user?.id) {
        console.error('❌ Missing user ID in deletion webhook')
        return NextResponse.json(
          { error: 'Invalid user data' }, 
          { status: 400 }
        )
      }

      console.log(`🗑️ User deleted: ${user.id}`)

      // TODO: Clean up user data in your database
      // Example with Supabase:
      /*
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id)
      */

      console.log(`✅ Successfully deleted user: ${user.id}`)
      return NextResponse.json({ success: true, event: eventType })
    }

    // Log unhandled events
    console.log(`ℹ️ Unhandled event type: ${eventType}`)
    return NextResponse.json({ ignored: true, event: eventType })

  } catch (err: any) {
    console.error('❌ Webhook processing error:', err)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: err.message 
    }, { status: 500 })
  }
}
