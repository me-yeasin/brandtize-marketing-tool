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
  userId?: string // For services like Snov that need userId
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

export interface ScrapedContent {
  url: string
  content: string
  title: string
}

// Voice/Tone Profile for personalized AI writing
export interface VoiceProfile {
  toneDescription: string // Free-form description of their voice
  wordsToUse: string[] // Signature phrases they always use
  wordsToAvoid: string[] // Words to never use (AI-sounding, corporate)
  sampleEmails: string[] // 2-3 example emails they've written
  emailLength: 'short' | 'medium' | 'long' // Preferred email length
  greetingStyle: string // "Hey [Name]", "Hi there", etc.
  signOff: string // "Cheers", "Best", "Talk soon", etc.
  ctaStyle: 'soft' | 'direct' | 'question' // CTA preference
}

const DEFAULT_VOICE_PROFILE: VoiceProfile = {
  toneDescription: '',
  wordsToUse: [],
  wordsToAvoid: [],
  sampleEmails: [],
  emailLength: 'medium',
  greetingStyle: '',
  signOff: '',
  ctaStyle: 'soft'
}

// Stored email pitch (persisted to disk)
export interface StoredEmailPitch {
  leadId: string
  subject: string
  body: string
  strategy_explanation: string
  target_audience_analysis: string
  psychological_triggers_used: string
  generatedAt: number // timestamp
}

// Review interface for storage
export interface Review {
  author: string
  rating: number
  date: string
  text: string
  source?: string
}

// Saved Maps Lead (from Maps Scout)
export interface SavedMapsLead {
  id: string
  name: string
  address: string
  phone: string | null
  website: string | null
  rating: number
  reviewCount: number
  category: string
  score: 'gold' | 'silver' | 'bronze'
  latitude: number
  longitude: number
  email?: string
  emailSource?: string
  emailVerified?: boolean
  hasWhatsApp?: boolean | null
  reviews?: Review[] // Cached reviews
  savedAt: number // timestamp
}

export interface CampaignGroup {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}

export interface Campaign {
  id: string
  name: string
  instruction: string // Instructions for the AI pitch generator
  examples?: string[] // Optional example pitches
  platform: 'whatsapp'
  groupId?: string // Optional group association
  createdAt: number
  updatedAt: number
}

