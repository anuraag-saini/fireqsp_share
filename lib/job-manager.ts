// lib/job-manager.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class JobManager {
  static async createJob(userId: string, fileCount: number): Promise<string> {
    // Check concurrency limits
    const activeJobs = await this.getActiveJobCount(userId)
    const limits = await this.getUserLimits(userId) 
    
    if (activeJobs >= limits.maxConcurrentJobs) {
      throw new Error('Concurrent job limit reached')
    }
    
    // Create job record
    const { data, error } = await supabase
      .from('extraction_jobs')
      .insert({
        user_id: userId,
        total_files: fileCount,
        status: 'queued'
      })
      .select('id')
      .single()
      
    if (error) throw new Error('Failed to create job')
    return data.id
  }
  
  static async getActiveJobCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('extraction_jobs')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .in('status', ['queued', 'processing'])
      
    return count || 0
  }
  
  static async getUserLimits(userId: string): Promise<{maxConcurrentJobs: number, plan: string}> {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .single()
      
    if (!data) return { maxConcurrentJobs: 1, plan: 'trial' }
    
    // Set limits based on plan
    const limits = {
      trial: 999, // unlimited during trial
      basic: 1,
      pro: 3, 
      enterprise: 5
    }
    
    return {
      maxConcurrentJobs: limits[data.plan_type as keyof typeof limits] || 1,
      plan: data.plan_type
    }
  }
  
  static async updateJobProgress(jobId: string, updates: {
    files_processed?: number
    files_successful?: number
    files_failed?: number
    current_file?: string
    interactions_found?: number
    failed_files?: string[]
    status?: string
    extraction_id?: string
  }): Promise<void> {
    const updateData: any = { ...updates }
    
    if (updates.status === 'processing') {
      updateData.started_at = new Date().toISOString()
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString()
    }
    
    await supabase
      .from('extraction_jobs')
      .update(updateData)
      .eq('id', jobId)
  }
}