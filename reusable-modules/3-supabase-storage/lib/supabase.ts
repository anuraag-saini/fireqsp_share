// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase-types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Client for frontend use (with RLS - Row Level Security)
 * Use this in client components
 * Automatically enforces user permissions via RLS policies
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Admin client for backend use (bypasses RLS)
 * Use this ONLY in:
 * - API routes
 * - Server components
 * - Server actions
 * 
 * This client has full access to the database
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl, 
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Create a Supabase client with custom auth token
 * Useful for user-specific operations in API routes
 */
export function createSupabaseClient(authToken: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }
  })
}
