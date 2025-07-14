import { supabaseAdmin } from './supabase'
import type { Database } from './supabase'
import { Interaction } from './prompts'

type Extraction = Database['public']['Tables']['extractions']['Row']
type ExtractionInsert = Database['public']['Tables']['extractions']['Insert']

export class SupabaseExtraction {
  // Create new extraction session
  static async createExtraction(data: ExtractionInsert): Promise<Extraction> {
    const { data: extraction, error } = await supabaseAdmin
      .from('extractions')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return extraction
  }

  // Update extraction - now much simpler!
  static async updateExtraction(id: string, updates: Partial<ExtractionInsert>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('extractions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  }

  // Save complete extraction results (interactions + references + errors) in one go
  static async saveExtractionResults(
    extractionId: string, 
    interactions: Interaction[], 
    references: Record<string, string>,
    errors: string[]
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('extractions')
      .update({
        status: 'completed',
        interaction_count: interactions.length,
        interactions: interactions,  // Store as JSON directly!
        source_references: references,  // Store as JSON directly!
        errors: errors,  // Store as JSON directly!
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)
    
    if (error) throw error
  }

  // Get extraction with all data - no transformation needed!
  static async getExtraction(extractionId: string): Promise<Extraction | null> {
    const { data, error } = await supabaseAdmin
      .from('extractions')
      .select('*')
      .eq('id', extractionId)
      .single()

    if (error) {
      console.error('Error fetching extraction:', error)
      return null
    }

    return data
  }

  // Get user's extraction history for sidebar
  static async getUserExtractions(userId: string): Promise<Extraction[]> {
    const { data, error } = await supabaseAdmin
      .from('extractions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Delete extraction
  static async deleteExtraction(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('extractions')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Simple in-memory cache (replaces complex database cache)
  private static cache = new Map<string, { data: any; expires: number }>()

  static getCachedResult(cacheKey: string): any | null {
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      console.log('✅ Found valid cache for key:', cacheKey)
      return cached.data
    }
    
    if (cached) {
      this.cache.delete(cacheKey) // Remove expired cache
    }
    
    return null
  }

  static setCachedResult(cacheKey: string, data: any, ttlHours: number = 24): void {
    const expires = Date.now() + (ttlHours * 60 * 60 * 1000)
    this.cache.set(cacheKey, { data, expires })
    console.log('✅ Cached result for key:', cacheKey)
  }
}