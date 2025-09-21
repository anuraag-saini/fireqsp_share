import { getPromptForDiseaseType, EXTRACTION_CONFIG, type DocumentPage, type Interaction } from './prompts'
import { callOpenAI } from './openai-shim'

export interface ExtractionProgress {
  fileIndex: number
  fileName: string
  totalFiles: number
  status: 'processing' | 'completed' | 'failed'
  batchIndex?: number
  totalBatches?: number
}

export interface ExtractionResult {
  interactions: Interaction[]
  errors: string[]
  stats: {
    totalBatches: number
    successfulBatches: number
    failedBatches: number
    timeoutBatches: number
    totalPages: number
    processedPages: number
  }
}

async function checkJobStatus(jobId?: string): Promise<boolean> {
  if (!jobId) return true
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data } = await supabase
      .from('extraction_jobs')
      .select('status')
      .eq('id', jobId)
      .single()
    
    return ['processing', 'queued'].includes(data?.status)
  } catch (error) {
    return false
  }
}

function validateInteraction(interaction: any, index: number): Interaction | null {
  try {
    if (!interaction?.mechanism || !interaction?.source?.name || !interaction?.target?.name) {
      return null
    }
    
    return {
      id: interaction.id || Math.random().toString(36).substr(2, 9),
      mechanism: interaction.mechanism,
      source: {
        name: interaction.source.name,
        level: interaction.source.level || 'Molecular'
      },
      target: {
        name: interaction.target.name,
        level: interaction.target.level || 'Molecular'
      },
      interaction_type: interaction.interaction_type || 'activation',
      details: interaction.details || '',
      confidence: interaction.confidence || 'medium',
      reference_text: interaction.reference_text || '',
      page_number: interaction.page_number || '',
      filename: interaction.filename || ''
    }
  } catch (error) {
    return null
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`TIMEOUT: ${operation} timed out after ${timeoutMs / 1000} seconds`))
    }, timeoutMs)
  })
  
  return Promise.race([promise, timeoutPromise])
}

export async function extractInteractionsFromPages(
  documentPages: DocumentPage[], 
  diseaseType: string,
  onProgress?: (progress: ExtractionProgress) => void,
  jobId?: string
): Promise<ExtractionResult> {
  
  const extractedInteractions: Interaction[] = []
  const extractionErrors: string[] = []
  const stats = {
    totalBatches: 0,
    successfulBatches: 0,
    failedBatches: 0,
    timeoutBatches: 0,
    totalPages: documentPages.length,
    processedPages: 0
  }
  
  const pagesByFile = groupPagesByFile(documentPages)
  const fileNames = Object.keys(pagesByFile)
  
  for (let fileIndex = 0; fileIndex < fileNames.length; fileIndex++) {
    const fileName = fileNames[fileIndex]
    const filePages = pagesByFile[fileName]
    
    if (jobId && !await checkJobStatus(jobId)) {
      extractionErrors.push(`Job ${jobId} was cancelled`)
      break
    }
    
    onProgress?.({
      fileIndex,
      fileName,
      totalFiles: fileNames.length,
      status: 'processing'
    })
    
    try {
      const result = await processFilePages(filePages, diseaseType, fileName, jobId)
      extractedInteractions.push(...result.interactions)
      extractionErrors.push(...result.errors)
      
      stats.totalBatches += result.stats.totalBatches
      stats.successfulBatches += result.stats.successfulBatches
      stats.failedBatches += result.stats.failedBatches
      stats.timeoutBatches += result.stats.timeoutBatches
      stats.processedPages += result.stats.processedPages
      
      onProgress?.({
        fileIndex,
        fileName,
        totalFiles: fileNames.length,
        status: 'completed'
      })
      
    } catch (error) {
      extractionErrors.push(`Failed to process ${fileName}: ${error}`)
      
      onProgress?.({
        fileIndex,
        fileName,
        totalFiles: fileNames.length,
        status: 'failed'
      })
    }
  }
  
  return { 
    interactions: extractedInteractions, 
    errors: extractionErrors,
    stats
  }
}

