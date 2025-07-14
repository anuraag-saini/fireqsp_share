import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // When user signs up, create trial record
    if (data.type === 'user.created') {
      const userId = data.data.id
      
      console.log('New user signed up:', userId)
      
      // Create trial subscription
      await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'trial'
        })
      
      // Create usage tracking
      await supabaseAdmin
        .from('user_usage')
        .insert({
          user_id: userId,
          extraction_count: 0
        })
      
      console.log('Trial created for user:', userId)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}