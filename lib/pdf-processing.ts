import type { DocumentPage } from './prompts'

export async function extractPagesFromPDF(file: File): Promise<DocumentPage[]> {
  try {
    console.log(`Processing file: ${file.name}`)
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`Buffer created, size: ${buffer.length} bytes`)
    
    // Import pdf-parse using require to avoid ES module issues
    const pdfParse = require('pdf-parse')
    
    const pdfData = await pdfParse(buffer, {
      max: 0, // Parse all pages
    })
    
    console.log(`Extracted text from ${file.name} (${pdfData.numpages} pages)`)
    
    // Split text into logical chunks (since pdf-parse doesn't preserve page boundaries)
    const chunks = splitTextIntoChunks(pdfData.text, 3000)
    
    const pages: DocumentPage[] = []
    let referencesSectionStarted = false
    let referenceSectionIndex = -1
    
    // First pass: identify where references section actually starts
    chunks.forEach((chunk: string, index: number) => {
      if (!referencesSectionStarted && isReferencesSection(chunk)) {
        referencesSectionStarted = true
        referenceSectionIndex = index
        console.log(`Reference section found at chunk ${index + 1} in ${file.name}`)
      }
    })
    
    // If no clear references section found, use conservative approach
    if (referenceSectionIndex === -1) {
      console.log(`No clear references section found, including all chunks`)
      referenceSectionIndex = chunks.length
    }
    
    // Second pass: include only chunks before references section
    chunks.forEach((chunk: string, index: number) => {
      if (index < referenceSectionIndex && chunk.trim().length > 100) {
        pages.push({
          page_content: chunk.trim(),
          metadata: {
            page: index + 1,
            file_name: file.name
          }
        })
      }
    })
    
    console.log(`Filtered to ${pages.length} chunks (excluding references from chunk ${referenceSectionIndex + 1})`)
    
    if (pages.length === 0) {
      throw new Error('No text content could be extracted from PDF')
    }

    console.log(`✅ PDF extraction completed: ${pages.length} chunks`)
    return pages
    
  } catch (error) {
    console.error('PDF extraction error:', error)
    
    // More specific error messages for better debugging
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error(`Corrupted PDF file: ${file.name}`)
      }
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        throw new Error(`Password-protected PDF: ${file.name}`)
      }
    }
    
    throw new Error(`Failed to extract text from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function isReferencesSection(chunk: string): boolean {
  const chunkTrimmed = chunk.trim()
  const firstLines = chunkTrimmed.split('\n').slice(0, 5).join('\n').toLowerCase()
  
  // Check if this chunk starts with a references header
  const referenceHeaders = [
    /^references\s*$/,
    /^references\s*\n/,
    /^\d+\.\s*references/,
    /^bibliography\s*$/,
    /^literature\s+cited\s*$/,
    /^works\s+cited\s*$/
  ]
  
  const hasReferenceHeader = referenceHeaders.some(pattern => 
    pattern.test(firstLines)
  )
  
  if (hasReferenceHeader) {
    // Additional validation: check if chunk contains citation patterns
    const citationPatterns = [
      /\d{4}[.;,]\s+/g,           // Years followed by punctuation
      /et\s+al[.;,]\s+/g,         // "et al" citations
      /vol\.\s*\d+/g,             // Volume numbers
      /pp\.\s*\d+/g,              // Page numbers
      /doi:\s*10\./g,             // DOI patterns
      /pmid:\s*\d+/g,             // PubMed IDs
      /\[\d+\]/g,                 // Numbered references
      /\(\d{4}\)/g                // Years in parentheses
    ]
    
    const totalMatches = citationPatterns.reduce((count, pattern) => {
      const matches = chunkTrimmed.match(pattern) || []
      return count + matches.length
    }, 0)
    
    const words = chunkTrimmed.split(/\s+/).length
    const citationDensity = totalMatches / words
    
    // If header is present and citation density is high, it's likely references
    return citationDensity > 0.05 // 5% of words are citation-like
  }
  
  return false
}

function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }
  
  // Clean up common PDF extraction artifacts
  const cleanText = text
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\f/g, ' ')           // Remove form feeds
    .replace(/\u00a0/g, ' ')       // Replace non-breaking spaces
    .replace(/\u2028/g, '\n')      // Line separator
    .replace(/\u2029/g, '\n')      // Paragraph separator
    .trim()
    
  const chunks: string[] = []
  
  // Split by paragraphs first for better chunk boundaries
  const paragraphs = cleanText.split(/\n\s*\n/)
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = paragraph + '\n\n'
    } else {
      currentChunk += paragraph + '\n\n'
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  // If we still have very large chunks, split by sentences
  const finalChunks: string[] = []
  for (const chunk of chunks) {
    if (chunk.length <= chunkSize) {
      finalChunks.push(chunk)
    } else {
      const sentences = chunk.split(/[.!?]+/)
      let currentSentenceChunk = ''
      
      for (const sentence of sentences) {
        if (currentSentenceChunk.length + sentence.length > chunkSize && currentSentenceChunk.length > 0) {
          finalChunks.push(currentSentenceChunk.trim())
          currentSentenceChunk = sentence + '. '
        } else {
          currentSentenceChunk += sentence + '. '
        }
      }
      
      if (currentSentenceChunk.trim().length > 0) {
        finalChunks.push(currentSentenceChunk.trim())
      }
    }
  }
  
  return finalChunks.filter(chunk => chunk.length > 50) // Filter out very short chunks
}

export function filterReferencePages(pages: DocumentPage[]): DocumentPage[] {
  return pages.filter(page => {
    const content = page.page_content.toLowerCase()
    
    // More sophisticated reference detection
    const referenceIndicators = [
      /^references\s*$/m,
      /^bibliography\s*$/m,
      /^works\s+cited\s*$/m,
      /^literature\s+cited\s*$/m
    ]
    
    const hasReferenceHeader = referenceIndicators.some(pattern => 
      pattern.test(content)
    )
    
    if (hasReferenceHeader) {
      // Check citation density
      const citationPatterns = [
        /\d{4}[.;,]\s/g,
        /et\s+al[.;,]\s/g,
        /vol\.\s*\d+/g,
        /pp\.\s*\d+/g,
        /doi:\s*10\./g,
        /\[\d+\]/g
      ]
      
      const totalMatches = citationPatterns.reduce((count, pattern) => {
        const matches = content.match(pattern) || []
        return count + matches.length
      }, 0)
      
      const words = content.split(/\s+/).length
      const citationDensity = totalMatches / words
      
      // If more than 8% of content looks like citations, filter out
      return citationDensity < 0.08
    }
    
    return true
  })
}

export function createFilesHash(files: File[]): string {
  // Create hash based on file names, sizes, and last modified dates
  const fileData = files.map(file => `${file.name}-${file.size}`).join('|')
  
  // Simple hash function - you could use crypto for production
  let hash = 0
  for (let i = 0; i < fileData.length; i++) {
    const char = fileData.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}