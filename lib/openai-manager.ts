// lib/openai-manager.ts
class OpenAIKeyManager {
  private keys: string[]
  private currentIndex: number = 0
  private keyUsage: Map<string, { requests: number, lastReset: number }> = new Map()
  
  constructor() {
    this.keys = [
      process.env.OPENAI_API_KEY_1,
      process.env.OPENAI_API_KEY_2,
      process.env.OPENAI_API_KEY_3,
      process.env.OPENAI_API_KEY_4,
    ].filter((key): key is string => !!key) // Type-safe filter
    
    if (this.keys.length === 0) {
      throw new Error('No OpenAI API keys found in environment variables')
    }
    
    console.log(`🔑 Loaded ${this.keys.length} OpenAI API keys`)
  }
  
  getNextKey(): string {
    // Round-robin rotation
    const key = this.keys[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.keys.length
    
    // Track usage (optional - for monitoring)
    const usage = this.keyUsage.get(key) || { requests: 0, lastReset: Date.now() }
    usage.requests++
    this.keyUsage.set(key, usage)
    
    return key
  }
  
  // Optional: Get key with lowest usage
  getLeastUsedKey(): string {
    let leastUsedKey = this.keys[0]
    let minUsage = Infinity
    
    for (const key of this.keys) {
      const usage = this.keyUsage.get(key)?.requests || 0
      if (usage < minUsage) {
        minUsage = usage
        leastUsedKey = key
      }
    }
    
    return leastUsedKey
  }
}

export const openAIKeyManager = new OpenAIKeyManager()