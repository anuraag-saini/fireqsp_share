import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICE_IDS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { planType, successUrl, cancelUrl, userEmail } = await request.json()
    
    if (!planType) {
      return NextResponse.json({ error: 'Plan type is required' }, { status: 400 })
    }
    
    // Map plan type to actual Stripe price ID
    let priceId: string
    switch (planType) {
      case 'basic':
        priceId = PRICE_IDS.BASIC
        break
      case 'pro':
        priceId = PRICE_IDS.PRO
        break
      case 'enterprise':
        priceId = PRICE_IDS.ENTERPRISE
        break
      default:
        return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userEmail: userEmail,
        planType: planType,
      },
    })
    
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}