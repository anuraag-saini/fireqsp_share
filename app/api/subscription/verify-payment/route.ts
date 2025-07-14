import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const { sessionId } = await request.json()
    
    if (!userId || !sessionId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }
    
    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }
    
    // Get the plan type from metadata
    const planType = session.metadata?.planType
    
    if (!planType) {
      return NextResponse.json({ error: 'Plan type not found' }, { status: 400 })
    }
    
    console.log('Updating user plan:', userId, 'to:', planType)
    
    // Update user's plan in Supabase
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ 
        plan_type: planType,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, planType })
    
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}