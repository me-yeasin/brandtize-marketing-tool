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

// Multi-key support for API rotation
export interface ApiKeyEntry {
  key: string
  userId?: string // For services like Neutrino that need userId
  label?: string // Optional label for identification
}

// Processed domain entry for deduplication
export interface ProcessedDomain {
  id: string
  domain: string
  url: string
  email: string | null
  decisionMaker: string | null
  verified: boolean
  source: string
  processedAt: number // timestamp
  searchQuery?: string
}

// Found lead entry
export interface FoundLead {
  id: string
  email: string
  domain: string
  url: string
  decisionMaker: string | null
  verified: boolean
  source: string
  foundAt: number // timestamp
  searchQuery?: string
  niche?: string
  location?: string
}

interface StoreSchema {
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
  // Multi-key arrays for rotation
  serperApiKeys: ApiKeyEntry[]
  jinaApiKeys: ApiKeyEntry[]
  neutrinoApiKeys: ApiKeyEntry[] // Each entry has key + userId
  linkPreviewApiKeys: ApiKeyEntry[]
  hunterApiKeys: ApiKeyEntry[]
  reoonApiKeys: ApiKeyEntry[]
  snovApiKeys: ApiKeyEntry[] // Each entry has key (clientId) + userId (clientSecret)
  // AI Provider multi-key arrays for rotation
  groqApiKeys: ApiKeyEntry[]
  mistralApiKeys: ApiKeyEntry[]
  googleApiKeys: ApiKeyEntry[]
  selectedAiProvider: AiProvider
  selectedGoogleMode: GoogleMode
  selectedGroqModel: string
  selectedMistralModel: string
  selectedGoogleModel: string
  googleProjectId: string
  googleLocation: string
  agencyProfile: AgencyProfile
  // Results storage for deduplication
  processedDomains: ProcessedDomain[]
  foundLeads: FoundLead[]
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
    neutrinoApiKey: '',
    neutrinoUserId: '',
    linkPreviewApiKey: '',
    snovClientId: '',
    snovClientSecret: '',
    // Multi-key arrays (empty by default)
    serperApiKeys: [],
    jinaApiKeys: [],
    neutrinoApiKeys: [],
    linkPreviewApiKeys: [],
    hunterApiKeys: [],
    reoonApiKeys: [],
    snovApiKeys: [],
    // AI Provider multi-key arrays
    groqApiKeys: [],
    mistralApiKeys: [],
    googleApiKeys: [],
    selectedAiProvider: 'groq',
    selectedGoogleMode: 'aiStudio',
    selectedGroqModel: 'llama-3.3-70b-versatile',
    selectedMistralModel: 'mistral-large-2512',
    selectedGoogleModel: 'gemini-2.0-flash',
    googleProjectId: '',
    googleLocation: 'us-central1',
    agencyProfile: DEFAULT_PROFILE,
    // Results storage (empty by default)
    processedDomains: [],
    foundLeads: []
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
  neutrinoApiKey: string
  neutrinoUserId: string
  linkPreviewApiKey: string
  snovClientId: string
  snovClientSecret: string
} {
  return {
    groqApiKey: store.get('groqApiKey', ''),
    mistralApiKey: store.get('mistralApiKey', ''),
    googleApiKey: store.get('googleApiKey', ''),
    serperApiKey: store.get('serperApiKey', ''),
    hunterApiKey: store.get('hunterApiKey', ''),
    reoonApiKey: store.get('reoonApiKey', ''),
    jinaApiKey: store.get('jinaApiKey', ''),
    neutrinoApiKey: store.get('neutrinoApiKey', ''),
    neutrinoUserId: store.get('neutrinoUserId', ''),
    linkPreviewApiKey: store.get('linkPreviewApiKey', ''),
    snovClientId: store.get('snovClientId', ''),
    snovClientSecret: store.get('snovClientSecret', '')
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

export function setNeutrinoApiKey(key: string): void {
  store.set('neutrinoApiKey', key)
}

export function setNeutrinoUserId(userId: string): void {
  store.set('neutrinoUserId', userId)
}

export function setLinkPreviewApiKey(key: string): void {
  store.set('linkPreviewApiKey', key)
}

export function setSnovClientId(clientId: string): void {
  store.set('snovClientId', clientId)
}

export function setSnovClientSecret(clientSecret: string): void {
  store.set('snovClientSecret', clientSecret)
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

// Multi-key getters and setters
export function getSerperApiKeys(): ApiKeyEntry[] {
  return store.get('serperApiKeys', [])
}

export function setSerperApiKeys(keys: ApiKeyEntry[]): void {
  store.set('serperApiKeys', keys)
}

export function getJinaApiKeys(): ApiKeyEntry[] {
  return store.get('jinaApiKeys', [])
}

export function setJinaApiKeys(keys: ApiKeyEntry[]): void {
  store.set('jinaApiKeys', keys)
}

export function getNeutrinoApiKeys(): ApiKeyEntry[] {
  return store.get('neutrinoApiKeys', [])
}

export function setNeutrinoApiKeys(keys: ApiKeyEntry[]): void {
  store.set('neutrinoApiKeys', keys)
}

export function getLinkPreviewApiKeys(): ApiKeyEntry[] {
  return store.get('linkPreviewApiKeys', [])
}

export function setLinkPreviewApiKeys(keys: ApiKeyEntry[]): void {
  store.set('linkPreviewApiKeys', keys)
}

export function getHunterApiKeys(): ApiKeyEntry[] {
  return store.get('hunterApiKeys', [])
}

export function setHunterApiKeys(keys: ApiKeyEntry[]): void {
  store.set('hunterApiKeys', keys)
}

export function getReoonApiKeys(): ApiKeyEntry[] {
  return store.get('reoonApiKeys', [])
}

export function setReoonApiKeys(keys: ApiKeyEntry[]): void {
  store.set('reoonApiKeys', keys)
}

export function getSnovApiKeys(): ApiKeyEntry[] {
  return store.get('snovApiKeys', [])
}

export function setSnovApiKeys(keys: ApiKeyEntry[]): void {
  store.set('snovApiKeys', keys)
}

// AI Provider multi-key getters and setters
export function getGroqApiKeys(): ApiKeyEntry[] {
  return store.get('groqApiKeys', [])
}

export function setGroqApiKeys(keys: ApiKeyEntry[]): void {
  store.set('groqApiKeys', keys)
}

export function getMistralApiKeys(): ApiKeyEntry[] {
  return store.get('mistralApiKeys', [])
}

export function setMistralApiKeys(keys: ApiKeyEntry[]): void {
  store.set('mistralApiKeys', keys)
}

export function getGoogleApiKeys(): ApiKeyEntry[] {
  return store.get('googleApiKeys', [])
}

export function setGoogleApiKeys(keys: ApiKeyEntry[]): void {
  store.set('googleApiKeys', keys)
}

// Get all multi-keys for a specific service category
export function getAllMultiKeys(): {
  serper: ApiKeyEntry[]
  jina: ApiKeyEntry[]
  neutrino: ApiKeyEntry[]
  linkPreview: ApiKeyEntry[]
  hunter: ApiKeyEntry[]
  reoon: ApiKeyEntry[]
  snov: ApiKeyEntry[]
} {
  return {
    serper: getSerperApiKeys(),
    jina: getJinaApiKeys(),
    neutrino: getNeutrinoApiKeys(),
    linkPreview: getLinkPreviewApiKeys(),
    hunter: getHunterApiKeys(),
    reoon: getReoonApiKeys(),
    snov: getSnovApiKeys()
  }
}

// Processed domains functions
export function getProcessedDomains(): ProcessedDomain[] {
  return store.get('processedDomains', [])
}

export function addProcessedDomain(domain: ProcessedDomain): void {
  const domains = getProcessedDomains()
  // Check if domain already exists, update if so
  const existingIndex = domains.findIndex((d) => d.domain === domain.domain)
  if (existingIndex >= 0) {
    domains[existingIndex] = domain
  } else {
    domains.push(domain)
  }
  store.set('processedDomains', domains)
}

export function removeProcessedDomain(id: string): void {
  const domains = getProcessedDomains().filter((d) => d.id !== id)
  store.set('processedDomains', domains)
}

export function clearProcessedDomains(): void {
  store.set('processedDomains', [])
}

export function isDomainProcessed(domain: string): ProcessedDomain | null {
  const domains = getProcessedDomains()
  return domains.find((d) => d.domain === domain) || null
}

// Found leads functions
export function getFoundLeads(): FoundLead[] {
  return store.get('foundLeads', [])
}

export function addFoundLead(lead: FoundLead): void {
  const leads = getFoundLeads()
  // Check if email already exists, update if so
  const existingIndex = leads.findIndex((l) => l.email === lead.email)
  if (existingIndex >= 0) {
    leads[existingIndex] = lead
  } else {
    leads.push(lead)
  }
  store.set('foundLeads', leads)
}

export function removeFoundLead(id: string): void {
  const leads = getFoundLeads().filter((l) => l.id !== id)
  store.set('foundLeads', leads)
}

export function clearFoundLeads(): void {
  store.set('foundLeads', [])
}

export { store }
