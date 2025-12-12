import { ElectronAPI } from '@electron-toolkit/preload'

interface ApiKeys {
  groqApiKey: string
  serperApiKey: string
  hasGroqKey: boolean
  hasSerperKey: boolean
}

interface AgentEvent {
  type: 'response' | 'thinking' | 'search' | 'status'
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

interface ExtractedLead {
  id: string
  email: string
  source: string
  context: {
    businessName?: string
    businessType?: string
    location?: string
    website?: string
    needs?: string[]
    summary: string
  }
  template: {
    subject: string
    body: string
  }
  foundAt: number
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

interface Api {
  getApiKeys: () => Promise<ApiKeys>
  setGroqApiKey: (key: string) => Promise<{ success: boolean }>
  setSerperApiKey: (key: string) => Promise<{ success: boolean }>
  hasRequiredKeys: () => Promise<boolean>
  getSelectedModel: () => Promise<string>
  setSelectedModel: (model: string) => Promise<{ success: boolean }>
  getProfile: () => Promise<AgencyProfile>
  setProfile: (profile: AgencyProfile) => Promise<{ success: boolean }>
  hasProfile: () => Promise<boolean>
  startAgent: (tabId: string, niche: string) => Promise<{ success: boolean; error?: string }>
  stopAgent: (tabId: string) => Promise<{ success: boolean; error?: string }>
  onAgentEvent: (callback: (data: { tabId: string; event: AgentEvent }) => void) => () => void
  onAgentLead: (callback: (data: { tabId: string; lead: ExtractedLead }) => void) => () => void
  onAgentComplete: (callback: (data: { tabId: string }) => void) => () => void
  onAgentError: (callback: (data: { tabId: string; error: string }) => void) => () => void
  openMail: (to: string, subject: string, body: string) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
