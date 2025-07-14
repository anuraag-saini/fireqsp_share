export const GENERAL_PROMPT = `
You are an AI assistant specialized in extracting mechanisms of action from scientific PDFs for Quantitative Systems Pharmacology (QSP) modeling. Extract biological components (specifically proteins, cells, or other biomolecules) and their interactions relevant to disease pathophysiology or drug mechanisms, including feedback loops and kinetic details, with best guesses for parameters if not explicitly stated. Ensure that both the source and target of each interaction are biological entities.

Extract components at levels: Molecular (e.g., cytokines, receptors), Cellular (e.g., T cells), Organ (e.g., gut), Clinical (e.g., inflammation).
For each interaction:
- Identify the source (activator/inhibitor) and target (affected component).
- Categorize as: Positive (enhancing), Negative (inhibiting), Regulatory (feedback loops).
- Ensure that both the source and target are specific biological components (e.g., proteins, cells, etc.) and not general terms like "inflammation" or processes.
- Always assume exogenous agonists to have positive effect on the corresponding similar endogenous proteins.
- Receptor Agonists and RA are the same things (e.g., GLP-1RAs is same as GLP-1 Receptor Agonists). Identify it as 1 entity.

Return valid JSON only with:
- "interactions": Array of {
  "mechanism": str,
  "source": {"name": str, "level": str},
  "target": {"name": str, "level": str},
  "interaction_type": "upregulation|activation|inhibition|downlregulation|binding|transport",
  "details": str,
  "reference_text": str,
  "page_number": str,
}

Example:
{
  "interactions": [
    {
      "mechanism": "Insulin activates GLUT4 translocation",
      "source": {"name": "Insulin", "level": "Molecular"},
      "target": {"name": "GLUT4", "level": "Molecular"},
      "interaction_type": "activation",
      "details": "Insulin triggers GLUT4 to move to the cell membrane.",
      "reference_text": "Insulin enhances glucose uptake via GLUT4...",
      "page_number": "5",
    },
    {
      "mechanism": "GLUT4 inhibits Insulin secretion",
      "source": {"name": "GLUT4", "level": "Molecular"},
      "target": {"name": "Insulin", "level": "Molecular"},
      "interaction_type": "inhibition",
      "details": "Negative feedback on insulin secretion.",
      "reference_text": "High GLUT4 levels reduce insulin release...",
      "page_number": "6",
    }
  ]
}

Text: {text}
Page Number: {page_number}
`

export const REFERENCE_PROMPT = `
Identify the full bibliographic reference for the source document from which the provided text originates.
Extract details such as Authors, Publication Year, Title of the article/chapter,
Source (e.g., Journal Name, Book Title, Conference Proceedings), Volume, Issue, Pages, and DOI (if available).

Format the reference as a single string using APA 7th edition style.
Ensure the output is *only* the formatted reference string, with no introductory or concluding text, and no JSON formatting.
### Important instructions
1. If you cannot confidently identify the complete reference, return an empty string.
2. If you cannot identify DOI, then keep it blank, DO NOT INVENT DOI.

Text: {text}
Page Number: {page_number}
`
export const DISEASE_TYPE_PROMPT = `
Analyze the provided scientific text and identify the primary disease or medical condition being studied.

Look for:
- Disease names (e.g., "diabetes", "inflammatory bowel disease", "cancer", "Alzheimer's")
- Medical conditions or syndromes
- Pathological states
- Drug targets or therapeutic areas

Return ONLY the disease name as a simple string. Examples:
- "Diabetes"
- "Inflammatory Bowel Disease" 
- "Cancer"
- "Alzheimer's Disease"
- "Cardiovascular Disease"
- "Obesity"

If no clear disease can be identified, return "General".
If multiple diseases are mentioned, return the primary one being studied.

Text: {text}
Page Number: {page_number}
`
// You can add the other prompts as needed
export const IBD_PROMPT = `You are an AI assistant specialized in summarizing pathophysiology and complex interactions between biological pathways from high-quality literature on Inflammatory Bowel Disease (IBD), including Crohn's Disease (CD) and Ulcerative Colitis (UC). Your expertise lies in identifying key elements that provide mechanistic understanding of disease pathophysiology and mechanisms of action of relevant drugs. This information is crucial for research scientists developing Quantitative Systems Pharmacology (QSP) models.

Extract and categorize the biological components related to IBD pathophysiology and drug mechanisms of action. Focus on key elements that provide a mechanistic understanding of IBD.

Return valid JSON only with:
- "interactions": Array of {
  "mechanism": str,
  "source": {"name": str, "level": str},
  "target": {"name": str, "level": str},
  "interaction_type": "upregulation|activation|inhibition|downregulation|binding|transport",
  "details": str,
  "reference_text": str,
  "page_number": str,
}

Text: {text}
Page Number: {page_number}
`

// Add prompt selection function
export function getPromptForDiseaseType(diseaseType: string): string {
  switch (diseaseType) {
    case "Diabetes":
      return GENERAL_PROMPT // Your Streamlit uses GENERAL_PROMPT for Diabetes
    case "IBD-UC":
    case "IBD-CD":
      return GENERAL_PROMPT
    default:
      return GENERAL_PROMPT
  }
}

// Add TypeScript interfaces
export interface ExtractionResult {
  interactions: Interaction[]
  references?: string
}

export interface Interaction {
  id?: string
  mechanism: string
  source: { name: string; level: string }
  target: { name: string; level: string }
  interaction_type: 'upregulation' | 'activation' | 'inhibition' | 'downregulation' | 'binding' | 'transport'
  details: string
  confidence?: 'high' | 'medium' | 'low'
  reference_text: string
  page_number: string
  filename?: string
}

export interface DocumentPage {
  page_content: string
  metadata: {
    page: number
    file_name: string
  }
}

// ADD: Batch processing configuration
export const EXTRACTION_CONFIG = {
  BATCH_SIZE: 2,
  MAX_RETRIES: 3,
  FALLBACK_THRESHOLD: 0.5, // If interactions < batch_size * threshold, fallback to individual
  TEMPERATURE: 0.01,
  MAX_TOKENS: 4096
} as const