async function processFilePages(
  pages: DocumentPage[], 
  diseaseType: string, 
  fileName: string,
  jobId?: string
): Promise<ExtractionResult> {
  
  const interactions: Interaction[] = []
  const errors: string[] = []
  const stats = {
    totalBatches: 0,
    successfulBatches: 0,
    failedBatches: 0,
    timeoutBatches: 0,
    totalPages: pages.length,
    processedPages: 0
  }
  
  const batchSize = EXTRACTION_CONFIG.BATCH_SIZE
  const totalBatches = Math.ceil(pages.length / batchSize)
  stats.totalBatches = totalBatches
  
  for (let i = 0; i < pages.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize) + 1
    const batch = pages.slice(i, i + batchSize)
    const combinedText = batch.map(doc => doc.page_content).join('\n\n')
    const pageNumbers = batch.map(doc => doc.metadata.page).join(',')
    
    if (jobId && !await checkJobStatus(jobId)) {
      errors.push(`Job ${jobId} was cancelled during batch ${batchIndex}`)
      break
    }
    
    try {
      const result = await withTimeout(
        callOpenAIForExtraction(combinedText, pageNumbers, diseaseType, jobId),
        2 * 60 * 1000,
        `OpenAI extraction for batch ${batchIndex}`
      )
      
      if (result.interactions) {
        const validatedInteractions: Interaction[] = []
        
        result.interactions.forEach((interaction: any, index: number) => {
          const validated = validateInteraction(interaction, index)
          if (validated) {
            const processedInteraction: Interaction = {
              ...validated,
              filename: fileName,
              page_number: validated.page_number || pageNumbers
            }
            validatedInteractions.push(processedInteraction)
          }
        })
        
        interactions.push(...validatedInteractions)
        stats.successfulBatches++
        stats.processedPages += batch.length
        
        // Update job progress with new interaction count immediately after each batch
        if (jobId && validatedInteractions.length > 0) {
          try {
            const { createClient } = await import('@supabase/supabase-js')
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            
            const { data: currentJob } = await supabase
              .from('extraction_jobs')
              .select('interactions_found')
              .eq('id', jobId)
              .single()
            
            const newTotal = (currentJob?.interactions_found || 0) + validatedInteractions.length
            
            await supabase
              .from('extraction_jobs')
              .update({ interactions_found: newTotal })
              .eq('id', jobId)
          } catch (error) {
            // Silent fail - don't break extraction for progress updates
          }
        }
      }
      
      // Fallback for low-yield batches
      if (result.interactions.length < batch.length * EXTRACTION_CONFIG.FALLBACK_THRESHOLD) {
        for (const doc of batch) {
          if (jobId && !await checkJobStatus(jobId)) {
            errors.push(`Job ${jobId} was cancelled during individual page processing`)
            break
          }
          
          try {
            const individualResult = await withTimeout(
              callOpenAIForExtraction(doc.page_content, doc.metadata.page.toString(), diseaseType, jobId),
              2 * 60 * 1000,
              `Individual page ${doc.metadata.page}`
            )
            
            if (individualResult.interactions) {
              for (const interaction of individualResult.interactions) {
                const validated = validateInteraction(interaction, 0)
                if (validated) {
                  const processedInteraction: Interaction = {
                    ...validated,
                    filename: fileName,
                    page_number: validated.page_number || doc.metadata.page.toString()
                  }
                  interactions.push(processedInteraction)
                  
                  // Update job progress immediately after each individual interaction
                  if (jobId) {
                    // Fire and forget update
                    updateInteractionCount(jobId).catch(() => {})
                  }
                }
              }
            }
            
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            errors.push(`Page ${doc.metadata.page} failed: ${errorMsg}`)
          }
        }
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`Batch ${batchIndex} failed: ${errorMsg}`)
      
      if (errorMsg.includes('TIMEOUT')) {
        stats.timeoutBatches++
      } else {
        stats.failedBatches++
      }
    }
  }
  
  return { interactions, errors, stats }
}

