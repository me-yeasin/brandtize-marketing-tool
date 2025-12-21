export type SettingsTab = 'profile' | 'ai-provider' | 'search-api' | 'email' | 'strategy'

export type AiProvider = 'groq' | 'mistral' | 'google'
export type GoogleMode = 'aiStudio' | 'vertexApiKey'

export interface PortfolioProject {
  id: string
  title: string
  description: string
  clientName?: string
  projectUrl?: string
  technologies: string[]
  completedAt?: string
}

export interface AgencyProfile {
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

export type MessageState = { type: 'success' | 'error'; text: string } | null
