import { ElectronAPI } from '@electron-toolkit/preload'

interface ApiKeys {
  groqApiKey: string
  serperApiKey: string
  hasGroqKey: boolean
  hasSerperKey: boolean
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
  setSerperApiKey: (key: string) => Promise<{ success: boolean }>
  hasRequiredKeys: () => Promise<boolean>
  getSelectedModel: () => Promise<string>
  setSelectedModel: (model: string) => Promise<{ success: boolean }>
  getProfile: () => Promise<AgencyProfile>
  setProfile: (profile: AgencyProfile) => Promise<{ success: boolean }>
  hasProfile: () => Promise<boolean>
  streamChat: (messages: ChatMessage[]) => Promise<{ success: boolean; error?: string }>
  onChatToken: (callback: (token: string) => void) => () => void
  onChatComplete: (callback: (fullText: string) => void) => () => void
  onChatError: (callback: (error: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
