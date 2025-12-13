export interface GroqModel {
  id: string
  name: string
}

export const GROQ_MODELS: GroqModel[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B' },
  { id: 'openai/gpt-oss-safeguard-20b', name: 'GPT OSS Safeguard 20B' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
  { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2 Instruct 0905' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct' },
  { id: 'meta-llama/llama-prompt-guard-2-86m', name: 'Llama Prompt Guard 2 86M' },
  { id: 'meta-llama/llama-prompt-guard-2-22m', name: 'Llama Prompt Guard 2 22M' },
  { id: 'meta-llama/llama-guard-4-12b', name: 'Llama Guard 4 12B' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' }
]

export function getModelIds(): string[] {
  return GROQ_MODELS.map((m) => m.id)
}

export function getNextModelIndex(currentIndex: number): number {
  return (currentIndex + 1) % GROQ_MODELS.length
}

export function findModelIndex(modelId: string): number {
  const index = GROQ_MODELS.findIndex((m) => m.id === modelId)
  return index === -1 ? 0 : index
}
