import { ElectronAPI } from '@electron-toolkit/preload'

// API Key Entry type
export interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

// API interface for renderer
export interface BrandtizeAPI {
  // Get all API keys
  getApiKeys: () => Promise<{
    groqApiKey: string
    mistralApiKey: string
    googleApiKey: string
    serperApiKey: string
    hunterApiKey: string
    reoonApiKey: string
    jinaApiKey: string
    snovClientId: string
    snovClientSecret: string
  }>

  // Groq
  getGroqApiKey: () => Promise<string>
  setGroqApiKey: (key: string) => Promise<boolean>
  getGroqApiKeys: () => Promise<ApiKeyEntry[]>
  setGroqApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // Mistral
  getMistralApiKey: () => Promise<string>
  setMistralApiKey: (key: string) => Promise<boolean>
  getMistralApiKeys: () => Promise<ApiKeyEntry[]>
  setMistralApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // Google (Gemini)
  getGoogleApiKey: () => Promise<string>
  setGoogleApiKey: (key: string) => Promise<boolean>
  getGoogleApiKeys: () => Promise<ApiKeyEntry[]>
  setGoogleApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // Serper
  getSerperApiKey: () => Promise<string>
  setSerperApiKey: (key: string) => Promise<boolean>
  getSerperApiKeys: () => Promise<ApiKeyEntry[]>
  setSerperApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // Jina
  getJinaApiKey: () => Promise<string>
  setJinaApiKey: (key: string) => Promise<boolean>
  getJinaApiKeys: () => Promise<ApiKeyEntry[]>
  setJinaApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // Hunter
  getHunterApiKey: () => Promise<string>
  setHunterApiKey: (key: string) => Promise<boolean>
  getHunterApiKeys: () => Promise<ApiKeyEntry[]>
  setHunterApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // Reoon
  getReoonApiKey: () => Promise<string>
  setReoonApiKey: (key: string) => Promise<boolean>
  getReoonApiKeys: () => Promise<ApiKeyEntry[]>
  setReoonApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // Snov
  getSnovCredentials: () => Promise<{ clientId: string; clientSecret: string }>
  setSnovCredentials: (clientId: string, clientSecret: string) => Promise<boolean>
  getSnovApiKeys: () => Promise<ApiKeyEntry[]>
  setSnovApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: BrandtizeAPI
  }
}
