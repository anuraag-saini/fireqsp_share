import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const userEmail = formData.get('userEmail') as string

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' }, 
        { status: 400 }
      )
    }

    console.log(`Processing ${files.length} files for user: ${userEmail}`)

    const interactions: any[] = []
    const references: Record<string, string> = {}
    const errors: string[] = []

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`)
        
        // Extract text from PDF (simplified - in production use pdf-parse)
        const text = await extractTextFromPDF(file)
        
        // Extract interactions using OpenAI
        const extractionResult = await extractInteractionsFromText(text, file.name)
        
        if (extractionResult.interactions) {
          interactions.push(...extractionResult.interactions)
        }
        
        if (extractionResult.references) {
          references[file.name] = extractionResult.references
        }

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        errors.push(`Failed to process ${file.name}: ${error}`)
      }
    }

    const result = {
      interactions,
      references,
      errors,
      summary: {
        totalFiles: files.length,
        totalInteractions: interactions.length,
        filesWithErrors: errors.length
      }
    }

    console.log(`Extraction complete: ${interactions.length} interactions found`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Extraction API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  // Simplified PDF text extraction
  // In production, use libraries like pdf-parse, pdf2pic + OCR, or external services
  
  // For now, return a mock text that simulates PDF content
  const mockText = `
    Biological Interaction Study
    
    This study investigates the role of TNF-alpha in inflammatory responses.
    TNF-alpha activates macrophages and leads to increased cytokine production.
    IL-6 is upregulated by TNF-alpha signaling pathways.
    
    We observed that protein A binds to receptor B with high affinity.
    This binding results in downstream activation of kinase C.
    
    The interaction between insulin and GLUT4 facilitates glucose uptake.
    Insulin receptor activation triggers GLUT4 translocation to cell membrane.
    
    Results show that compound X inhibits enzyme Y activity by 80%.
    This inhibition prevents phosphorylation of substrate Z.
  `
  
  return mockText
}

async function extractInteractionsFromText(text: string, filename: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant specialized in extracting biological interactions from scientific text. 
          Extract interactions between biological entities and return them as JSON.
          
          Return JSON with this structure:
          {
            "interactions": [
              {
                "mechanism": "description of interaction",
                "source": "source entity name",
                "target": "target entity name", 
                "interaction_type": "positive|negative|regulatory|binding|transport",
                "details": "additional details",
                "confidence": "high|medium|low"
              }
            ],
            "references": "bibliographic reference if found"
          }`
        },
        {
          role: 'user',
          content: `Extract biological interactions from this text:\n\n${text}\n\nFilename: ${filename}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      try {
        const parsed = JSON.parse(content)
        
        // Add filename to each interaction
        if (parsed.interactions) {
          parsed.interactions = parsed.interactions.map((interaction: any) => ({
            ...interaction,
            filename,
            id: Math.random().toString(36).substr(2, 9)
          }))
        }
        
        return parsed
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        return { interactions: [], references: null }
      }
    }
    
    return { interactions: [], references: null }
    
  } catch (error) {
    console.error('OpenAI API error:', error)
    return { interactions: [], references: null }
  }
}