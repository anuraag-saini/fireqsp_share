import OpenAI from 'openai'
import { getPromptForDiseaseType, EXTRACTION_CONFIG, type DocumentPage, type Interaction } from './prompts'
import { openAIKeyManager } from './openai-manager'

// OpenAI clients will be created with rotating keys in each function


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

// Add timeout wrapper function
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
  onProgress?: (progress: ExtractionProgress) => void
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
  
  // Group pages by file
  const pagesByFile = groupPagesByFile(documentPages)
  const fileNames = Object.keys(pagesByFile)
  
  for (let fileIndex = 0; fileIndex < fileNames.length; fileIndex++) {
    const fileName = fileNames[fileIndex]
    const filePages = pagesByFile[fileName]
    
    onProgress?.({
      fileIndex,
      fileName,
      totalFiles: fileNames.length,
      status: 'processing'
    })
    
    try {
      const result = await processFilePages(filePages, diseaseType, fileName)
      extractedInteractions.push(...result.interactions)
      extractionErrors.push(...result.errors)
      
      // Accumulate stats
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
      const errorMessage = `Failed to process ${fileName}: ${error}`
      extractionErrors.push(errorMessage)
      
      onProgress?.({
        fileIndex,
        fileName,
        totalFiles: fileNames.length,
        status: 'failed'
      })
    }
  }
  
  // Log final stats
  // console.log(`📊 Extraction Stats: ${stats.successfulBatches}/${stats.totalBatches} batches succeeded, ${stats.timeoutBatches} timed out, ${stats.processedPages}/${stats.totalPages} pages processed`)
  
  return { 
    interactions: extractedInteractions, 
    errors: extractionErrors,
    stats
  }
}

async function processFilePages(
  pages: DocumentPage[], 
  diseaseType: string, 
  fileName: string
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
  
  // Batch processing logic
  const batchSize = EXTRACTION_CONFIG.BATCH_SIZE
  const totalBatches = Math.ceil(pages.length / batchSize)
  stats.totalBatches = totalBatches
  
  for (let i = 0; i < pages.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize) + 1
    const batch = pages.slice(i, i + batchSize)
    const combinedText = batch.map(doc => doc.page_content).join('\n\n')
    const pageNumbers = batch.map(doc => doc.metadata.page).join(',')
    
    // console.log(`🔄 Processing batch ${batchIndex}/${totalBatches} for ${fileName} (${batch.length} pages)`)
    
    try {
      // Add 10 minute timeout for OpenAI call
      const result = await withTimeout(
        callOpenAIForExtraction(combinedText, pageNumbers, diseaseType),
        2 * 60 * 1000, // 10 minutes
        `OpenAI extraction for batch ${batchIndex} of ${fileName}`
      )
      
      if (result.interactions) {
        result.interactions.forEach((interaction: any, index: number) => {
          const processedInteraction: Interaction = {
            ...interaction,
            filename: fileName,
            id: interaction.id || Math.random().toString(36).substr(2, 9),
            confidence: interaction.confidence || 'medium',
            page_number: interaction.page_number || pageNumbers
          }
          
          interactions.push(processedInteraction)
        })
        
        stats.successfulBatches++
        stats.processedPages += batch.length
        // console.log(`✅ Batch ${batchIndex}/${totalBatches} succeeded: ${result.interactions.length} interactions`)
      }
      
      // Fallback logic for low-yield batches
      if (result.interactions.length < batch.length * EXTRACTION_CONFIG.FALLBACK_THRESHOLD) {
        const fallbackMessage = `Batch ${batchIndex} yielded only ${result.interactions.length} interactions for ${batch.length} pages; reprocessing individually.`
        errors.push(fallbackMessage)
        // console.log(`⚠️ ${fallbackMessage}`)
        
        // Process individual pages with timeout
        for (const doc of batch) {
          try {
            const individualResult = await withTimeout(
              callOpenAIForExtraction(doc.page_content, doc.metadata.page.toString(), diseaseType),
              2 * 60 * 1000, // 10 minutes
              `OpenAI extraction for page ${doc.metadata.page} of ${fileName}`
            )
            
            if (individualResult.interactions) {
              individualResult.interactions.forEach((interaction: any) => {
                const processedInteraction: Interaction = {
                  ...interaction,
                  filename: fileName,
                  id: interaction.id || Math.random().toString(36).substr(2, 9),
                  confidence: interaction.confidence || 'medium',
                  page_number: interaction.page_number || doc.metadata.page.toString()
                }
                
                interactions.push(processedInteraction)
              })
            }
            // console.log(`✅ Individual page ${doc.metadata.page} processed`)
            
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            const isTimeout = errorMsg.includes('TIMEOUT')
            
            errors.push(`Page ${doc.metadata.page} failed: ${errorMsg}`)
            
            if (isTimeout) {
              // console.log(`⏰ Page ${doc.metadata.page} of ${fileName} timed out after 10 minutes`)
            } else {
              console.error(`❌ Page ${doc.metadata.page} of ${fileName} failed: ${errorMsg}`)
            }
          }
        }
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const isTimeout = errorMsg.includes('TIMEOUT')
      
      errors.push(`Batch ${batchIndex} failed: ${errorMsg}`)
      
      if (isTimeout) {
        stats.timeoutBatches++
        // console.log(`⏰ Batch ${batchIndex}/${totalBatches} of ${fileName} timed out after 10 minutes - skipping to next batch`)
      } else {
        stats.failedBatches++
        console.error(`❌ Batch ${batchIndex}/${totalBatches} of ${fileName} failed: ${errorMsg}`)
      }
    }
  }
  
  const successRate = stats.totalBatches > 0 ? (stats.successfulBatches / stats.totalBatches * 100).toFixed(1) : '0'
  console.log(`📈 ${fileName}: ${interactions.length} interactions extracted`)
  
  return { interactions, errors, stats }
}

