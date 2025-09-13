export const MODEL_CONFIG = {
  'gpt-4o-mini': {
    apiType: 'chat' as const,
    supportsTemperature: true,
    maxTokens: 4096
  },
  'gpt-4o': {
    apiType: 'chat' as const,
    supportsTemperature: true,
    maxTokens: 4096
  },
  'gpt-4.1-mini': {
    apiType: 'responses' as const,
    supportsTemperature: true,
    maxTokens: 8192
  },
  'gpt-4.1-nano': {
    apiType: 'responses' as const,
    supportsTemperature: true,
    maxTokens: 8192
  },
  'gpt-5-mini': {
    apiType: 'responses' as const,
    supportsTemperature: false,
    maxTokens: 8192
  }
} as const;

export const AVAILABLE_MODELS = Object.keys(MODEL_CONFIG);

export type ModelName = keyof typeof MODEL_CONFIG;