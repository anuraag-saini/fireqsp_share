import { supabaseAdmin } from './supabase'

export async function incrementUserExtraction(userId: string) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) // "2025-07"
    
    // Get current usage
    const { data: usage } = await supabaseAdmin
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!usage) {
      // Create new usage record
      await supabaseAdmin
        .from('user_usage')
        .insert({
          user_id: userId,
          extraction_count: 1,
          current_month: currentMonth
        })
      console.log('Created new usage record for user:', userId)
      return
    }
    
    // Check if it's a new month
    if (usage.current_month !== currentMonth) {
      // Reset count for new month
      await supabaseAdmin
        .from('user_usage')
        .update({
          extraction_count: 1,
          current_month: currentMonth,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      console.log('Reset monthly usage for user:', userId, 'new month:', currentMonth)
    } else {
      // Increment existing count
      await supabaseAdmin
        .from('user_usage')
        .update({
          extraction_count: usage.extraction_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      console.log('Incremented usage for user:', userId, 'count:', usage.extraction_count + 1)
    }
    
  } catch (error) {
    console.error('Error tracking usage:', error)
  }
}