import { ElectronAPI } from '@electron-toolkit/preload'

// API Key Entry type
export interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

// Pitch Generation types
export interface PitchGenerationInput {
  leadId: string
  name: string
  category: string
  address: string
  rating: number
  reviewCount: number
  website?: string | null
  reviews?: Array<{ text: string; rating: number; author: string }>
  instruction?: string
  buyerPersona?: string
  examples?: string[]
  productLinks?: string[]
  language?: 'en' | 'bn' // Language for pitch generation
}

export interface PitchGenerationStatus {
  status: 'analyzing' | 'generating' | 'observing' | 'refining' | 'done' | 'error'
  message: string
  currentPitch?: string
  refinementCount?: number
}

export interface PitchGenerationResult {
  success: boolean
  pitch?: string
  error?: string
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
  buyerPersona?: string // Optional buyer persona for better targeting
  examples?: string[] // Optional example pitches for few-shot learning
  productLinks?: string[] // Optional product or portfolio links
  language: 'en' | 'bn' // Language for pitch generation (English or Bangla)
  platform: 'whatsapp'
  groupId?: string // Optional group association
  createdAt: number
  updatedAt: number
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
  setSnovClientId: (clientId: string) => Promise<boolean>
  setSnovClientSecret: (clientSecret: string) => Promise<boolean>
  getSnovApiKeys: () => Promise<ApiKeyEntry[]>
  setSnovApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // Apify
  getApifyApiKey: () => Promise<string>
  setApifyApiKey: (key: string) => Promise<boolean>
  getApifyApiKeys: () => Promise<ApiKeyEntry[]>
  setApifyApiKeys: (keys: ApiKeyEntry[]) => Promise<boolean>

  // AI Provider Selection
  getSelectedAiProvider: () => Promise<'groq' | 'mistral' | 'google'>
  setSelectedAiProvider: (provider: 'groq' | 'mistral' | 'google') => Promise<boolean>

  // Maps Scout
  searchGoogleMaps: (params: {
    query: string
    location: string
    countryCode?: string
    num?: number
    // Advanced options
    ll?: string
    latitude?: number
    longitude?: number
    zoom?: number
    hl?: string
    start?: number
    autocomplete?: boolean
    maxPages?: number
  }) => Promise<MapsPlace[]>

  findEmailForDomain: (
    domain: string,
    firstName?: string,
    lastName?: string
  ) => Promise<{ email: string | null; source: string; allKeysExhausted?: boolean }>

  verifyEmail: (email: string) => Promise<{ verified: boolean; source: string; switched: boolean }>

  fetchReviews: (placeId: string, businessName: string, num?: number) => Promise<ReviewsResult>

  // WhatsApp
  whatsappInitialize: () => Promise<{ success: boolean; error?: string }>
  whatsappGetStatus: () => Promise<{
    isReady: boolean
    isInitializing: boolean
    hasQrCode: boolean
    qrCode: string | null
    error: string | null
  }>
  whatsappCheckNumber: (phoneNumber: string) => Promise<{
    hasWhatsApp: boolean
    formattedNumber: string | null
    error: string | null
  }>
  whatsappDisconnect: () => Promise<{ success: boolean }>
  whatsappLogout: () => Promise<{ success: boolean }>

  // WhatsApp Campaigns
  getWhatsappCampaigns: () => Promise<Campaign[]>
  saveWhatsappCampaign: (campaign: Campaign) => Promise<{ success: boolean }>
  deleteWhatsappCampaign: (id: string) => Promise<{ success: boolean }>

  // WhatsApp Campaign Groups
  getWhatsappCampaignGroups: () => Promise<CampaignGroup[]>
  saveWhatsappCampaignGroup: (group: CampaignGroup) => Promise<{ success: boolean }>
  deleteWhatsappCampaignGroup: (id: string) => Promise<{ success: boolean }>

  // WhatsApp event listeners
  onWhatsAppQr: (callback: (qr: string) => void) => void
  onWhatsAppReady: (callback: () => void) => void
  onWhatsAppDisconnected: (callback: (reason: string) => void) => void
  onWhatsAppAuthFailure: (callback: (msg: string) => void) => void

  // Utilities
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>

  // Saved Maps Leads
  getSavedMapsLeads: () => Promise<SavedMapsLead[]>
  saveMapsLeads: (leads: SavedMapsLead[]) => Promise<{ success: boolean; count: number }>
  updateSavedMapsLead: (lead: SavedMapsLead) => Promise<{ success: boolean }>
  removeSavedMapsLead: (id: string) => Promise<{ success: boolean }>
  clearSavedMapsLeads: () => Promise<{ success: boolean }>

  // Saved Facebook Leads
  getSavedFacebookLeads: () => Promise<SavedFacebookLead[]>
  saveFacebookLeads: (leads: SavedFacebookLead[]) => Promise<{ success: boolean; count: number }>
  updateSavedFacebookLead: (lead: SavedFacebookLead) => Promise<{ success: boolean }>
  removeSavedFacebookLead: (id: string) => Promise<{ success: boolean }>
  clearSavedFacebookLeads: () => Promise<{ success: boolean }>

  // WhatsApp Pitch Generator
  generateWhatsAppPitch: (input: PitchGenerationInput) => Promise<PitchGenerationResult>
  onPitchGenerationStatus: (callback: (status: PitchGenerationStatus) => void) => void

  // Facebook Scraper (via Apify)
  searchFacebookPages: (params: {
    searchQuery?: string
    pageUrls?: string[]
    maxResults?: number
  }) => Promise<FacebookPageLead[]>
  scrapeFacebookPageUrls: (urls: string[]) => Promise<FacebookPageLead[]>
  isApifyConfigured: () => Promise<boolean>
}

// Saved Maps Lead type
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
  reviews?: Review[]
  generatedPitch?: string
  pitchGeneratedAt?: number
  savedAt: number
}

// Maps Place type (from Serper Maps API)
export interface MapsPlace {
  title: string
  address: string
  phone: string | null
  website: string | null
  rating: number
  ratingCount: number
  category: string
  cid: string
  latitude: number
  longitude: number
}

// Review types
export interface Review {
  author: string
  rating: number
  date: string
  text: string
  source?: string
}

export interface ReviewsResult {
  businessName: string
  totalReviews: number
  averageRating: number
  reviews: Review[]
}

// Facebook Page Lead type (from Apify Facebook Scraper)
export interface FacebookPageLead {
  id: string
  facebookUrl: string
  title: string
  categories: string[]
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  messenger: string | null
  likes: number
  followers: number
  rating: number | null
  ratingCount: number | null
  intro: string | null
  adStatus: string | null
  createdAt: string | null
  isBusinessPageActive: boolean
  score: 'gold' | 'silver' | 'bronze'
  savedAt?: number
  hasWhatsApp?: boolean | null
}

// Saved Facebook Lead (with required savedAt)
export interface SavedFacebookLead extends FacebookPageLead {
  savedAt: number
  generatedPitch?: string
  pitchGeneratedAt?: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: BrandtizeAPI
  }
}
