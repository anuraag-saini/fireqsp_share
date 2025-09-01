// app/api/subscription/status/route.ts - FIXED EMAIL FETCH
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { handleAuthError } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Checking status for user:', userId)

    // Check if user exists
    const { data: existing } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    // If user doesn't exist, create trial WITH EMAIL
    if (!existing) {
      console.log('👤 Creating new user...')
      
      let userEmail = 'email-fetch-failed'
      
      try {
        // console.log('📞 Calling Clerk API...')
        const { clerkClient } = await import('@clerk/nextjs/server')
        const client = await clerkClient()
        const clerkUser = await client.users.getUser(userId)
        
        // console.log('📋 Clerk user data:', {
        //   id: clerkUser.id,
        //   emailAddresses: clerkUser.emailAddresses?.length || 0,
        //   primaryEmail: clerkUser.primaryEmailAddressId
        // })
        
        if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
          userEmail = clerkUser.emailAddresses[0].emailAddress
          // console.log('✅ Got email from Clerk:', userEmail)
        } else {
          // console.log('⚠️ No email addresses found in Clerk user')
          userEmail = 'no-email-in-clerk'
        }
        
      } catch (clerkError) {
        console.error('❌ Clerk API error:', clerkError)
        userEmail = `clerk-error-${Date.now()}`
      }

      // console.log('💾 Creating user with email:', userEmail)

      // Create user with email (whatever we got)
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          user_email: userEmail,
          plan_type: 'trial',
          status: 'active',
          trial_start_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .select()

      if (insertError) {
        console.error('❌ Supabase insert error:', insertError)
        throw insertError
      }

      // console.log('✅ User created:', newUser)

      // Create user usage
      try {
        await supabaseAdmin
          .from('user_usage')
          .insert({
            user_id: userId,
            extraction_count: 0,
            current_month: new Date().toISOString().slice(0, 7),
            updated_at: new Date().toISOString()
          })
        // console.log('✅ User usage created')
      } catch (usageError) {
        console.error('⚠️ User usage creation failed:', usageError)
      }
      
      return NextResponse.json({ 
        plan: 'trial', 
        canUpload: true, 
        maxPdfs: 999, 
        maxExtractions: 999 
      })
    }
    
    // REST OF YOUR EXISTING CODE...
    const trialStart = new Date(existing.trial_start_date || existing.created_at)
    const now = new Date()
    const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24))

    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: usage } = await supabaseAdmin
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .single()

    let currentUsage = 0
    if (usage && usage.current_month === currentMonth) {
        currentUsage = usage.extraction_count
    }
    
    if (existing.plan_type === 'trial' && daysSinceStart < 14) {
      return NextResponse.json({ plan: 'trial', canUpload: true, maxPdfs: 999, maxExtractions: 99999, currentUsage })
    }
    
    if (existing.plan_type === 'basic') {
      return NextResponse.json({ plan: 'basic', canUpload: currentUsage < 5, maxPdfs: 5, maxExtractions: 5, currentUsage })
    }
    
    if (existing.plan_type === 'pro') {
      return NextResponse.json({ plan: 'pro', canUpload: true, maxPdfs: 999, maxExtractions: 99999 })
    }
 
    return NextResponse.json({ plan: 'expired', canUpload: false, maxPdfs: 1, maxExtractions: 1 })
    
  } catch (error) {
    console.error('❌ Subscription status error:', error)
    return handleAuthError(error)
  }
}