interface StoreSchema {
  groqApiKey: string
  mistralApiKey: string
  googleApiKey: string
  serperApiKey: string
  hunterApiKey: string
  reoonApiKey: string
  jinaApiKey: string
  snovClientId: string
  snovClientSecret: string
  // Multi-key arrays for rotation
  serperApiKeys: ApiKeyEntry[]
  jinaApiKeys: ApiKeyEntry[]
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
  voiceProfile: VoiceProfile
  // Results storage for deduplication
  processedDomains: ProcessedDomain[]
  foundLeads: FoundLead[]
  // Email pitches storage (keyed by lead ID)
  emailPitches: Record<string, StoredEmailPitch>
  // Saved Maps Scout leads
  savedMapsLeads: SavedMapsLead[]
  // WhatsApp Campaigns
  whatsappCampaigns: Campaign[]
  whatsappCampaignGroups: CampaignGroup[]
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
    snovClientId: '',
    snovClientSecret: '',
    // Multi-key arrays (empty by default)
    serperApiKeys: [],
    jinaApiKeys: [],
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
    voiceProfile: DEFAULT_VOICE_PROFILE,
    // Results storage (empty by default)
    processedDomains: [],
    foundLeads: [],
    // Email pitches storage (empty by default)
    emailPitches: {},
    // Saved Maps Scout leads (empty by default)
    savedMapsLeads: [],
    // WhatsApp Campaigns
    whatsappCampaigns: [],
    whatsappCampaignGroups: []
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
  hunter: ApiKeyEntry[]
  reoon: ApiKeyEntry[]
  snov: ApiKeyEntry[]
} {
  return {
    serper: getSerperApiKeys(),
    jina: getJinaApiKeys(),
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

// Voice Profile functions
export function getVoiceProfile(): VoiceProfile {
  return store.get('voiceProfile', DEFAULT_VOICE_PROFILE)
}

export function setVoiceProfile(profile: VoiceProfile): void {
  store.set('voiceProfile', profile)
}

export function hasVoiceProfile(): boolean {
  const profile = getVoiceProfile()
  // Consider voice profile "set" if at least tone description or sample emails are provided
  return profile.toneDescription.trim().length > 0 || profile.sampleEmails.length > 0
}

// Email Pitches functions
export function getEmailPitches(): Record<string, StoredEmailPitch> {
  return store.get('emailPitches', {})
}

export function getEmailPitch(leadId: string): StoredEmailPitch | null {
  const pitches = getEmailPitches()
  return pitches[leadId] || null
}

export function saveEmailPitch(pitch: StoredEmailPitch): void {
  const pitches = getEmailPitches()
  pitches[pitch.leadId] = pitch
  store.set('emailPitches', pitches)
}

export function removeEmailPitch(leadId: string): void {
  const pitches = getEmailPitches()
  delete pitches[leadId]
  store.set('emailPitches', pitches)
}

export function clearEmailPitches(): void {
  store.set('emailPitches', {})
}

// Saved Maps Leads functions
export function getSavedMapsLeads(): SavedMapsLead[] {
  return store.get('savedMapsLeads', [])
}

export function saveMapsLeads(leads: SavedMapsLead[]): number {
  const existingLeads = getSavedMapsLeads()
  const existingIds = new Set(existingLeads.map((l) => l.id))
  const timestamp = Date.now()

  // Filter out leads that already exist
  const newLeads = leads
    .filter((lead) => !existingIds.has(lead.id))
    .map((lead) => ({ ...lead, savedAt: timestamp }))

  // Prepend new leads (add to top)
  const updatedLeads = [...newLeads, ...existingLeads]

  store.set('savedMapsLeads', updatedLeads)

  return newLeads.length
}

export function updateSavedMapsLead(updatedLead: SavedMapsLead): boolean {
  const leads = getSavedMapsLeads()
  const index = leads.findIndex((l) => l.id === updatedLead.id)
  if (index !== -1) {
    leads[index] = updatedLead
    store.set('savedMapsLeads', leads)
    return true
  }
  return false
}

export function removeSavedMapsLead(id: string): void {
  const leads = getSavedMapsLeads().filter((l) => l.id !== id)
  store.set('savedMapsLeads', leads)
}

export function clearSavedMapsLeads(): void {
  store.set('savedMapsLeads', [])
}

// WhatsApp Campaigns Functions
export function getWhatsappCampaigns(): Campaign[] {
  return store.get('whatsappCampaigns', [])
}

export function saveWhatsappCampaign(campaign: Campaign): void {
  const campaigns = getWhatsappCampaigns()
  const existingIndex = campaigns.findIndex((c) => c.id === campaign.id)

  if (existingIndex >= 0) {
    // Update existing
    campaigns[existingIndex] = { ...campaign, updatedAt: Date.now() }
  } else {
    // Add new
    const newCampaign = {
      ...campaign,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    campaigns.push(newCampaign)
  }
  store.set('whatsappCampaigns', campaigns)
}

export function deleteWhatsappCampaign(id: string): void {
  const campaigns = getWhatsappCampaigns().filter((c) => c.id !== id)
  store.set('whatsappCampaigns', campaigns)
}

// WhatsApp Campaign Groups Functions
export function getWhatsappCampaignGroups(): CampaignGroup[] {
  return store.get('whatsappCampaignGroups', [])
}

export function saveWhatsappCampaignGroup(group: CampaignGroup): void {
  const groups = getWhatsappCampaignGroups()
  const existingIndex = groups.findIndex((g) => g.id === group.id)

  if (existingIndex >= 0) {
    // Update existing
    groups[existingIndex] = { ...group, updatedAt: Date.now() }
  } else {
    // Add new
    const newGroup = {
      ...group,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    groups.push(newGroup)
  }
  store.set('whatsappCampaignGroups', groups)
}

export function deleteWhatsappCampaignGroup(id: string): void {
  const groups = getWhatsappCampaignGroups().filter((g) => g.id !== id)
  store.set('whatsappCampaignGroups', groups)

  // Remove group association from campaigns
  const campaigns = getWhatsappCampaigns()
  const updatedCampaigns = campaigns.map((c) =>
    c.groupId === id ? { ...c, groupId: undefined } : c
  )
  store.set('whatsappCampaigns', updatedCampaigns)
}

export { store }
