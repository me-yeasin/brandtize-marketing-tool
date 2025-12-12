import Store from 'electron-store'

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

const DEFAULT_PROFILE: AgencyProfile = {
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

interface StoreSchema {
  groqApiKey: string
  serperApiKey: string
  selectedModel: string
  agencyProfile: AgencyProfile
}

const store = new Store<StoreSchema>({
  defaults: {
    groqApiKey: '',
    serperApiKey: '',
    selectedModel: 'llama-3.3-70b-versatile',
    agencyProfile: DEFAULT_PROFILE
  },
  encryptionKey: 'ar-branding-secure-key-2025'
})

export function getApiKeys(): { groqApiKey: string; serperApiKey: string } {
  return {
    groqApiKey: store.get('groqApiKey', ''),
    serperApiKey: store.get('serperApiKey', '')
  }
}

export function setGroqApiKey(key: string): void {
  store.set('groqApiKey', key)
}

export function setSerperApiKey(key: string): void {
  store.set('serperApiKey', key)
}

export function getSelectedModel(): string {
  return store.get('selectedModel', 'llama-3.3-70b-versatile')
}

export function setSelectedModel(model: string): void {
  store.set('selectedModel', model)
}

export function hasRequiredApiKeys(): boolean {
  const keys = getApiKeys()
  return keys.groqApiKey.length > 0 && keys.serperApiKey.length > 0
}

export function getAgencyProfile(): AgencyProfile {
  return store.get('agencyProfile', DEFAULT_PROFILE)
}

export function setAgencyProfile(profile: AgencyProfile): void {
  store.set('agencyProfile', profile)
}

export function hasAgencyProfile(): boolean {
  const profile = getAgencyProfile()
  const typeOk = profile.type === 'agency' || profile.type === 'freelancer'
  const nameOk = profile.name.trim().length > 0
  const servicesOk = profile.services.some((s) => s.trim().length > 0)
  return typeOk && nameOk && servicesOk
}

export { store }
