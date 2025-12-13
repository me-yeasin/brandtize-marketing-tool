export interface AiModel {
  id: string
  name: string
}

export interface GroqModel extends AiModel {}
export interface MistralModel extends AiModel {}

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

export const MISTRAL_MODELS: MistralModel[] = [
  { id: 'mistral-large-2512', name: 'Mistral Large 2512' },
  { id: 'mistral-medium-2508', name: 'Mistral Medium 2508' },
  { id: 'codestral-2508', name: 'Codestral 2508' },
  { id: 'mistral-small-2506', name: 'Mistral Small 2506' },
  { id: 'ministral-14b-2512', name: 'Ministral 14B 2512' },
  { id: 'ministral-8b-2512', name: 'Ministral 8B 2512' },
  { id: 'ministral-3b-2512', name: 'Ministral 3B 2512' },
  { id: 'magistral-medium-2509', name: 'Magistral Medium 2509' },
  { id: 'magistral-small-2509', name: 'Magistral Small 2509' }
  // Add more Mistral models here as needed
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

export function getMistralModelIds(): string[] {
  return MISTRAL_MODELS.map((m) => m.id)
}

export function getNextMistralModelIndex(currentIndex: number): number {
  return (currentIndex + 1) % MISTRAL_MODELS.length
}

export function findMistralModelIndex(modelId: string): number {
  const index = MISTRAL_MODELS.findIndex((m) => m.id === modelId)
  return index === -1 ? 0 : index
}
