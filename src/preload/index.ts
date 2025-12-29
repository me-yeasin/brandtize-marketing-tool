import { contextBridge, ipcRenderer } from 'electron'

// API Key Entry type
export interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
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
  emailLookupAttempted?: boolean
  hasWhatsApp?: boolean | null
  reviews?: Array<{ text: string; rating: number; author: string }>
  generatedPitch?: string
  pitchGeneratedAt?: number
  savedAt: number
}

// Saved Facebook Lead type
export interface SavedFacebookLead {
  id: string
  facebookUrl: string
  title: string
  categories: string[]
  email: string | null
  emailVerified?: boolean
  emailLookupAttempted?: boolean
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
  hasWhatsApp?: boolean | null
  savedAt: number
}

// Campaign Group Type
export interface CampaignGroup {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}

// Campaign Type
export interface Campaign {
  id: string
  name: string
  instruction: string // Instructions for the AI pitch generator
  buyerPersona?: string // Optional buyer persona
  examples?: string[] // Optional example pitches
  productLinks?: string[] // Optional product or portfolio links
  language: 'en' | 'bn' // Language for pitch generation (English or Bangla)
  platform: 'whatsapp'
  groupId?: string // Optional group association
  createdAt: number
  updatedAt: number
}

// Mail Campaign Type
export interface MailCampaign {
  id: string
  name: string
  instruction: string // Instructions for the AI pitch generator
  buyerPersona?: string // Optional buyer persona
  examples?: string[] // Optional example pitches
  productLinks?: string[] // Optional product or portfolio links
  language: 'en' | 'bn' // Language for pitch generation (English or Bangla)
  platform: 'mail'
  groupId?: string // Optional group association
  createdAt: number
  updatedAt: number
}

