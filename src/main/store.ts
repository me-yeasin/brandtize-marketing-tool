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

export type AiProvider = 'groq' | 'mistral' | 'google'
export type GoogleMode = 'aiStudio' | 'vertexApiKey'

interface StoreSchema {
  groqApiKey: string
  mistralApiKey: string
  googleApiKey: string
  serperApiKey: string
  hunterApiKey: string
  reoonApiKey: string
  jinaApiKey: string
  selectedAiProvider: AiProvider
  selectedGoogleMode: GoogleMode
  selectedGroqModel: string
  selectedMistralModel: string
  selectedGoogleModel: string
  googleProjectId: string
  googleLocation: string
  agencyProfile: AgencyProfile
}

const store = new Store<StoreSchema>({
  defaults: {
    groqApiKey: '',
    mistralApiKey: '',
    googleApiKey: '',
    serperApiKey: '',
    hunterApiKey: '',
    reoonApiKey: '',
    jinaApiKey: '',
    selectedAiProvider: 'groq',
    selectedGoogleMode: 'aiStudio',
    selectedGroqModel: 'llama-3.3-70b-versatile',
    selectedMistralModel: 'mistral-large-2512',
    selectedGoogleModel: 'gemini-2.0-flash',
    googleProjectId: '',
    googleLocation: 'us-central1',
    agencyProfile: DEFAULT_PROFILE
  },
  encryptionKey: 'ar-branding-secure-key-2025'
})

export function getApiKeys(): {
  groqApiKey: string
  mistralApiKey: string
  googleApiKey: string
  serperApiKey: string
  hunterApiKey: string
  reoonApiKey: string
  jinaApiKey: string
} {
  return {
    groqApiKey: store.get('groqApiKey', ''),
    mistralApiKey: store.get('mistralApiKey', ''),
    googleApiKey: store.get('googleApiKey', ''),
    serperApiKey: store.get('serperApiKey', ''),
    hunterApiKey: store.get('hunterApiKey', ''),
    reoonApiKey: store.get('reoonApiKey', ''),
    jinaApiKey: store.get('jinaApiKey', '')
  }
}

export function setGroqApiKey(key: string): void {
  store.set('groqApiKey', key)
}

export function setSerperApiKey(key: string): void {
  store.set('serperApiKey', key)
}

export function setHunterApiKey(key: string): void {
  store.set('hunterApiKey', key)
}

export function setReoonApiKey(key: string): void {
  store.set('reoonApiKey', key)
}

export function setJinaApiKey(key: string): void {
  store.set('jinaApiKey', key)
}

export function setMistralApiKey(key: string): void {
  store.set('mistralApiKey', key)
}

export function setGoogleApiKey(key: string): void {
  store.set('googleApiKey', key)
}

export function getSelectedAiProvider(): AiProvider {
  return store.get('selectedAiProvider', 'groq')
}

export function setSelectedAiProvider(provider: AiProvider): void {
  store.set('selectedAiProvider', provider)
}

export function getSelectedModel(): string {
  const provider = getSelectedAiProvider()
  if (provider === 'mistral') {
    return store.get('selectedMistralModel', 'mistral-large-2512')
  }
  if (provider === 'google') {
    return store.get('selectedGoogleModel', 'gemini-2.0-flash')
  }
  return store.get('selectedGroqModel', 'llama-3.3-70b-versatile')
}

export function setSelectedModel(model: string): void {
  const provider = getSelectedAiProvider()
  if (provider === 'mistral') {
    store.set('selectedMistralModel', model)
  } else if (provider === 'google') {
    store.set('selectedGoogleModel', model)
  } else {
    store.set('selectedGroqModel', model)
  }
}

export function getSelectedGroqModel(): string {
  return store.get('selectedGroqModel', 'llama-3.3-70b-versatile')
}

export function getSelectedMistralModel(): string {
  return store.get('selectedMistralModel', 'mistral-large-2512')
}

export function getSelectedGoogleModel(): string {
  return store.get('selectedGoogleModel', 'gemini-2.0-flash')
}

export function getSelectedGoogleMode(): GoogleMode {
  return store.get('selectedGoogleMode', 'aiStudio')
}

export function setSelectedGoogleMode(mode: GoogleMode): void {
  store.set('selectedGoogleMode', mode)
}

export function getGoogleProjectId(): string {
  return store.get('googleProjectId', '')
}

export function setGoogleProjectId(projectId: string): void {
  store.set('googleProjectId', projectId)
}

export function getGoogleLocation(): string {
  return store.get('googleLocation', 'us-central1')
}

export function setGoogleLocation(location: string): void {
  store.set('googleLocation', location)
}

export function hasRequiredApiKeys(): boolean {
  const keys = getApiKeys()
  const provider = getSelectedAiProvider()
  let hasAiKey = false
  if (provider === 'mistral') {
    hasAiKey = keys.mistralApiKey.length > 0
  } else if (provider === 'google') {
    hasAiKey = keys.googleApiKey.length > 0
  } else {
    hasAiKey = keys.groqApiKey.length > 0
  }
  return hasAiKey && keys.serperApiKey.length > 0
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
