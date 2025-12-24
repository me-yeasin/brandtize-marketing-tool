import { contextBridge, ipcRenderer } from 'electron'

// API Key Entry type
export interface ApiKeyEntry {
  key: string
  userId?: string
  label?: string
}

// Expose API to renderer
contextBridge.exposeInMainWorld('api', {
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

  verifyEmail: (email: string): Promise<{ verified: boolean; status?: string; error?: string }> =>
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
  }> => ipcRenderer.invoke('fetch-reviews', placeId, businessName, num)
})
