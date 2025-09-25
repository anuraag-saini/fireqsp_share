// lib/auth.ts
import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Require authentication for API routes
 * Throws an error if user is not authenticated
 * @returns Authenticated user object from Clerk
 */
export async function requireAuth() {
  const user = await currentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

/**
 * Handle authentication errors consistently
 * @param error - Error object to handle
 * @returns NextResponse with appropriate error
 */
export function handleAuthError(error: unknown) {
  console.error('Auth error:', error)
  
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

/**
 * Simple in-memory rate limiter
 * Note: For production, consider Redis-based rate limiting
 * @param requests - Maximum number of requests allowed
 * @param window - Time window in milliseconds
 * @returns Rate limit checker function
 */
export function createRateLimit(requests = 10, window = 60000) {
  const requests_map = new Map<string, number[]>()
  
  return (identifier: string): boolean => {
    const now = Date.now()
    const requests_in_window = requests_map.get(identifier) || []
    
    // Remove old requests outside the time window
    const recent_requests = requests_in_window.filter(
      (time: number) => now - time < window
    )
    
    // Check if rate limit exceeded
    if (recent_requests.length >= requests) {
      return false
    }
    
    // Add current request timestamp
    recent_requests.push(now)
    requests_map.set(identifier, recent_requests)
    
    return true
  }
}

/**
 * Check if user has admin role
 * Requires admin role to be set in Clerk user metadata
 * @param userId - User ID to check
 * @returns True if user is admin
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false
  
  const user = await currentUser()
  
  if (!user) return false
  
  // Check public metadata for admin role
  // Set this in Clerk Dashboard: User → Metadata → Public metadata
  // Example: { "role": "admin" }
  return user.publicMetadata?.role === 'admin'
}

/**
 * Get user email from Clerk user object
 * @param user - Clerk user object
 * @returns Primary email address
 */
export function getUserEmail(user: any): string {
  return user?.emailAddresses?.[0]?.emailAddress || ''
}

/**
 * Get user ID safely
 * @param user - Clerk user object
 * @returns User ID or empty string
 */
export function getUserId(user: any): string {
  return user?.id || ''
}
