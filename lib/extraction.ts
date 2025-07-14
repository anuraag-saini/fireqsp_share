import OpenAI from 'openai'
import { getPromptForDiseaseType, EXTRACTION_CONFIG, type DocumentPage, type Interaction } from './prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ExtractionProgress {
  fileIndex: number
  fileName: string
  totalFiles: number
  status: 'processing' | 'completed' | 'failed'
  batchIndex?: number
  totalBatches?: number
}

export async function extractInteractionsFromPages(
  documentPages: DocumentPage[], 
  diseaseType: string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<{ interactions: Interaction[], errors: string[] }> {
  
  const extractedInteractions: Interaction[] = []
  const extractionErrors: string[] = []
  
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
      const { interactions, errors } = await processFilePages(filePages, diseaseType, fileName)
      extractedInteractions.push(...interactions)
      extractionErrors.push(...errors)
      
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
  
  return { interactions: extractedInteractions, errors: extractionErrors }
}

async function processFilePages(
  pages: DocumentPage[], 
  diseaseType: string, 
  fileName: string
): Promise<{ interactions: Interaction[], errors: string[] }> {
  
  const interactions: Interaction[] = []
  const errors: string[] = []
  
  // Batch processing logic from Streamlit
  const batchSize = EXTRACTION_CONFIG.BATCH_SIZE
  
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize)
    const combinedText = batch.map(doc => doc.page_content).join('\n\n')
    const pageNumbers = batch.map(doc => doc.metadata.page).join(',')
    
    try {
      const result = await callOpenAIForExtraction(combinedText, pageNumbers, diseaseType)
      
      if (result.interactions) {
        result.interactions.forEach((interaction: any, index: number) => {
          console.log(`=== Processing interaction ${index} in batch ===`)
        //   console.log('Raw OpenAI interaction:', interaction)
        //   console.log('Source from OpenAI:', interaction.source, 'Type:', typeof interaction.source)
        //   console.log('Target from OpenAI:', interaction.target, 'Type:', typeof interaction.target)
          
          // ✅ FIXED: Preserve the nested objects from OpenAI response
          const processedInteraction: Interaction = {
            // ✅ Keep all original properties from OpenAI (including nested source/target)
            ...interaction,
            // ✅ Only add/override non-nested properties
            filename: fileName,
            id: interaction.id || Math.random().toString(36).substr(2, 9),
            confidence: interaction.confidence || 'medium',
            page_number: interaction.page_number || pageNumbers
          }
          
        //   console.log('Final processed interaction:', processedInteraction)
        //   console.log('Final source:', processedInteraction.source, 'Type:', typeof processedInteraction.source)
        //   console.log('Final target:', processedInteraction.target, 'Type:', typeof processedInteraction.target)
          console.log(`=== End processing interaction ${index} ===\n`)
          
          interactions.push(processedInteraction)
        })
      }
      
      // Fallback logic from Streamlit
      if (result.interactions.length < batch.length * EXTRACTION_CONFIG.FALLBACK_THRESHOLD) {
        errors.push(`Batch ${Math.floor(i/batchSize) + 1} yielded only ${result.interactions.length} interactions for ${batch.length} pages; reprocessing individually.`)
        
        // Process individual pages
        for (const doc of batch) {
          try {
            const individualResult = await callOpenAIForExtraction(
              doc.page_content, 
              doc.metadata.page.toString(), 
              diseaseType
            )
            
            if (individualResult.interactions) {
              individualResult.interactions.forEach((interaction: any, index: number) => {
                console.log(`=== Processing individual interaction ${index} ===`)
                // console.log('Raw individual OpenAI interaction:', interaction)
                // console.log('Individual source from OpenAI:', interaction.source, 'Type:', typeof interaction.source)
                // console.log('Individual target from OpenAI:', interaction.target, 'Type:', typeof interaction.target)
                
                // ✅ FIXED: Preserve nested objects for individual processing too
                const processedInteraction: Interaction = {
                  // ✅ Keep all original properties from OpenAI (including nested source/target)
                  ...interaction,
                  // ✅ Only add/override non-nested properties
                  filename: fileName,
                  id: interaction.id || Math.random().toString(36).substr(2, 9),
                  confidence: interaction.confidence || 'medium',
                  page_number: interaction.page_number || doc.metadata.page.toString()
                }
                
                // console.log('Final individual processed interaction:', processedInteraction)
                // console.log('Final individual source:', processedInteraction.source, 'Type:', typeof processedInteraction.source)
                // console.log('Final individual target:', processedInteraction.target, 'Type:', typeof processedInteraction.target)
                console.log(`=== End processing individual interaction ${index} ===\n`)
                
                interactions.push(processedInteraction)
              })
            }
          } catch (error) {
            errors.push(`Page ${doc.metadata.page} failed: ${error}`)
          }
        }
      }
    } catch (error) {
      errors.push(`Batch ${Math.floor(i/batchSize) + 1} failed: ${error}`)
    }
  }
  
  return { interactions, errors }
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
      const referenceString = await callOpenAIForReferences(combinedText, pageNumbers)
      
      if (referenceString && !['', 'none', 'not found', 'n/a', 'cannot identify', 'not applicable'].includes(referenceString.toLowerCase())) {
        references[fileName] = referenceString
      }
    } catch (error) {
      referenceErrors.push(`Failed to extract reference for file ${fileName}: ${error}`)
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
    .slice(0, 3) // First 3 pages should be enough
  
  if (firstFilePages.length === 0) {
    return { diseaseType: 'General', errors: ['No pages available for disease type extraction'] }
  }
  
  const combinedText = firstFilePages.map(doc => doc.page_content).join('\n\n')
  const pageNumbers = firstFilePages.map(doc => doc.metadata.page).join(',')
  
  try {
    const diseaseType = await callOpenAIForDiseaseType(combinedText, pageNumbers)
    
    if (diseaseType && diseaseType.trim() && !['', 'none', 'not found', 'unknown'].includes(diseaseType.toLowerCase())) {
      return { diseaseType: diseaseType.trim(), errors: [] }
    } else {
      return { diseaseType: 'General', errors: [] }
    }
  } catch (error) {
    diseaseErrors.push(`Failed to extract disease type: ${error}`)
    return { diseaseType: 'General', errors: diseaseErrors }
  }
}

