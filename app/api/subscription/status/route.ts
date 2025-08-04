import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user exists in our tables
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    // If user doesn't exist, create trial
    if (!existing) {
      await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'trial'
        })
      
      await supabaseAdmin
        .from('user_usage')
        .insert({
          user_id: userId,
          extraction_count: 0
        })
      
      return NextResponse.json({ 
        plan: 'trial', 
        canUpload: true, 
        maxPdfs: 999, 
        maxExtractions: 999 
      })
    }
    
    // Check if trial expired (14 days)
    const trialStart = new Date(existing.trial_start_date)
    const now = new Date()
    const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24))

    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: usage } = await supabaseAdmin
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .single()
    // Get current usage count (reset if different month)
    let currentUsage = 0
    if (usage) {
        if (usage.current_month === currentMonth) {
            currentUsage = usage.extraction_count
        }
        // If different month, usage is 0 (will be reset on next extraction)
    }
    
    // Simple logic
    if (existing.plan_type === 'trial' && daysSinceStart < 14) {
      return NextResponse.json({ plan: 'trial', canUpload: true, maxPdfs: 999, maxExtractions: 99999, currentUsage: currentUsage })
    }
    
    if (existing.plan_type === 'basic') {
      return NextResponse.json({ plan: 'basic', canUpload: currentUsage < 5, maxPdfs: 5, maxExtractions: 5, currentUsage: currentUsage })
    }
    
    if (existing.plan_type === 'pro') {
      return NextResponse.json({ plan: 'pro', canUpload: true, maxPdfs: 999, maxExtractions: 99999 })
    }
 
    // Trial expired, no paid plan
    return NextResponse.json({ plan: 'expired', canUpload: false, maxPdfs: 1, maxExtractions: 1 })
    
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}