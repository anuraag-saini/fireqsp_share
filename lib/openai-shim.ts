import OpenAI from 'openai'
import { MODEL_CONFIG, type ModelName } from './model-config'
import { openAIKeyManager } from './openai-manager'

interface OpenAICall {
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  temperature?: number
  max_tokens?: number
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null
    }
  }>
}

export async function callOpenAI(params: OpenAICall): Promise<OpenAIResponse> {
  const apiKey = openAIKeyManager.getNextKey()
  const openai = new OpenAI({ 
    apiKey,
    timeout: 90 * 1000,
    baseURL: 'https://api.openai.com/v1'
  })

  const modelConfig = MODEL_CONFIG[params.model as ModelName]
  
  if (!modelConfig) {
    console.warn(`⚠️ Unknown model: ${params.model}, falling back to chat API`)
    return await openai.chat.completions.create({
      model: params.model,
      messages: params.messages as any,
      temperature: params.temperature,
      max_tokens: params.max_tokens
    })
  }

  // Use model-specific max tokens if available, otherwise use the passed value
  const maxTokens = modelConfig.maxTokens || params.max_tokens

  // Route to appropriate API
  if (modelConfig.apiType === 'responses') {
    // Convert messages format for Responses API
    const systemMessage = params.messages.find(m => m.role === 'system')?.content || ''
    const userMessage = params.messages.find(m => m.role === 'user')?.content || ''
    
    const inputText = systemMessage ? `${systemMessage}\n\n${userMessage}` : userMessage
    
    // Build parameters for Responses API
    const responseParams: any = {
      model: params.model,
      input: inputText,
      ...(maxTokens && { max_output_tokens: maxTokens })  // ← Use model-specific tokens
    }
    
    // Only add temperature if model supports it
    if (modelConfig.supportsTemperature && params.temperature !== undefined) {
      responseParams.temperature = params.temperature
    } else if (!modelConfig.supportsTemperature && params.temperature !== undefined) {
      console.warn(`⚠️ Model ${params.model} doesn't support temperature, removing parameter`)
    }
    
    console.log(`🔄 Using Responses API for ${params.model} with ${maxTokens} max tokens`)
    const response = await (openai as any).responses.create(responseParams)
    
    // Convert responses API format to chat completions format
    return {
      choices: [{
        message: {
          content: response.output_text || null
        }
      }]
    }
  } else {
    // Use chat completions API for legacy models
    const chatParams: any = {
      model: params.model,
      messages: params.messages,
      ...(maxTokens && { max_tokens: maxTokens })  // ← Use model-specific tokens
    }
    
    // Only add temperature if model supports it
    if (modelConfig.supportsTemperature && params.temperature !== undefined) {
      chatParams.temperature = params.temperature
    } else if (!modelConfig.supportsTemperature && params.temperature !== undefined) {
      console.warn(`⚠️ Model ${params.model} doesn't support temperature, removing parameter`)
    }
    
    console.log(`🔄 Using Chat Completions API for ${params.model} with ${maxTokens} max tokens`)
    return await openai.chat.completions.create(chatParams)
  }
}