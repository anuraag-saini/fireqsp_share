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

// Updated Database types - now includes 'partial' status
export interface Database {
  public: {
    Tables: {
      extractions: {
        Row: {
          id: string
          user_id: string
          title: string
          status: 'processing' | 'completed' | 'failed' | 'partial'  // Added 'partial'
          file_count: number
          interaction_count: number
          created_at: string
          updated_at: string
          // Store everything as JSON
          interactions: any[] | null
          source_references: Record<string, string> | null
          errors: string[] | null
          // Additional fields
          job_id: string | null
          disease_type: string | null
        }
        Insert: Omit<Database['public']['Tables']['extractions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['extractions']['Insert']>
      }
      // Add system_settings table we created earlier
      system_settings: {
        Row: {
          id: number
          openai_model: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['system_settings']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['system_settings']['Insert']>
      }
      // Add user_subscriptions if not already there
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          user_email: string
          plan_type: string
          status: string
          granted_by_admin: boolean | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_subscriptions']['Insert']>
      }
    }
  }
}