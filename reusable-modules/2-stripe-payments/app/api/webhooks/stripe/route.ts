// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

/**
 * Stripe Webhook Handler
 * Handles payment and subscription events
 * 
 * Setup:
 * 1. Go to Stripe Dashboard → Developers → Webhooks
 * 2. Add endpoint: https://yourdomain.com/api/webhooks/stripe
 * 3. Select events:
 *    - checkout.session.completed
 *    - customer.subscription.created
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - invoice.payment_succeeded
 *    - invoice.payment_failed
 * 4. Copy webhook secret to .env.local
 */
export async function POST(request: NextRequest) {
  console.log('💳 Stripe webhook received')
  
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')!

    let event: Stripe.Event

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        WEBHOOK_SECRET
      )
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`📋 Processing event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Payment successful - activate subscription
        console.log('✅ Checkout completed:', {
          customerId: session.customer,
          subscriptionId: session.subscription,
          userId: session.client_reference_id,
          email: session.customer_email,
        })

        // TODO: Update database with subscription details
        /*
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
            plan_type: session.metadata?.planType || 'basic',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.client_reference_id)
        */
        
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log(`📝 Subscription ${event.type}:`, {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        })

        // TODO: Update subscription status in database
        /*
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        */
        
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log('🗑️ Subscription canceled:', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        })

        // TODO: Mark subscription as canceled
        /*
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        */
        
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        console.log('💰 Payment succeeded:', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
        })

        // TODO: Log successful payment
        /*
        await supabaseAdmin
          .from('payment_history')
          .insert({
            user_id: invoice.metadata?.userId,
            stripe_payment_id: invoice.payment_intent,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'succeeded',
          })
        */
        
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        console.log('❌ Payment failed:', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_due / 100,
        })

        // TODO: Handle failed payment (notify user, update status)
        /*
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer)
        */
        
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
    
  } catch (error: any) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed', message: error.message },
      { status: 500 }
    )
  }
}
