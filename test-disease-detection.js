// Test script to debug disease detection with your sample data
// Run this with: node test-disease-detection.js

const sampleInteractions = [
  {
    reference_text: "Gaucher's disease arises as a lack of β-glucocerebrosidase, an enzyme involved in lysosomal biochemistry, which leads to accumulation of the substrate, glucosylceramide.",
    filename: "PIIS0953620506001609.pdf"
  },
  {
    reference_text: "It is increasingly clear that inflammation mediated by cytokines is responsible for a significant part of the pathology.",
    filename: "PIIS0953620506001609.pdf"
  },
  {
    reference_text: "In Gaucher's disease, macrophages are activated and they secrete cytokines, particularly those involved in inflammation, such as IL-6.",
    filename: "PIIS0953620506001609.pdf"
  }
];

// Simulate the detection logic
const combinedReferences = sampleInteractions
  .map(int => int.reference_text || '')
  .filter(text => text.length > 20)
  .slice(0, 3)
  .join('\n\n');

console.log("=== DISEASE DETECTION DEBUG ===");
console.log("Combined text that will be sent to OpenAI:");
console.log("=====================================");
console.log(combinedReferences);
console.log("=====================================");
console.log("Length:", combinedReferences.length, "characters");
console.log("\nThis should clearly detect 'Gaucher's Disease'");

// The prompt that will be sent
const DISEASE_TYPE_PROMPT = `
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
`;

console.log("\n=== PROMPT BEING USED ===");
console.log(DISEASE_TYPE_PROMPT);

console.log("\n=== EXPECTED RESULT ===");
console.log('OpenAI should return: "Gaucher\'s Disease" or "Gaucher Disease"');
