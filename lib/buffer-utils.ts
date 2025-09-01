// lib/buffer-utils.ts
// Utility to help with Buffer deprecation warnings

export function createSafeBuffer(data: any, encoding?: BufferEncoding): Buffer {
  // Use Buffer.from() instead of deprecated Buffer() constructor
  if (typeof data === 'string') {
    return Buffer.from(data, encoding || 'utf8')
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data)
  }
  if (Array.isArray(data)) {
    return Buffer.from(data)
  }
  // For other types, let Buffer.from handle it
  return Buffer.from(data)
}

// Helper to log buffer creation for debugging
export function debugBuffer(data: any, location: string): Buffer {
  console.log(`Buffer created at: ${location}`)
  return createSafeBuffer(data)
}
