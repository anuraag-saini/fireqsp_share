import { supabaseAdmin } from './supabase'
import type { Database } from './supabase'
import { Interaction } from './prompts'
import { extractDiseaseTypeFromPages } from './extraction'

type Extraction = Database['public']['Tables']['extractions']['Row']
type ExtractionInsert = Database['public']['Tables']['extractions']['Insert']

export class SupabaseExtraction {
  // Centralized function to update disease type and title - SINGLE SOURCE OF TRUTH
  static async updateExtractionTitleAndDisease(
    extractionId: string,
    interactions: any[] = [],
    allPages: any[] = []
  ): Promise<{ diseaseType: string, title: string }> {
    let diseaseType = 'General'
    let title = 'General'
    
    console.log('🔍 Updating title and disease type...')
    
    try {
      if (interactions.length > 0) {
        // Create sample pages from interactions for disease detection
        const samplePages = interactions.slice(0, 5).map((int: any, index: number) => ({
          page_content: int.reference_text || int.details || int.mechanism,
          metadata: { page: index + 1, file_name: int.filename || 'unknown' }
        }))
        
        const { diseaseType: detectedType } = await extractDiseaseTypeFromPages(samplePages)
        // Use the detected disease type as both diseaseType and title
        diseaseType = detectedType || 'General'
        title = diseaseType
        
      } else if (allPages.length > 0) {
        // Fallback: use actual pages if no interactions
        const { diseaseType: detectedType } = await extractDiseaseTypeFromPages(allPages.slice(0, 3))
        diseaseType = detectedType || 'General'
        title = diseaseType
      }
      
    } catch (error) {
      console.error('Disease type detection failed:', error)
      diseaseType = 'General'
      title = 'General'
    }
    
    // Update the extraction record
    await supabaseAdmin
      .from('extractions')
      .update({
        title: title,
        disease_type: diseaseType,
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)
    
    console.log(`✅ Updated extraction ${extractionId}: title="${title}", diseaseType="${diseaseType}"`)
    
    return { diseaseType, title }
  }

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

  // Save complete extraction results - now supports 'partial' status
  static async saveExtractionResults(
    extractionId: string, 
    interactions: Interaction[], 
    references: Record<string, string>,
    errors: string[],
    status: 'completed' | 'partial' | 'failed' | 'processing' = 'completed'  // Added 'partial'
  ): Promise<void> {
    // First save the data
    const { error } = await supabaseAdmin
      .from('extractions')
      .update({
        status: status,
        interaction_count: interactions.length,
        interactions: interactions,
        source_references: references,
        errors: errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)
    
    if (error) throw error

    // Then update disease type and title based on the results
    await this.updateExtractionTitleAndDisease(extractionId, interactions)
  }

  // New helper method to complete extraction with proper disease type - supports 'partial'
  static async completeExtraction(
    extractionId: string,
    interactions: Interaction[],
    references: Record<string, string>,
    errors: string[],
    allPages: any[] = [],
    status: 'completed' | 'partial' = 'completed'  // Added 'partial'
  ): Promise<{ diseaseType: string, title: string }> {
    
    // Save results first
    await supabaseAdmin
      .from('extractions')
      .update({
        status: status,
        interaction_count: interactions.length,
        interactions: interactions,
        source_references: references,
        errors: errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)

    // Then update disease type and title
    return await this.updateExtractionTitleAndDisease(extractionId, interactions, allPages)
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