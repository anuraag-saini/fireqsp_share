// lib/auth.ts
import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function requireAuth() {
  const user = await currentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

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

// Rate limiting helper (optional)
export function createRateLimit(requests = 10, window = 60000) {
  const requests_map = new Map()
  
  return (identifier: string) => {
    const now = Date.now()
    const requests_in_window = requests_map.get(identifier) || []
    
    // Remove old requests
    const recent_requests = requests_in_window.filter(
      (time: number) => now - time < window
    )
    
    if (recent_requests.length >= requests) {
      return false
    }
    
    recent_requests.push(now)
    requests_map.set(identifier, recent_requests)
    
    return true
  }
}
