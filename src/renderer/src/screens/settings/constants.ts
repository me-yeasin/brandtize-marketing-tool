import type { AgencyProfile } from './types'

export const DEFAULT_PROFILE: AgencyProfile = {
  type: 'freelancer',
  name: '',
  tagline: '',
  bio: '',
  services: [],
  skills: [],
  yearsOfExperience: 0,
  portfolio: [],
  contact: {
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    country: ''
  },
  social: {}
}

export const GROQ_MODELS = [
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

export const MISTRAL_MODELS = [
  { id: 'mistral-large-2512', name: 'Mistral Large 2512' },
  { id: 'mistral-medium-2508', name: 'Mistral Medium 2508' },
  { id: 'codestral-2508', name: 'Codestral 2508' },
  { id: 'mistral-small-2506', name: 'Mistral Small 2506' },
  { id: 'ministral-14b-2512', name: 'Ministral 14B 2512' },
  { id: 'ministral-8b-2512', name: 'Ministral 8B 2512' },
  { id: 'ministral-3b-2512', name: 'Ministral 3B 2512' },
  { id: 'magistral-medium-2509', name: 'Magistral Medium 2509' },
  { id: 'magistral-small-2509', name: 'Magistral Small 2509' }
]

export const GOOGLE_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' }
]
