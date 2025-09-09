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

// Updated Database types - now includes separate interactions table
export interface Database {
  public: {
    Tables: {
      extractions: {
        Row: {
          id: string
          user_id: string
          title: string
          status: 'processing' | 'completed' | 'failed' | 'partial'
          file_count: number
          interaction_count: number
          created_at: string
          updated_at: string
          // Interactions are now in separate table - no JSON column
          source_references: Record<string, string> | null
          errors: string[] | null
          // Additional fields
          job_id: string | null
          disease_type: string | null
        }
        Insert: Omit<Database['public']['Tables']['extractions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['extractions']['Insert']>
      }
      // NEW: Separate interactions table for better performance
      interactions: {
        Row: {
          id: string
          extraction_id: string
          mechanism: string
          source_name: string
          source_level: string
          target_name: string
          target_level: string
          interaction_type: string
          details: string
          confidence: string
          reference_text: string
          page_number: string
          filename: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['interactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['interactions']['Insert']>
      }
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
      extraction_jobs: {
        Row: {
          id: string
          user_id: string
          status: string
          total_files: number
          files_processed: number
          files_successful: number
          files_failed: number
          current_file: string | null
          interactions_found: number
          failed_files: string[] | null
          created_at: string
          started_at: string | null
          completed_at: string | null
          extraction_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['extraction_jobs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['extraction_jobs']['Insert']>
      }
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