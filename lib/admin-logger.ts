// lib/admin-logger.ts
import { supabase } from '@/lib/supabase'

interface AdminActivity {
  adminUserId: string
  adminEmail: string
  action: string
  targetUserId?: string
  targetUserEmail?: string
  details?: any
  ipAddress?: string
}

export async function logAdminActivity({
  adminUserId,
  adminEmail,
  action,
  targetUserId,
  targetUserEmail,
  details,
  ipAddress
}: AdminActivity) {
  try {
    await supabase
      .from('admin_activities')
      .insert({
        admin_user_id: adminUserId,
        admin_email: adminEmail,
        action,
        target_user_id: targetUserId,
        target_user_email: targetUserEmail,
        details,
        ip_address: ipAddress
      })
  } catch (error) {
    console.error('Failed to log admin activity:', error)
  }
}

// Usage examples:
// logAdminActivity({
//   adminUserId: user.id,
//   adminEmail: user.emailAddresses[0].emailAddress,
//   action: 'USER_SUSPENDED',
//   targetUserId: 'user_123',
//   targetUserEmail: 'user@example.com',
//   details: { reason: 'Policy violation' }
// })

// Updated admin users route with logging
// app/api/admin/users/route.ts (add this to the POST handler)

// Add this import at the top
// import { logAdminActivity } from '@/lib/admin-logger'

// In the POST handler, after each action:
/*
await logAdminActivity({
  adminUserId: user.id,
  adminEmail: user.emailAddresses[0]?.emailAddress || '',
  action: action.toUpperCase(),
  targetUserId: userId,
  details: { action, timestamp: new Date().toISOString() }
})
*/