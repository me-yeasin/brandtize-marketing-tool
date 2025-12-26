import { ipcMain, shell } from 'electron'
import {
  checkWhatsAppNumber,
  disconnectWhatsApp,
  getWhatsAppStatus,
  initializeWhatsAppClient,
  logoutWhatsApp
} from './services/whatsapp-service'
import {
  clearSavedMapsLeads,
  getApiKeys,
  getGoogleApiKeys,
  // Multi-key getters/setters
  getGroqApiKeys,
  getHunterApiKeys,
  getJinaApiKeys,
  getMistralApiKeys,
  getReoonApiKeys,
  // Saved Maps Leads
  getSavedMapsLeads,
  // AI Provider selection
  getSelectedAiProvider,
  getSerperApiKeys,
  getSnovApiKeys,
  removeSavedMapsLead,
  saveMapsLeads,
  setGoogleApiKey,
  setGoogleApiKeys,
  setGroqApiKey,
  setGroqApiKeys,
  setHunterApiKey,
  setHunterApiKeys,
  setJinaApiKey,
  setJinaApiKeys,
  setMistralApiKey,
  setMistralApiKeys,
  setReoonApiKey,
  setReoonApiKeys,
  setSelectedAiProvider,
  setSerperApiKey,
  setSerperApiKeys,
  setSnovApiKeys,
  setSnovClientId,
  setSnovClientSecret,
  updateSavedMapsLead,
  type AiProvider,
  type ApiKeyEntry,
  type SavedMapsLead
} from './store'

