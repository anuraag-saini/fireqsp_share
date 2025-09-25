// app/api/stripe/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPriceId } from '@/lib/stripe'
import { requireAuth } from '@/lib/auth'

/**
 * Create Stripe Checkout Session
 * 
 * POST /api/stripe/create-checkout
 * Body: {
 *   planType: 'basic' | 'pro' | 'enterprise',
 *   successUrl?: string,
 *   cancelUrl?: string,
 *   userEmail?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth()
    
    const body = await request.json()
    const { planType, successUrl, cancelUrl, userEmail } = body
    
    // Validate plan type
    if (!planType) {
      return NextResponse.json(
        { error: 'Plan type is required' },
        { status: 400 }
      )
    }
    
    // Get Stripe price ID
    const priceId = getPriceId(planType)
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      )
    }

    // Get user email (from Clerk or provided)
    const email = userEmail || user.emailAddresses?.[0]?.emailAddress || ''
    
    // Default URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const defaultSuccessUrl = `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`
    const defaultCancelUrl = `${appUrl}/pricing?canceled=true`
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      customer_email: email,
      client_reference_id: user.id, // Store user ID for webhook processing
      metadata: {
        userId: user.id,
        userEmail: email,
        planType: planType,
      },
    })
    
    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    })
    
  } catch (error) {
    console.error('❌ Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
