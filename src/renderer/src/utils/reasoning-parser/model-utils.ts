/**
 * Check if a model ID is likely a reasoning model that outputs thinking.
 * This is a heuristic based on known model naming patterns.
 */
function isLikelyReasoningModel(modelId: string): boolean {
  const id = modelId.toLowerCase()

  const reasoningPatterns = [
    // DeepSeek reasoning models
    'deepseek-r1',
    'deepseek-reasoner',
    // Qwen reasoning models
    'qwen3',
    'qwq',
    'qwen-reasoning',
    // OpenAI reasoning (though tokens are hidden)
    'o1',
    'o3',
    'o1-preview',
    'o1-mini',
    'o3-mini',
    // Anthropic with extended thinking
    'claude-3-7',
    'claude-4',
    // xAI Grok with reasoning
    'grok-3',
    'grok-4',
    // Mistral reasoning
    'magistral',
    // Google reasoning
    'gemini-2',
    'gemini-thinking',
    // Generic patterns
    'reasoning',
    'thinking',
    '-r1',
    '-cot'
  ]

  return reasoningPatterns.some((pattern) => id.includes(pattern))
}

export { isLikelyReasoningModel }