export async function extractReferencesFromPages(
  documentPages: DocumentPage[]
): Promise<{ references: Record<string, string>, errors: string[] }> {
  
  const references: Record<string, string> = {}
  const referenceErrors: string[] = []
  
  // Group by file like in Streamlit
  const pagesByFile = groupPagesByFile(documentPages)
  
  for (const [fileName, filePages] of Object.entries(pagesByFile)) {
    // Process first 2 pages like Streamlit
    const docsForRefCheck = filePages.slice(0, 2)
    
    if (docsForRefCheck.length === 0) {
      referenceErrors.push(`No documents available for file ${fileName} to extract reference.`)
      continue
    }
    
    const combinedText = docsForRefCheck.map(doc => doc.page_content).join('\n\n')
    const pageNumbers = docsForRefCheck.map(doc => doc.metadata.page).join(',')
    
    try {
      // Add timeout for reference extraction
      const referenceString = await withTimeout(
        callOpenAIForReferences(combinedText, pageNumbers),
        2 * 60 * 1000, // 5 minutes for references (shorter than extraction)
        `Reference extraction for ${fileName}`
      )
      
      if (referenceString && !['', 'none', 'not found', 'n/a', 'cannot identify', 'not applicable'].includes(referenceString.toLowerCase())) {
        references[fileName] = referenceString
        // console.log(`✅ Reference extracted for ${fileName}`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const isTimeout = errorMsg.includes('TIMEOUT')
      
      referenceErrors.push(`Failed to extract reference for file ${fileName}: ${errorMsg}`)
      
      if (isTimeout) {
        // console.log(`⏰ Reference extraction for ${fileName} timed out after 5 minutes`)
      } else {
        console.error(`❌ Reference extraction for ${fileName} failed: ${errorMsg}`)
      }
    }
  }
  
  return { references, errors: referenceErrors }
}

export async function extractDiseaseTypeFromPages(
  documentPages: DocumentPage[]
): Promise<{ diseaseType: string, errors: string[] }> {
  
  const diseaseErrors: string[] = []
  
  // Use first few pages from first file to identify disease type
  const firstFilePages = documentPages
    .filter(page => page.metadata.file_name === documentPages[0]?.metadata.file_name)
    .slice(0, 3) // First page should be enough
  
  if (firstFilePages.length === 0) {
    console.log('❌ No pages available for disease type extraction')
    return { diseaseType: 'General', errors: ['No pages available for disease type extraction'] }
  }
  
  const combinedText = firstFilePages.map(doc => doc.page_content).join('\n\n')
  const pageNumbers = firstFilePages.map(doc => doc.metadata.page).join(',')
  
  // console.log('📝 Disease detection input:')
  // console.log(`Pages: ${pageNumbers}, Text length: ${combinedText.length}`)
  // console.log('Sample text:', combinedText.substring(0, 300) + (combinedText.length > 300 ? '...' : ''))
  
  try {
    // Add timeout for disease type detection
    // console.log('🚀 Starting OpenAI disease detection call...')
    const diseaseType = await withTimeout(
      callOpenAIForDiseaseType(combinedText, pageNumbers),
      60 * 1000, // 60 seconds
      'Disease type detection'
    )
    
    // console.log(`🎯 Raw OpenAI response: "${diseaseType}"`)
    
    if (diseaseType && diseaseType.trim() && !['', 'none', 'not found', 'unknown', 'general'].includes(diseaseType.toLowerCase().trim())) {
      const cleanedType = diseaseType.trim()
      // console.log(`✅ Disease type detected: "${cleanedType}"`)
      return { diseaseType: cleanedType, errors: [] }
    } else {
      // console.log(`ℹ️ No specific disease type detected (got: "${diseaseType}"), using 'General'`)
      return { diseaseType: 'General', errors: [] }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const isTimeout = errorMsg.includes('TIMEOUT')
    
    diseaseErrors.push(`Failed to extract disease type: ${errorMsg}`)
    
    if (isTimeout) {
      // console.log(`⏰ Disease type detection timed out after 60 seconds, using 'General'`)
    } else {
      console.error(`❌ Disease type detection failed: ${errorMsg}, using 'General'`)
    }
    
    return { diseaseType: 'General', errors: diseaseErrors }
  }
}

async function callOpenAIForDiseaseType(text: string, pageNumbers: string) {
  const { DISEASE_TYPE_PROMPT } = await import('./prompts')
  
  // Get dynamic model and rotating API key
  const { model, apiKey } = await getOpenAIModel()
  
  // Create OpenAI client with specific key
  const openai = new OpenAI({ 
    apiKey,
    timeout: 90 * 1000,
    baseURL: 'https://api.openai.com/v1', // Explicit endpoint
  })
  
  // console.log('🎨 Disease Detection OpenAI Call:')
  // console.log('Model:', model)
  // console.log('API Key:', apiKey.slice(0, 10) + '...')
  // console.log('Text length:', text.length)
  // console.log('First 200 chars:', text.substring(0, 200) + '...')
  
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: DISEASE_TYPE_PROMPT
      },
      {
        role: 'user',
        content: `Text: ${text}\nPage Number: ${pageNumbers}`
      }
    ],
    temperature: 0.1, // Low temperature for consistent results
    max_tokens: 50    // Short response needed
  })
  
  const result = response.choices[0]?.message?.content?.trim() || 'General'
  // console.log('📝 OpenAI raw result for disease detection:', `"${result}"`)
  
  return result
}

