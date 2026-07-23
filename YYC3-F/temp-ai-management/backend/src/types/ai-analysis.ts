export interface AiAnalysisRequest {
  recordId: string
  transactionData: {
    date: string
    amount: number
    currency: string
    description: string
    type: string
    reference?: string
    customerName?: string
  }
  matchingAttempts?: {
    candidateId: string
    similarity: number
    reason: string
  }[]
  historicalContext?: {
    similarTransactions: number
    averageAmount: number
    frequentCustomers: string[]
  }
}

export interface AiAnalysisResponse {
  recordId: string
  rootCause: string
  confidence: number
  recommendations: string[]
  suggestedActions: {
    action: string
    priority: "high" | "medium" | "low"
    estimatedImpact: string
  }[]
  relatedPatterns?: string[]
  analysisTimestamp: Date
  modelVersion: string
}

export interface AiAnalysisPrompt {
  systemMessage: string
  userMessage: string
  temperature: number
  maxTokens: number
}

export interface OpenAIConfig {
  apiKey: string
  model: string
  maxRetries: number
  timeout: number
  organization?: string
}

export interface RateLimitInfo {
  requestsPerMinute: number
  tokensPerMinute: number
  currentRequests: number
  currentTokens: number
  resetTime: Date
}