async function callOpenAIForDiseaseType(text: string, pageNumbers: string) {
  const { DISEASE_TYPE_PROMPT } = await import('./prompts')
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
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
  
  return response.choices[0]?.message?.content?.trim() || 'General'
}

async function callOpenAIForExtraction(text: string, pageNumbers: string, diseaseType: string) {
  const promptTemplate = getPromptForDiseaseType(diseaseType)
  
  console.log('=== OpenAI Extraction Debug ===')
  console.log('Disease type:', diseaseType)
//   console.log('Text length:', text.length)
//   console.log('Text preview:', text.substring(0, 200) + '...')
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
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
  console.log('=== Raw OpenAI Response ===')
//   console.log('Raw OpenAI response:', content)
  
  if (content) {
    // Clean the text like in Streamlit
    const cleanedText = content.split('\n').filter(line => !line.trim().startsWith('```')).join('\n')
    // console.log('Cleaned OpenAI text:', cleanedText)
    
    try {
      const parsed = JSON.parse(cleanedText)
      console.log('=== Parsed OpenAI JSON ===')
    //   console.log('Parsed JSON structure:', parsed)
    //   console.log('Parsed interactions count:', parsed.interactions?.length || 0)
      
      if (parsed.interactions && parsed.interactions.length > 0) {
        // console.log('First parsed interaction:', parsed.interactions[0])
        // console.log('First interaction source:', parsed.interactions[0]?.source)
        // console.log('First interaction target:', parsed.interactions[0]?.target)
        console.log('Source type:', typeof parsed.interactions[0]?.source)
        console.log('Target type:', typeof parsed.interactions[0]?.target)
      }
      
      return parsed
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
    //   console.error('Failed to parse:', cleanedText)
      return { interactions: [] }
    }
  }
  
  return { interactions: [] }
}

async function callOpenAIForReferences(text: string, pageNumbers: string) {
  const { REFERENCE_PROMPT } = await import('./prompts')
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
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