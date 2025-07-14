import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for frontend (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for backend (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Simplified Database types - single table with JSON columns
export interface Database {
  public: {
    Tables: {
      extractions: {
        Row: {
          id: string
          user_id: string
          title: string
          status: 'processing' | 'completed' | 'failed'
          file_count: number
          interaction_count: number
          created_at: string
          updated_at: string
          // NEW: Store everything as JSON - no more flattening!
          interactions: any[] | null
          source_references: Record<string, string> | null
          errors: string[] | null
        }
        Insert: Omit<Database['public']['Tables']['extractions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['extractions']['Insert']>
      }
    }
  }
}