export async function extractReferencesFromPages(
  documentPages: DocumentPage[],
  jobId?: string
): Promise<{ references: Record<string, string>, errors: string[] }> {
  
  const references: Record<string, string> = {}
  const referenceErrors: string[] = []
  
  const pagesByFile = groupPagesByFile(documentPages)
  
  for (const [fileName, filePages] of Object.entries(pagesByFile)) {
    if (jobId && !await checkJobStatus(jobId)) {
      referenceErrors.push(`Job ${jobId} was cancelled during reference extraction`)
      break
    }
    
    const docsForRefCheck = filePages.slice(0, 2)
    
    if (docsForRefCheck.length === 0) {
      referenceErrors.push(`No documents available for file ${fileName}`)
      continue
    }
    
    const combinedText = docsForRefCheck.map(doc => doc.page_content).join('\n\n')
    const pageNumbers = docsForRefCheck.map(doc => doc.metadata.page).join(',')
    
    try {
      const referenceString = await withTimeout(
        callOpenAIForReferences(combinedText, pageNumbers),
        2 * 60 * 1000,
        `Reference extraction for ${fileName}`
      )
      
      if (referenceString && !['', 'none', 'not found', 'n/a'].includes(referenceString.toLowerCase())) {
        references[fileName] = referenceString
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      referenceErrors.push(`Failed to extract reference for ${fileName}: ${errorMsg}`)
    }
  }
  
  return { references, errors: referenceErrors }
}

export async function extractDiseaseTypeFromPages(
  documentPages: DocumentPage[]
): Promise<{ diseaseType: string, errors: string[] }> {
  
  const diseaseErrors: string[] = []
  
  const firstFilePages = documentPages
    .filter(page => page.metadata.file_name === documentPages[0]?.metadata.file_name)
    .slice(0, 3)
  
  if (firstFilePages.length === 0) {
    return { diseaseType: 'General', errors: ['No pages available for disease type extraction'] }
  }
  
  const combinedText = firstFilePages.map(doc => doc.page_content).join('\n\n')
  const pageNumbers = firstFilePages.map(doc => doc.metadata.page).join(',')
  
  try {
    const diseaseType = await withTimeout(
      callOpenAIForDiseaseType(combinedText, pageNumbers),
      60 * 1000,
      'Disease type detection'
    )
    
    if (diseaseType && diseaseType.trim() && !['', 'none', 'not found', 'unknown', 'general'].includes(diseaseType.toLowerCase().trim())) {
      return { diseaseType: diseaseType.trim(), errors: [] }
    } else {
      return { diseaseType: 'General', errors: [] }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    diseaseErrors.push(`Failed to extract disease type: ${errorMsg}`)
    
    return { diseaseType: 'General', errors: diseaseErrors }
  }
}

async function callOpenAIForDiseaseType(text: string, pageNumbers: string) {
  const { DISEASE_TYPE_PROMPT } = await import('./prompts')
  const { model } = await getOpenAIModel()
  
  const response = await callOpenAI({
    model,
    messages: [
      { role: 'system', content: DISEASE_TYPE_PROMPT },
      { role: 'user', content: `Text: ${text}\nPage Number: ${pageNumbers}` }
    ],
    temperature: 0.1,
  })
  
  return response.choices[0]?.message?.content?.trim() || 'General'
}

async function callOpenAIForExtraction(
  text: string, 
  pageNumbers: string, 
  diseaseType: string,
  jobId?: string
) {
  if (jobId && !await checkJobStatus(jobId)) {
    throw new Error(`Job ${jobId} was cancelled before OpenAI extraction`)
  }
  
  const promptTemplate = getPromptForDiseaseType(diseaseType)
  const { model } = await getOpenAIModel()
  
  const response = await callOpenAI({
    model,
    messages: [
      { role: 'system', content: promptTemplate },
      { role: 'user', content: `Text: ${text}\nPage Number: ${pageNumbers}` }
    ],
    temperature: EXTRACTION_CONFIG.TEMPERATURE,
  })
  
  const content = response.choices[0]?.message?.content
  
  if (content) {
    const cleanedText = content.split('\n').filter(line => !line.trim().startsWith('```')).join('\n')
    
    try {
      return JSON.parse(cleanedText)
    } catch (parseError) {
      // Try to salvage partial JSON
      let salvageAttempt = cleanedText
      if (cleanedText.includes('"interactions":[')) {
        const openBraces = (cleanedText.match(/{/g) || []).length
        const closeBraces = (cleanedText.match(/}/g) || []).length
        const openBrackets = (cleanedText.match(/\[/g) || []).length
        const closeBrackets = (cleanedText.match(/\]/g) || []).length
        
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          salvageAttempt += ']'
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          salvageAttempt += '}'
        }
        
        try {
          return JSON.parse(salvageAttempt)
        } catch (salvageError) {
          // Silent fail
        }
      }
      
      return { interactions: [] }
    }
  }
  
  return { interactions: [] }
}

async function callOpenAIForReferences(text: string, pageNumbers: string) {
  const { REFERENCE_PROMPT } = await import('./prompts')
  const { model } = await getOpenAIModel()
  
  const response = await callOpenAI({
    model,
    messages: [
      { role: 'system', content: REFERENCE_PROMPT },
      { role: 'user', content: `Text: ${text}\nPage Number: ${pageNumbers}` }
    ],
    temperature: EXTRACTION_CONFIG.TEMPERATURE
  })
  
  return response.choices[0]?.message?.content?.trim() || ''
}

async function getOpenAIModel(): Promise<{ model: string }> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data } = await supabase
      .from('system_settings')
      .select('openai_model')
      .single()
    
    return { model: data?.openai_model || 'gpt-4o-mini' }
  } catch (error) {
    return { model: 'gpt-4o-mini' }
  }
}

function groupPagesByFile(pages: DocumentPage[]): Record<string, DocumentPage[]> {
  const grouped: Record<string, DocumentPage[]> = {}
  
  pages.forEach(page => {
    const fileName = page.metadata.file_name
    if (!grouped[fileName]) {
      grouped[fileName] = []
    }
    grouped[fileName].push(page)
  })
  
  return grouped
}

// Helper function for individual interaction updates
async function updateInteractionCount(jobId: string): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data: currentJob } = await supabase
    .from('extraction_jobs')
    .select('interactions_found')
    .eq('id', jobId)
    .single()
  
  const newTotal = (currentJob?.interactions_found || 0) + 1
  
  await supabase
    .from('extraction_jobs')
    .update({ interactions_found: newTotal })
    .eq('id', jobId)
}