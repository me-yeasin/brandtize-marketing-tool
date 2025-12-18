import { ElectronAPI } from '@electron-toolkit/preload'

type AiProvider = 'groq' | 'mistral' | 'google'
type GoogleMode = 'aiStudio' | 'vertexApiKey'

interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

interface MultiKeys {
  serper: ApiKeyEntry[]
  jina: ApiKeyEntry[]
  neutrino: ApiKeyEntry[]
  linkPreview: ApiKeyEntry[]
  hunter: ApiKeyEntry[]
  reoon: ApiKeyEntry[]
}

interface AiProviderMultiKeys {
  groq: ApiKeyEntry[]
  mistral: ApiKeyEntry[]
  google: ApiKeyEntry[]
}

interface ApiKeys {
  groqApiKey: string
  mistralApiKey: string
  googleApiKey: string
  serperApiKey: string
  hunterApiKey: string
  reoonApiKey: string
  jinaApiKey: string
  neutrinoApiKey: string
  neutrinoUserId: string
  linkPreviewApiKey: string
  snovClientId: string
  snovClientSecret: string
  hasGroqKey: boolean
  hasMistralKey: boolean
  hasGoogleKey: boolean
  hasSerperKey: boolean
  hasHunterKey: boolean
  hasReoonKey: boolean
  hasJinaKey: boolean
  hasNeutrinoKey: boolean
  hasLinkPreviewKey: boolean
  hasSnovKey: boolean
}

interface PortfolioProject {
  id: string
  title: string
  description: string
  clientName?: string
  projectUrl?: string
  technologies: string[]
  completedAt?: string
}

interface AgencyProfile {
  type: 'agency' | 'freelancer'
  name: string
  tagline: string
  bio: string
  services: string[]
  skills: string[]
  yearsOfExperience: number
  portfolio: PortfolioProject[]
  contact: {
    email: string
    phone: string
    website: string
    address: string
    city: string
    country: string
  }
  social: {
    linkedin?: string
    twitter?: string
    github?: string
    dribbble?: string
    behance?: string
  }
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

interface Api {
  getApiKeys: () => Promise<ApiKeys>
  setGroqApiKey: (key: string) => Promise<{ success: boolean }>
  setMistralApiKey: (key: string) => Promise<{ success: boolean }>
  setGoogleApiKey: (key: string) => Promise<{ success: boolean }>
  setSerperApiKey: (key: string) => Promise<{ success: boolean }>
  setHunterApiKey: (key: string) => Promise<{ success: boolean }>
  setReoonApiKey: (key: string) => Promise<{ success: boolean }>
  setJinaApiKey: (key: string) => Promise<{ success: boolean }>
  setNeutrinoApiKey: (key: string) => Promise<{ success: boolean }>
  setNeutrinoUserId: (userId: string) => Promise<{ success: boolean }>
  setLinkPreviewApiKey: (key: string) => Promise<{ success: boolean }>
  setSnovClientId: (clientId: string) => Promise<{ success: boolean }>
  setSnovClientSecret: (clientSecret: string) => Promise<{ success: boolean }>
  hasRequiredKeys: () => Promise<boolean>
  getSelectedModel: () => Promise<string>
  setSelectedModel: (model: string) => Promise<{ success: boolean }>
  getSelectedAiProvider: () => Promise<AiProvider>
  setSelectedAiProvider: (provider: AiProvider) => Promise<{ success: boolean }>
  getSelectedGoogleMode: () => Promise<GoogleMode>
  setSelectedGoogleMode: (mode: GoogleMode) => Promise<{ success: boolean }>
  getGoogleProjectId: () => Promise<string>
  setGoogleProjectId: (projectId: string) => Promise<{ success: boolean }>
  getGoogleLocation: () => Promise<string>
  setGoogleLocation: (location: string) => Promise<{ success: boolean }>
  getProfile: () => Promise<AgencyProfile>
  setProfile: (profile: AgencyProfile) => Promise<{ success: boolean }>
  hasProfile: () => Promise<boolean>
  // Multi-key API methods
  getMultiKeys: () => Promise<MultiKeys>
  setMultiKeys: (
    service: string,
    keys: ApiKeyEntry[]
  ) => Promise<{ success: boolean; error?: string }>
  // AI Provider multi-key methods
  getAiProviderMultiKeys: () => Promise<AiProviderMultiKeys>
  setAiProviderMultiKeys: (
    provider: string,
    keys: ApiKeyEntry[]
  ) => Promise<{ success: boolean; error?: string }>
  streamChat: (messages: ChatMessage[]) => Promise<{ success: boolean; error?: string }>
  onChatToken: (callback: (token: string) => void) => () => void
  onChatComplete: (callback: (fullText: string) => void) => () => void
  onChatError: (callback: (error: string) => void) => () => void
  onChatRetry: (
    callback: (data: { model: string; attempt: number; maxAttempts: number }) => void
  ) => () => void
  onChatModelSwitch: (
    callback: (data: { fromModel: string; toModel: string }) => void
  ) => () => void

  // Lead Generation
  generateLeads: (input: {
    searchQuery: string
    niche: string
    location: string
  }) => Promise<{ success: boolean; error?: string }>
  onLeadsSearchStart: (cb: (query: string) => void) => () => void
  onLeadsSearchComplete: (cb: (results: unknown[]) => void) => () => void
  onLeadsCleanupProgress: (
    cb: (data: {
      current: number
      total: number
      url: string
      status: 'processing' | 'blocked' | 'allowed'
      service?: string
      category?: string
    }) => void
  ) => () => void
  onLeadsServiceSwitched: (
    cb: (data: { from: string; to: string; reason: string }) => void
  ) => () => void
  onLeadsProtectedUrl: (cb: (data: { url: string; reason: string }) => void) => () => void
  onLeadsCleanupComplete: (cb: (urls: string[]) => void) => () => void
  onLeadsScrapeStart: (cb: (url: string) => void) => () => void
  onLeadsScrapeComplete: (cb: (data: { url: string; content: unknown }) => void) => () => void
  onLeadsScrapeError: (cb: (data: { url: string; error: string }) => void) => () => void
  onLeadsAiStart: (cb: (url: string) => void) => () => void
  onLeadsAiResult: (
    cb: (data: { url: string; email: string | null; decisionMaker: string | null }) => void
  ) => () => void
  onLeadsServiceMatchStart: (cb: (url: string) => void) => () => void
  onLeadsServiceMatchResult: (
    cb: (data: { url: string; needsServices: boolean; reason: string | null }) => void
  ) => () => void
  onLeadsHunterStart: (cb: (data: { url: string; type: string }) => void) => () => void
  onLeadsHunterResult: (cb: (data: { url: string; email: string | null }) => void) => () => void
  onLeadsVerifyStart: (cb: (email: string) => void) => () => void
  onLeadsVerifyResult: (cb: (data: { email: string; verified: boolean }) => void) => () => void
  onLeadFound: (cb: (lead: unknown) => void) => () => void
  onLeadsComplete: (cb: (leads: unknown[]) => void) => () => void
  onLeadsError: (cb: (error: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
