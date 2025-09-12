import { supabaseAdmin } from './supabase'
import type { Database } from './supabase'
import { Interaction } from './prompts'
import { extractDiseaseTypeFromPages } from './extraction'

type Extraction = Database['public']['Tables']['extractions']['Row']
type ExtractionInsert = Database['public']['Tables']['extractions']['Insert']

export class SupabaseExtraction {
  // Save interactions to separate table for better performance
  static async saveInteractions(extractionId: string, interactions: Interaction[]): Promise<void> {
    if (interactions.length === 0) return
    
    // Convert interactions to database format
    const interactionRows = interactions.map(interaction => ({
      extraction_id: extractionId,
      mechanism: interaction.mechanism,
      source_name: interaction.source.name,
      source_level: interaction.source.level,
      target_name: interaction.target.name,
      target_level: interaction.target.level,
      interaction_type: interaction.interaction_type,
      details: interaction.details,
      confidence: interaction.confidence || 'medium',
      reference_text: interaction.reference_text || '',
      page_number: interaction.page_number || '',
      filename: interaction.filename || ''
    }))
    
    const { error } = await supabaseAdmin
      .from('interactions')
      .insert(interactionRows)
    
    if (error) {
      console.error('Error saving interactions:', error)
      throw error
    }
    
    console.log(`✅ Saved ${interactions.length} interactions to separate table`)
  }
  
  // Get interactions for an extraction from separate table
  static async getInteractions(extractionId: string): Promise<Interaction[]> {
    const { data, error } = await supabaseAdmin
      .from('interactions')
      .select('*')
      .eq('extraction_id', extractionId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching interactions:', error)
      throw error
    }
    
    // Convert back to Interaction format
    return (data || []).map(row => ({
      id: row.id,
      mechanism: row.mechanism,
      source: {
        name: row.source_name,
        level: row.source_level
      },
      target: {
        name: row.target_name,
        level: row.target_level
      },
      interaction_type: row.interaction_type as any,
      details: row.details,
      confidence: row.confidence as any,
      reference_text: row.reference_text,
      page_number: row.page_number,
      filename: row.filename
    }))
  }

  // Get extraction with interactions from separate table
  static async getExtractionWithInteractions(extractionId: string): Promise<{ extraction: Extraction | null, interactions: Interaction[] }> {
    const extraction = await this.getExtraction(extractionId)
    if (!extraction) {
      return { extraction: null, interactions: [] }
    }
    
    const interactions = await this.getInteractions(extractionId)
    return { extraction, interactions }
  }

  // Centralized function to update disease type and title
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

  // Update extraction
  static async updateExtraction(id: string, updates: Partial<ExtractionInsert>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('extractions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  }

  // NEW: Save extraction results using separate table (recommended)
  static async saveExtractionResultsNew(
    extractionId: string, 
    interactions: Interaction[], 
    references: Record<string, string>,
    errors: string[],
    status: 'completed' | 'partial' | 'failed' | 'processing' = 'completed'
  ): Promise<void> {
    // Save interactions to separate table
    await this.saveInteractions(extractionId, interactions)
    
    // Update extraction summary (no interactions JSON)
    const { error } = await supabaseAdmin
      .from('extractions')
      .update({
        status: status,
        interaction_count: interactions.length,
        source_references: references,
        errors: errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)
    
    if (error) throw error
    console.log(`✅ Saved extraction results: ${interactions.length} interactions, status: ${status}`)
  }

  // LEGACY: Keep old method for backward compatibility (no interactions column)
  static async saveExtractionResults(
    extractionId: string, 
    interactions: Interaction[], 
    references: Record<string, string>,
    errors: string[],
    status: 'completed' | 'partial' | 'failed' | 'processing' = 'completed'
  ): Promise<void> {
    // Save interactions to separate table
    await this.saveInteractions(extractionId, interactions)
    
    // Update extraction summary (no interactions JSON)
    const { error } = await supabaseAdmin
      .from('extractions')
      .update({
        status: status,
        interaction_count: interactions.length,
        source_references: references,
        errors: errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)
    
    if (error) throw error
    await this.updateExtractionTitleAndDisease(extractionId, interactions)
  }

  // NEW: Complete extraction with separate table
  static async completeExtractionNew(
    extractionId: string,
    interactions: Interaction[],
    references: Record<string, string>,
    errors: string[],
    allPages: any[] = [],
    status: 'completed' | 'partial' = 'completed'
  ): Promise<{ diseaseType: string, title: string }> {
    await this.saveExtractionResultsNew(extractionId, interactions, references, errors, status)
    return await this.updateExtractionTitleAndDisease(extractionId, interactions, allPages)
  }

  // LEGACY: Keep old method for backward compatibility (no interactions column)
  static async completeExtraction(
    extractionId: string,
    interactions: Interaction[],
    references: Record<string, string>,
    errors: string[],
    allPages: any[] = [],
    status: 'completed' | 'partial' = 'completed'
  ): Promise<{ diseaseType: string, title: string }> {
    // Save interactions to separate table
    await this.saveInteractions(extractionId, interactions)
    
    // Update extraction summary (no interactions JSON)
    await supabaseAdmin
      .from('extractions')
      .update({
        status: status,
        interaction_count: interactions.length,
        source_references: references,
        errors: errors,
        updated_at: new Date().toISOString()
      })
      .eq('id', extractionId)

    return await this.updateExtractionTitleAndDisease(extractionId, interactions, allPages)
  }

  // Get extraction data
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

  // Get user's extraction history - OPTIMIZED for performance
  static async getUserExtractions(userId: string): Promise<Partial<Extraction>[]> {
    const { data, error } = await supabaseAdmin
      .from('extractions')
      .select('id, title, status, file_count, interaction_count, created_at, updated_at, disease_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user extractions:', error)
      throw error
    }
    return data || []
  }

  // Delete extraction and its interactions
  static async deleteExtraction(id: string): Promise<void> {
    // Delete in correct order: jobs first, then interactions, then extraction
    
    // 1. Delete related extraction_jobs first
    const { error: jobError } = await supabaseAdmin
      .from('extraction_jobs')
      .delete()
      .eq('extraction_id', id)
    
    if (jobError) {
      console.error('Error deleting extraction jobs:', jobError)
      // Continue anyway - job might not exist
    }
    
    // 2. Delete interactions (should cascade but let's be explicit)
    const { error: interactionError } = await supabaseAdmin
      .from('interactions')
      .delete()
      .eq('extraction_id', id)
    
    if (interactionError) {
      console.error('Error deleting interactions:', interactionError)
      // Continue anyway
    }
    
    // 3. Finally delete the extraction
    const { error } = await supabaseAdmin
      .from('extractions')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Simple in-memory cache
  private static cache = new Map<string, { data: any; expires: number }>()

  static getCachedResult(cacheKey: string): any | null {
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      console.log('✅ Found valid cache for key:', cacheKey)
      return cached.data
    }
    
    if (cached) {
      this.cache.delete(cacheKey)
    }
    
    return null
  }

  static setCachedResult(cacheKey: string, data: any, ttlHours: number = 24): void {
    const expires = Date.now() + (ttlHours * 60 * 60 * 1000)
    this.cache.set(cacheKey, { data, expires })
    console.log('✅ Cached result for key:', cacheKey)
  }
}
