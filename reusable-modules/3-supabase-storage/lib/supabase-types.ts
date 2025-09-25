// lib/supabase-types.ts

/**
 * Database type definitions
 * Generate these automatically with: npx supabase gen types typescript --local
 * Or manually define based on your schema
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          user_email: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan_type: string
          status: string
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_subscriptions']['Insert']>
      }
      user_content: {
        Row: {
          id: string
          user_id: string
          title: string
          content: Record<string, any> | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_content']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_content']['Insert']>
      }
    }
    Views: {
      // Add any database views here
    }
    Functions: {
      // Add any database functions here
    }
    Enums: {
      // Add any enums here
    }
  }
}

// Type helpers for easier use
export type User = Database['public']['Tables']['users']['Row']
export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row']
export type UserContent = Database['public']['Tables']['user_content']['Row']

export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserSubscriptionInsert = Database['public']['Tables']['user_subscriptions']['Insert']
export type UserContentInsert = Database['public']['Tables']['user_content']['Insert']

export type UserUpdate = Database['public']['Tables']['users']['Update']
export type UserSubscriptionUpdate = Database['public']['Tables']['user_subscriptions']['Update']
export type UserContentUpdate = Database['public']['Tables']['user_content']['Update']