async function callOpenAIForExtraction(text: string, pageNumbers: string, diseaseType: string) {
  const promptTemplate = getPromptForDiseaseType(diseaseType)
  
  // Get dynamic model and rotating API key
  const { model, apiKey } = await getOpenAIModel()

  // ADD THESE LOGS:
  // console.log('🌐 ENVIRONMENT CHECK:')
  // console.log('- Running on:', process.env.VERCEL ? 'Vercel' : 'Local')
  // console.log('- Region:', process.env.VERCEL_REGION || 'local')
  // console.log('- OpenAI API Key (first 10 chars):', apiKey.substring(0, 10))
  // console.log('- Text length:', text.length)
  // console.log('🚀 Starting OpenAI API call...')
  
  // Create OpenAI client with specific key
  const openai = new OpenAI({ 
    apiKey,  
    timeout: 90 * 1000, // 60 second HTTP timeout
    baseURL: 'https://api.openai.com/v1', // Explicit endpoint

  })
  
  // console.log('=== OpenAI Extraction Debug ===')
  // console.log('Disease type:', diseaseType)
  // console.log('Using model:', model)
  // console.log('Text length:', text.length)
  
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: promptTemplate
      },
      {
        role: 'user',
        content: `Text: ${text}\nPage Number: ${pageNumbers}`
      }
    ],
    temperature: EXTRACTION_CONFIG.TEMPERATURE,
    max_tokens: EXTRACTION_CONFIG.MAX_TOKENS
  })
  
  const content = response.choices[0]?.message?.content
  
  if (content) {
    // Clean the text like in Streamlit
    const cleanedText = content.split('\n').filter(line => !line.trim().startsWith('```')).join('\n')
    
    try {
      const parsed = JSON.parse(cleanedText)
      // console.log(`✅ OpenAI returned ${parsed.interactions?.length || 0} interactions`)
      
      return parsed
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      console.error('Failed to parse content:', cleanedText.substring(0, 200) + '...')
      return { interactions: [] }
    }
  }
  
  return { interactions: [] }
}

async function callOpenAIForReferences(text: string, pageNumbers: string) {
  const { REFERENCE_PROMPT } = await import('./prompts')
  
  // Get dynamic model and rotating API key
  const { model, apiKey } = await getOpenAIModel()
  
  // Create OpenAI client with specific key
  const openai = new OpenAI({ 
    apiKey,
    timeout: 90 * 1000,
    baseURL: 'https://api.openai.com/v1', // Explicit endpoint
  })
  
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: REFERENCE_PROMPT
      },
      {
        role: 'user',
        content: `Text: ${text}\nPage Number: ${pageNumbers}`
      }
    ],
    temperature: EXTRACTION_CONFIG.TEMPERATURE
  })
  
  return response.choices[0]?.message?.content?.trim() || ''
}

// Helper function to get OpenAI model and rotating API key
async function getOpenAIModel(): Promise<{ model: string, apiKey: string }> {
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
    
    const model = data?.openai_model || 'gpt-4o-mini'
    const apiKey = openAIKeyManager.getNextKey() // Get rotated key
    
    // console.log(`🤖 Using OpenAI model: ${model}`)
    return { model, apiKey }
  } catch (error) {
    console.log('⚠️ Using default model due to error:', error)
    return { model: 'gpt-4o-mini', apiKey: openAIKeyManager.getNextKey() }
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