// Expose API to renderer
contextBridge.exposeInMainWorld('api', {
  // ========================================
  // AUTO UPDATE
  // ========================================
  updateQuitAndInstall: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update-quit-and-install'),

  onUpdateAvailable: (callback: (info: { version: string | null }) => void): void => {
    ipcRenderer.on('update-available', (_event, info) => callback(info))
  },

  onUpdateDownloadProgress: (
    callback: (progress: {
      percent: number
      transferred: number
      total: number
      bytesPerSecond: number
    }) => void
  ): void => {
    ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress))
  },

  onUpdateDownloaded: (callback: () => void): void => {
    ipcRenderer.on('update-downloaded', () => callback())
  },

  onUpdateError: (callback: (message: string) => void): void => {
    ipcRenderer.on('update-error', (_event, message) => callback(message))
  },

  // ========================================
  // GET ALL API KEYS
  // ========================================
  getApiKeys: (): Promise<{
    groqApiKey: string
    mistralApiKey: string
    googleApiKey: string
    serperApiKey: string
    hunterApiKey: string
    reoonApiKey: string
    jinaApiKey: string
    snovClientId: string
    snovClientSecret: string
  }> => ipcRenderer.invoke('get-api-keys'),

  // ========================================
  // GROQ
  // ========================================
  getGroqApiKey: (): Promise<string> => ipcRenderer.invoke('get-groq-api-key'),
  setGroqApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('set-groq-api-key', key),
  getGroqApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-groq-api-keys'),
  setGroqApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-groq-api-keys', keys),

  // ========================================
  // MISTRAL
  // ========================================
  getMistralApiKey: (): Promise<string> => ipcRenderer.invoke('get-mistral-api-key'),
  setMistralApiKey: (key: string): Promise<boolean> =>
    ipcRenderer.invoke('set-mistral-api-key', key),
  getMistralApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-mistral-api-keys'),
  setMistralApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-mistral-api-keys', keys),

  // ========================================
  // GOOGLE (GEMINI)
  // ========================================
  getGoogleApiKey: (): Promise<string> => ipcRenderer.invoke('get-google-api-key'),
  setGoogleApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('set-google-api-key', key),
  getGoogleApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-google-api-keys'),
  setGoogleApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-google-api-keys', keys),

  // ========================================
  // SERPER
  // ========================================
  getSerperApiKey: (): Promise<string> => ipcRenderer.invoke('get-serper-api-key'),
  setSerperApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('set-serper-api-key', key),
  getSerperApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-serper-api-keys'),
  setSerperApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-serper-api-keys', keys),

  // ========================================
  // JINA
  // ========================================
  getJinaApiKey: (): Promise<string> => ipcRenderer.invoke('get-jina-api-key'),
  setJinaApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('set-jina-api-key', key),
  getJinaApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-jina-api-keys'),
  setJinaApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-jina-api-keys', keys),

  // ========================================
  // HUNTER
  // ========================================
  getHunterApiKey: (): Promise<string> => ipcRenderer.invoke('get-hunter-api-key'),
  setHunterApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('set-hunter-api-key', key),
  getHunterApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-hunter-api-keys'),
  setHunterApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-hunter-api-keys', keys),

  // ========================================
  // REOON
  // ========================================
  getReoonApiKey: (): Promise<string> => ipcRenderer.invoke('get-reoon-api-key'),
  setReoonApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('set-reoon-api-key', key),
  getReoonApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-reoon-api-keys'),
  setReoonApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-reoon-api-keys', keys),

  // ========================================
  // SNOV
  // ========================================
  getSnovCredentials: (): Promise<{ clientId: string; clientSecret: string }> =>
    ipcRenderer.invoke('get-snov-credentials'),
  setSnovCredentials: (clientId: string, clientSecret: string): Promise<boolean> =>
    ipcRenderer.invoke('set-snov-credentials', clientId, clientSecret),
  setSnovClientId: (clientId: string): Promise<boolean> =>
    ipcRenderer.invoke('set-snov-client-id', clientId),
  setSnovClientSecret: (clientSecret: string): Promise<boolean> =>
    ipcRenderer.invoke('set-snov-client-secret', clientSecret),
  getSnovApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-snov-api-keys'),
  setSnovApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-snov-api-keys', keys),

  // ========================================
  // AI PROVIDER SELECTION
  // ========================================
  getSelectedAiProvider: (): Promise<'groq' | 'mistral' | 'google'> =>
    ipcRenderer.invoke('get-selected-ai-provider'),
  setSelectedAiProvider: (provider: 'groq' | 'mistral' | 'google'): Promise<boolean> =>
    ipcRenderer.invoke('set-selected-ai-provider', provider),

  // ========================================
  // MAPS SCOUT
  // ========================================
  searchGoogleMaps: (params: {
    query: string
    location: string
    countryCode?: string
    num?: number
    ll?: string
    latitude?: number
    longitude?: number
    zoom?: number
    hl?: string
    start?: number
    autocomplete?: boolean
    maxPages?: number
  }): Promise<
    {
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
    }[]
  > => ipcRenderer.invoke('search-google-maps', params),

  findEmailForDomain: (
    domain: string,
    firstName?: string,
    lastName?: string
  ): Promise<{ email: string | null; source: string; allKeysExhausted?: boolean }> =>
    ipcRenderer.invoke('find-email-for-domain', domain, firstName, lastName),

  verifyEmail: (email: string): Promise<{ verified: boolean; source: string; switched: boolean }> =>
    ipcRenderer.invoke('verify-email', email),

  fetchReviews: (
    placeId: string,
    businessName: string,
    num?: number
  ): Promise<{
    businessName: string
    totalReviews: number
    averageRating: number
    reviews: { author: string; rating: number; date: string; text: string; source?: string }[]
  }> => ipcRenderer.invoke('fetch-reviews', placeId, businessName, num),

  // ========================================
  // WHATSAPP
  // ========================================
  whatsappInitialize: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('whatsapp-initialize'),

  whatsappGetStatus: (): Promise<{
    isReady: boolean
    isInitializing: boolean
    hasQrCode: boolean
    qrCode: string | null
    error: string | null
  }> => ipcRenderer.invoke('whatsapp-get-status'),

  whatsappCheckNumber: (
    phoneNumber: string
  ): Promise<{
    hasWhatsApp: boolean
    formattedNumber: string | null
    error: string | null
  }> => ipcRenderer.invoke('whatsapp-check-number', phoneNumber),

  whatsappDisconnect: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('whatsapp-disconnect'),

  whatsappLogout: (): Promise<{ success: boolean }> => ipcRenderer.invoke('whatsapp-logout'),

  // WhatsApp Campaigns
  getWhatsappCampaigns: (): Promise<Campaign[]> => ipcRenderer.invoke('get-whatsapp-campaigns'),
  saveWhatsappCampaign: (campaign: Campaign): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-whatsapp-campaign', campaign),
  deleteWhatsappCampaign: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('delete-whatsapp-campaign', id),

  // WhatsApp Campaign Groups
  getWhatsappCampaignGroups: (): Promise<CampaignGroup[]> =>
    ipcRenderer.invoke('get-whatsapp-campaign-groups'),
  saveWhatsappCampaignGroup: (group: CampaignGroup): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-whatsapp-campaign-group', group),
  deleteWhatsappCampaignGroup: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('delete-whatsapp-campaign-group', id),

  // Mail Campaigns
  getMailCampaigns: (): Promise<MailCampaign[]> => ipcRenderer.invoke('get-mail-campaigns'),
  saveMailCampaign: (campaign: MailCampaign): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-mail-campaign', campaign),
  deleteMailCampaign: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('delete-mail-campaign', id),

  // Mail Campaign Groups
  getMailCampaignGroups: (): Promise<CampaignGroup[]> =>
    ipcRenderer.invoke('get-mail-campaign-groups'),
  saveMailCampaignGroup: (group: CampaignGroup): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-mail-campaign-group', group),
  deleteMailCampaignGroup: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('delete-mail-campaign-group', id),

  // WhatsApp event listeners
  onWhatsAppQr: (callback: (qr: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, qr: string): void => callback(qr)
    ipcRenderer.on('whatsapp-qr', listener)
    return () => ipcRenderer.removeListener('whatsapp-qr', listener)
  },

  onWhatsAppReady: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('whatsapp-ready', listener)
    return () => ipcRenderer.removeListener('whatsapp-ready', listener)
  },

  onWhatsAppDisconnected: (callback: (reason: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, reason: string): void => callback(reason)
    ipcRenderer.on('whatsapp-disconnected', listener)
    return () => ipcRenderer.removeListener('whatsapp-disconnected', listener)
  },

  onWhatsAppAuthFailure: (callback: (msg: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, msg: string): void => callback(msg)
    ipcRenderer.on('whatsapp-auth-failure', listener)
    return () => ipcRenderer.removeListener('whatsapp-auth-failure', listener)
  },

  // ========================================
  // UTILITIES
  // ========================================
  openExternalUrl: (url: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('open-external-url', url),

  // ========================================
  // SAVED MAPS LEADS
  // ========================================
  getSavedMapsLeads: (): Promise<SavedMapsLead[]> => ipcRenderer.invoke('get-saved-maps-leads'),

  saveMapsLeads: (leads: SavedMapsLead[]): Promise<{ success: boolean; count: number }> =>
    ipcRenderer.invoke('save-maps-leads', leads),

  updateSavedMapsLead: (lead: SavedMapsLead): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('update-saved-maps-lead', lead),

  removeSavedMapsLead: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('remove-saved-maps-lead', id),

  clearSavedMapsLeads: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('clear-saved-maps-leads'),

  // ========================================
  // SAVED FACEBOOK LEADS
  // ========================================
  getSavedFacebookLeads: (): Promise<SavedFacebookLead[]> =>
    ipcRenderer.invoke('get-saved-facebook-leads'),

  saveFacebookLeads: (leads: SavedFacebookLead[]): Promise<{ success: boolean; count: number }> =>
    ipcRenderer.invoke('save-facebook-leads', leads),

  updateSavedFacebookLead: (lead: SavedFacebookLead): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('update-saved-facebook-lead', lead),

  removeSavedFacebookLead: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('remove-saved-facebook-lead', id),

  clearSavedFacebookLeads: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('clear-saved-facebook-leads'),

  // ========================================
  // WHATSAPP PITCH GENERATOR
  // ========================================
  generateWhatsAppPitch: (input: {
    leadId: string
    name: string
    category: string
    address: string
    rating: number
    reviewCount: number
    website?: string | null
    reviews?: Array<{ text: string; rating: number; author: string }>
    instruction?: string
  }): Promise<{ success: boolean; pitch?: string; error?: string }> =>
    ipcRenderer.invoke('generate-whatsapp-pitch', input),

  onPitchGenerationStatus: (
    callback: (status: {
      status: 'analyzing' | 'generating' | 'observing' | 'refining' | 'done' | 'error'
      message: string
      currentPitch?: string
      refinementCount?: number
    }) => void
  ): void => {
    ipcRenderer.on('pitch-generation-status', (_event, status) => callback(status))
  },

  // ========================================
  // EMAIL PITCH GENERATOR
  // ========================================
  generateEmailPitch: (input: {
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
    language?: 'en' | 'bn'
  }): Promise<{
    success: boolean
    pitch?: {
      leadId: string
      subject: string
      body: string
      strategy_explanation: string
      target_audience_analysis: string
      psychological_triggers_used: string
    }
    error?: string
  }> => ipcRenderer.invoke('generate-email-pitch', input),

  getEmailPitches: (): Promise<
    Record<
      string,
      {
        leadId: string
        subject: string
        body: string
        strategy_explanation: string
        target_audience_analysis: string
        psychological_triggers_used: string
      }
    >
  > => ipcRenderer.invoke('get-email-pitches'),

  // ========================================
  // APIFY
  // ========================================
  getApifyApiKey: (): Promise<string> => ipcRenderer.invoke('get-apify-api-key'),
  setApifyApiKey: (key: string): Promise<boolean> => ipcRenderer.invoke('set-apify-api-key', key),
  getApifyApiKeys: (): Promise<ApiKeyEntry[]> => ipcRenderer.invoke('get-apify-api-keys'),
  setApifyApiKeys: (keys: ApiKeyEntry[]): Promise<boolean> =>
    ipcRenderer.invoke('set-apify-api-keys', keys),

  // ========================================
  // FACEBOOK SCRAPER (via Apify)
  // ========================================
  searchFacebookPages: (params: {
    searchQuery?: string
    pageUrls?: string[]
    maxResults?: number
  }): Promise<
    {
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
      score: 'gold' | 'silver' | 'bronze'
    }[]
  > => ipcRenderer.invoke('search-facebook-pages', params),

  scrapeFacebookPageUrls: (
    urls: string[]
  ): Promise<
    {
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
      score: 'gold' | 'silver' | 'bronze'
    }[]
  > => ipcRenderer.invoke('scrape-facebook-page-urls', urls),

  isApifyConfigured: (): Promise<boolean> => ipcRenderer.invoke('is-apify-configured')
})
