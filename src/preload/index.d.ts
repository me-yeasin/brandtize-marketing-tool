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
  hunter: ApiKeyEntry[]
  reoon: ApiKeyEntry[]
  snov: ApiKeyEntry[]
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
  snovClientId: string
  snovClientSecret: string
  hasGroqKey: boolean
  hasMistralKey: boolean
  hasGoogleKey: boolean
  hasSerperKey: boolean
  hasHunterKey: boolean
  hasReoonKey: boolean
  hasJinaKey: boolean
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
    tabId: string
    page?: number
  }) => Promise<{ success: boolean; error?: string }>
  onLeadsSearchStart: (cb: (data: { tabId: string; data: string }) => void) => () => void
  onLeadsSearchComplete: (cb: (data: { tabId: string; data: unknown[] }) => void) => () => void
  onLeadsCleanupProgress: (
    cb: (data: {
      tabId: string
      data: {
        current: number
        total: number
        url: string
        status: 'processing' | 'blocked' | 'allowed'
        service?: string
        category?: string
      }
    }) => void
  ) => () => void
  onLeadsServiceSwitched: (
    cb: (data: { tabId: string; data: { from: string; to: string; reason: string } }) => void
  ) => () => void
  onLeadsKeyRotation: (
    cb: (data: {
      tabId: string
      data: { service: string; keyIndex: number; totalKeys: number; reason: string }
    }) => void
  ) => () => void
  onLeadsProtectedUrl: (
    cb: (data: { tabId: string; data: { url: string; reason: string } }) => void
  ) => () => void
  onLeadsCleanupComplete: (cb: (data: { tabId: string; data: string[] }) => void) => () => void
  onLeadsScrapeStart: (cb: (data: { tabId: string; data: string }) => void) => () => void
  onLeadsScrapeComplete: (
    cb: (data: { tabId: string; data: { url: string; content: unknown } }) => void
  ) => () => void
  onLeadsScrapeError: (
    cb: (data: { tabId: string; data: { url: string; error: string } }) => void
  ) => () => void
  onLeadsAiStart: (cb: (data: { tabId: string; data: string }) => void) => () => void
  onLeadsAiResult: (
    cb: (data: {
      tabId: string
      data: { url: string; email: string | null; decisionMaker: string | null }
    }) => void
  ) => () => void
  onLeadsServiceMatchStart: (cb: (data: { tabId: string; data: string }) => void) => () => void
  onLeadsServiceMatchResult: (
    cb: (data: {
      tabId: string
      data: { url: string; needsServices: boolean; reason: string | null }
    }) => void
  ) => () => void
  onLeadsHunterStart: (
    cb: (data: { tabId: string; data: { url: string; type: string } }) => void
  ) => () => void
  onLeadsHunterResult: (
    cb: (data: { tabId: string; data: { url: string; email: string | null } }) => void
  ) => () => void
  onLeadsVerifyStart: (cb: (data: { tabId: string; data: string }) => void) => () => void
  onLeadsVerifyResult: (
    cb: (data: { tabId: string; data: { email: string; verified: boolean } }) => void
  ) => () => void
  onLeadFound: (cb: (data: { tabId: string; data: unknown }) => void) => () => void
  onLeadsComplete: (cb: (data: { tabId: string; data: unknown[] }) => void) => () => void
  onLeadsError: (cb: (data: { tabId: string; data: string }) => void) => () => void

  // Auto-Update API
  checkForUpdates: () => Promise<boolean>
  installUpdate: () => Promise<void>
  onUpdateAvailable: (cb: (data: { version: string; releaseNotes?: string }) => void) => () => void
  onUpdateProgress: (
    cb: (data: {
      percent: number
      bytesPerSecond: number
      transferred: number
      total: number
    }) => void
  ) => () => void
  onUpdateDownloaded: (cb: (data: { version: string; releaseNotes?: string }) => void) => () => void
  onUpdateError: (cb: (error: string) => void) => () => void

  // Template Management
  getTemplates: () => Promise<
    Array<{ id: string; name: string; lastModified: number; createdAt: number; thumbnail?: string }>
  >
  getTemplate: (id: string) => Promise<{
    id: string
    name: string
    thumbnail?: string
    json: Record<string, unknown>
    html?: string
    lastModified: number
    createdAt: number
  } | null>
  saveTemplate: (template: {
    id?: string
    name: string
    thumbnail?: string
    json: Record<string, unknown>
    html?: string
  }) => Promise<{
    id: string
    name: string
    thumbnail?: string
    json: Record<string, unknown>
    html?: string
    lastModified: number
    createdAt: number
  }>
  deleteTemplate: (id: string) => Promise<boolean>

  // Email Pitch Generator
  generateEmailPitch: (input: {
    lead: unknown
    scrapedContent: unknown
    userInstructions?: string
  }) => Promise<{
    success: boolean
    data?: {
      subject: string
      body: string
      strategy_explanation: string
      target_audience_analysis: string
      psychological_triggers_used: string
    }
    error?: string
  }>
  generateEmailPitchForLead: (lead: unknown) => Promise<{
    success: boolean
    data?: {
      subject: string
      body: string
      strategy_explanation: string
      target_audience_analysis: string
      psychological_triggers_used: string
    }
    error?: string
  }>

  // Strategy Management
  // Strategy Management
  getNicheStrategy: () => Promise<{
    niche: string
    targetAudience: string
    serviceAnalysis: {
      painPoints: string[]
      valuePropositions: string[]
      industryJargon: string[]
    }
    personaAnalysis: {
      dailyFears: string[]
      secretDesires: string[]
      commonObjections: string[]
    }
    offerStrategy: {
      grandSlamHooks: string[]
      riskReversals: string[]
      bonuses: string[]
    }
    outreachTactics: {
      winningSubjectLines: string[]
      bestOpeners: string[]
      valueDropMethods: string[]
      structureRules: string[]
    }
    marketingAngles: string[]
    winningFrameworks: string[]
  } | null>

  saveNicheStrategy: (strategy: {
    niche: string
    targetAudience: string
    serviceAnalysis: {
      painPoints: string[]
      valuePropositions: string[]
      industryJargon: string[]
    }
    personaAnalysis: {
      dailyFears: string[]
      secretDesires: string[]
      commonObjections: string[]
    }
    offerStrategy: {
      grandSlamHooks: string[]
      riskReversals: string[]
      bonuses: string[]
    }
    outreachTactics: {
      winningSubjectLines: string[]
      bestOpeners: string[]
      valueDropMethods: string[]
      structureRules: string[]
    }
    marketingAngles: string[]
    winningFrameworks: string[]
  }) => Promise<boolean>

  researchNicheStrategy: (
    niche: string,
    targetAudience: string
  ) => Promise<{
    success: boolean
    data?: {
      niche: string
      targetAudience: string
      serviceAnalysis: {
        painPoints: string[]
        valuePropositions: string[]
        industryJargon: string[]
      }
      personaAnalysis: {
        dailyFears: string[]
        secretDesires: string[]
        commonObjections: string[]
      }
      offerStrategy: {
        grandSlamHooks: string[]
        riskReversals: string[]
        bonuses: string[]
      }
      outreachTactics: {
        winningSubjectLines: string[]
        bestOpeners: string[]
        valueDropMethods: string[]
        structureRules: string[]
      }
      marketingAngles: string[]
      winningFrameworks: string[]
    }
    error?: string
  }>

  onStrategyProgress: (
    cb: (data: {
      pillarId: 'service' | 'persona' | 'offer' | 'tactics'
      pillarName: string
      step: 'waiting' | 'searching' | 'scraping' | 'analyzing' | 'complete' | 'error'
      message: string
      searchQueries?: number
      urlsFound?: number
      urlsScraped?: number
      error?: string
    }) => void
  ) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
