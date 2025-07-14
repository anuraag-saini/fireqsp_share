import type { DocumentPage } from './prompts'

export async function extractPagesFromPDF(file: File): Promise<DocumentPage[]> {
  try {
    console.log(`Processing file: ${file.name}`)
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`Buffer created, size: ${buffer.length} bytes`)
    
    // Use pdf-parse with explicit buffer option
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer, {
        max: 0, // Parse all pages
    });
    
    //console.log(`Extracted text from ${file.name} (${pdfData.numpages} pages)`)
    
    // Split text into logical chunks (since pdf-parse doesn't preserve page boundaries)
    const chunks = splitTextIntoChunks(pdfData.text, 3000)
    
    const pages: DocumentPage[] = []
    let referencesSectionStarted = false
    
    chunks.forEach((chunk: string, index: number) => {
      const chunkLower = chunk.toLowerCase()
      
      // Check for references section
      if (['references', 'bibliography', 'works cited'].some(keyword => 
        chunkLower.includes(keyword)
      )) {
        referencesSectionStarted = true
        console.log(`Reference section found in ${file.name}`)
      }
      
      // Only include chunks before references section
      if (!referencesSectionStarted && chunk.trim().length > 100) {
        pages.push({
          page_content: chunk.trim(),
          metadata: {
            page: index + 1,
            file_name: file.name
          }
        })
      }
    })
    
    console.log(`Filtered to ${pages.length} pages (excluding references)`)
    
    if (pages.length === 0) {
      throw new Error('No text content could be extracted from PDF')
    }
    
    return pages
    
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Rest of your functions remain the same...

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += sentence + '. '
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

export function filterReferencePages(pages: DocumentPage[]): DocumentPage[] {
  return pages.filter(page => {
    const content = page.page_content.toLowerCase()
    const hasReferenceKeywords = ['references', 'bibliography', 'works cited', 'literature cited'].some(
      keyword => content.includes(keyword)
    )
    
    // If page has reference keywords and is mostly citations, filter it out
    if (hasReferenceKeywords) {
      const citationPattern = /\d{4}[.;,]\s|et al[.;,]\s|vol\.\s*\d+|pp\.\s*\d+/gi
      const citationMatches = content.match(citationPattern) || []
      const citationDensity = citationMatches.length / content.split(' ').length
      
      // If more than 10% of content looks like citations, filter out
      return citationDensity < 0.1
    }
    
    return true
  })
}

export function createFilesHash(files: File[]): string {
  // Create hash based on file names, sizes, and last modified dates
  const fileData = files.map(file => `${file.name}-${file.size}-${file.lastModified}`).join('|')
  
  // Simple hash function - you could use crypto for production
  let hash = 0
  for (let i = 0; i < fileData.length; i++) {
    const char = fileData.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}