export function registerIpcHandlers(): void {
  // ========================================
  // GET ALL API KEYS
  // ========================================
  ipcMain.handle('get-api-keys', () => {
    return getApiKeys()
  })

  // ========================================
  // GROQ
  // ========================================
  ipcMain.handle('get-groq-api-key', () => {
    return getApiKeys().groqApiKey
  })

  ipcMain.handle('set-groq-api-key', (_event, key: string) => {
    setGroqApiKey(key)
    return true
  })

  ipcMain.handle('get-groq-api-keys', () => {
    return getGroqApiKeys()
  })

  ipcMain.handle('set-groq-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setGroqApiKeys(keys)
    return true
  })

  // ========================================
  // MISTRAL
  // ========================================
  ipcMain.handle('get-mistral-api-key', () => {
    return getApiKeys().mistralApiKey
  })

  ipcMain.handle('set-mistral-api-key', (_event, key: string) => {
    setMistralApiKey(key)
    return true
  })

  ipcMain.handle('get-mistral-api-keys', () => {
    return getMistralApiKeys()
  })

  ipcMain.handle('set-mistral-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setMistralApiKeys(keys)
    return true
  })

  // ========================================
  // GOOGLE (GEMINI)
  // ========================================
  ipcMain.handle('get-google-api-key', () => {
    return getApiKeys().googleApiKey
  })

  ipcMain.handle('set-google-api-key', (_event, key: string) => {
    setGoogleApiKey(key)
    return true
  })

  ipcMain.handle('get-google-api-keys', () => {
    return getGoogleApiKeys()
  })

  ipcMain.handle('set-google-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setGoogleApiKeys(keys)
    return true
  })

  // ========================================
  // SERPER
  // ========================================
  ipcMain.handle('get-serper-api-key', () => {
    return getApiKeys().serperApiKey
  })

  ipcMain.handle('set-serper-api-key', (_event, key: string) => {
    setSerperApiKey(key)
    return true
  })

  ipcMain.handle('get-serper-api-keys', () => {
    return getSerperApiKeys()
  })

  ipcMain.handle('set-serper-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setSerperApiKeys(keys)
    return true
  })

  // ========================================
  // JINA
  // ========================================
  ipcMain.handle('get-jina-api-key', () => {
    return getApiKeys().jinaApiKey
  })

  ipcMain.handle('set-jina-api-key', (_event, key: string) => {
    setJinaApiKey(key)
    return true
  })

  ipcMain.handle('get-jina-api-keys', () => {
    return getJinaApiKeys()
  })

  ipcMain.handle('set-jina-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setJinaApiKeys(keys)
    return true
  })

  // ========================================
  // HUNTER
  // ========================================
  ipcMain.handle('get-hunter-api-key', () => {
    return getApiKeys().hunterApiKey
  })

  ipcMain.handle('set-hunter-api-key', (_event, key: string) => {
    setHunterApiKey(key)
    return true
  })

  ipcMain.handle('get-hunter-api-keys', () => {
    return getHunterApiKeys()
  })

  ipcMain.handle('set-hunter-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setHunterApiKeys(keys)
    return true
  })

  // ========================================
  // REOON
  // ========================================
  ipcMain.handle('get-reoon-api-key', () => {
    return getApiKeys().reoonApiKey
  })

  ipcMain.handle('set-reoon-api-key', (_event, key: string) => {
    setReoonApiKey(key)
    return true
  })

  ipcMain.handle('get-reoon-api-keys', () => {
    return getReoonApiKeys()
  })

  ipcMain.handle('set-reoon-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setReoonApiKeys(keys)
    return true
  })

  // ========================================
  // SNOV
  // ========================================
  ipcMain.handle('get-snov-credentials', () => {
    const keys = getApiKeys()
    return {
      clientId: keys.snovClientId,
      clientSecret: keys.snovClientSecret
    }
  })

  ipcMain.handle('set-snov-credentials', (_event, clientId: string, clientSecret: string) => {
    setSnovClientId(clientId)
    setSnovClientSecret(clientSecret)
    return true
  })

  ipcMain.handle('get-snov-api-keys', () => {
    return getSnovApiKeys()
  })

  ipcMain.handle('set-snov-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setSnovApiKeys(keys)
    return true
  })

  // ========================================
  // AI PROVIDER SELECTION
  // ========================================
  ipcMain.handle('get-selected-ai-provider', () => {
    return getSelectedAiProvider()
  })

  ipcMain.handle('set-selected-ai-provider', (_event, provider: AiProvider) => {
    setSelectedAiProvider(provider)
    return true
  })

  // ========================================
  // MAPS SCOUT
  // ========================================
  ipcMain.handle(
    'search-google-maps',
    async (
      _event,
      params: {
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
      }
    ) => {
      const { searchMapsWithSerper } = await import('./services/lead-generation')
      return searchMapsWithSerper(params)
    }
  )

  // Find email for a domain (used when No Website toggle is OFF)
  ipcMain.handle(
    'find-email-for-domain',
    async (_event, domain: string, firstName?: string, lastName?: string) => {
      const { findEmailWithFallback } = await import('./services/lead-generation')
      return findEmailWithFallback(domain, firstName, lastName)
    }
  )

  // Verify email with Reoon (with Rapid Verifier fallback)
  ipcMain.handle('verify-email', async (_event, email: string) => {
    const { verifyEmailWithReoon, verifyEmailWithRapidVerifier } =
      await import('./services/lead-generation')

    console.log(`[Verify] Starting verification for: ${email}`)

    // Try Reoon first
    const reoonResult = await verifyEmailWithReoon(email)

    // If Reoon worked (not all keys exhausted), return its result
    if (!reoonResult.allKeysExhausted) {
      console.log(`[Verify] Reoon verified ${email}: ${reoonResult.verified}`)
      return {
        verified: reoonResult.verified,
        source: 'reoon',
        switched: false
      }
    }

    // Fallback to Rapid Verifier if Reoon keys exhausted
    console.log('[Verify] Reoon exhausted, switching to Rapid Verifier...')
    const rapidResult = await verifyEmailWithRapidVerifier(email)
    console.log(`[Verify] Rapid verified ${email}: ${rapidResult}`)
    return {
      verified: rapidResult,
      source: 'rapid',
      switched: true
    }
  })

  // Fetch reviews for a business
  ipcMain.handle(
    'fetch-reviews',
    async (_event, placeId: string, businessName: string, num?: number) => {
      const { fetchReviewsWithSerper } = await import('./services/lead-generation')
      return fetchReviewsWithSerper(placeId, businessName, num || 10)
    }
  )

  // ========================================
  // WHATSAPP
  // ========================================

  // Initialize WhatsApp client
  ipcMain.handle('whatsapp-initialize', async () => {
    try {
      await initializeWhatsAppClient()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize WhatsApp'
      }
    }
  })

  // Get WhatsApp status
  ipcMain.handle('whatsapp-get-status', () => {
    return getWhatsAppStatus()
  })

  // Check if a phone number has WhatsApp
  ipcMain.handle('whatsapp-check-number', async (_event, phoneNumber: string) => {
    return checkWhatsAppNumber(phoneNumber)
  })

  // Disconnect WhatsApp client
  ipcMain.handle('whatsapp-disconnect', async () => {
    await disconnectWhatsApp()
    return { success: true }
  })

  // Logout from WhatsApp (clears session)
  ipcMain.handle('whatsapp-logout', async () => {
    await logoutWhatsApp()
    return { success: true }
  })

  // ========================================
  // UTILITIES
  // ========================================

  // Open URL in system's default browser
  ipcMain.handle('open-external-url', async (_event, url: string) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error('Failed to open external URL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open URL'
      }
    }
  })

  // ========================================
  // SAVED MAPS LEADS
  // ========================================

  // Get all saved maps leads
  ipcMain.handle('get-saved-maps-leads', () => {
    return getSavedMapsLeads()
  })

  // Save maps leads
  ipcMain.handle('save-maps-leads', (_event, leads: SavedMapsLead[]) => {
    const count = saveMapsLeads(leads)
    return { success: true, count }
  })

  // Update a single saved map lead
  ipcMain.handle('update-saved-maps-lead', (_event, lead: SavedMapsLead) => {
    const success = updateSavedMapsLead(lead)
    return { success }
  })

  // Remove a saved map lead
  ipcMain.handle('remove-saved-maps-lead', (_event, id: string) => {
    removeSavedMapsLead(id)
    return { success: true }
  })

  // Clear all saved maps leads
  ipcMain.handle('clear-saved-maps-leads', () => {
    clearSavedMapsLeads()
    return { success: true }
  })

  // ========================================
  // WHATSAPP PITCH GENERATOR
  // ========================================
  ipcMain.handle(
    'generate-whatsapp-pitch',
    async (
      _event,
      input: {
        leadId: string
        name: string
        category: string
        address: string
        rating: number
        reviewCount: number
        website?: string | null
        reviews?: Array<{ text: string; rating: number; author: string }>
      }
    ) => {
      const { generatePitch } = await import('./services/pitch-generator-agent')
      return generatePitch(input)
    }
  )
}
