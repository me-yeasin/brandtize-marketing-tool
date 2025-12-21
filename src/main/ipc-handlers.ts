import { BrowserWindow, ipcMain } from 'electron'
import { streamAgentResponse, type ChatMessage } from './services'
import { generateEmailPitch, type EmailPitchInput } from './services/email-pitch-generator'
import {
  generateLeads,
  type LeadGenerationCallbacks,
  type LeadGenerationInput
} from './services/lead-generation'
import {
  getNicheStrategy,
  researchNicheStrategy,
  saveNicheStrategy
} from './services/strategy-manager'
import { templateManager, type EmailTemplate } from './services/template-manager'
import {
  addFoundLead,
  addProcessedDomain,
  clearEmailPitches,
  clearFoundLeads,
  clearProcessedDomains,
  getAgencyProfile,
  // Multi-key functions
  getAllMultiKeys,
  getApiKeys,
  // Email pitch functions
  getEmailPitch,
  getEmailPitches,
  getFoundLeads,
  getGoogleApiKeys,
  getGoogleLocation,
  getGoogleProjectId,
  // AI Provider multi-key functions
  getGroqApiKeys,
  getMistralApiKeys,
  // Results storage functions
  getProcessedDomains,
  getSelectedAiProvider,
  getSelectedGoogleMode,
  getSelectedModel,
  // Voice profile functions
  getVoiceProfile,
  hasAgencyProfile,
  hasRequiredApiKeys,
  hasVoiceProfile,
  removeEmailPitch,
  removeFoundLead,
  removeProcessedDomain,
  saveEmailPitch,
  setAgencyProfile,
  setGoogleApiKey,
  setGoogleApiKeys,
  setGoogleLocation,
  setGoogleProjectId,
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
  setSelectedGoogleMode,
  setSelectedModel,
  setSerperApiKey,
  setSerperApiKeys,
  setSnovApiKeys,
  setSnovClientId,
  setSnovClientSecret,
  setVoiceProfile,
  type AgencyProfile,
  type AiProvider,
  type ApiKeyEntry,
  type FoundLead,
  type GoogleMode,
  type ProcessedDomain,
  type StoredEmailPitch,
  type VoiceProfile
} from './store'

export async function setupIpcHandlers(): Promise<void> {
  // Settings handlers
  ipcMain.handle('settings:getApiKeys', () => {
    const keys = getApiKeys()
    return {
      groqApiKey: keys.groqApiKey ? '••••••••' + keys.groqApiKey.slice(-4) : '',
      mistralApiKey: keys.mistralApiKey ? '••••••••' + keys.mistralApiKey.slice(-4) : '',
      googleApiKey: keys.googleApiKey ? '••••••••' + keys.googleApiKey.slice(-4) : '',
      serperApiKey: keys.serperApiKey ? '••••••••' + keys.serperApiKey.slice(-4) : '',
      hunterApiKey: keys.hunterApiKey ? '••••••••' + keys.hunterApiKey.slice(-4) : '',
      reoonApiKey: keys.reoonApiKey ? '••••••••' + keys.reoonApiKey.slice(-4) : '',
      jinaApiKey: keys.jinaApiKey ? '••••••••' + keys.jinaApiKey.slice(-4) : '',
      snovClientId: keys.snovClientId ? '••••••••' + keys.snovClientId.slice(-4) : '',
      snovClientSecret: keys.snovClientSecret ? '••••••••' + keys.snovClientSecret.slice(-4) : '',
      hasGroqKey: keys.groqApiKey.length > 0,
      hasMistralKey: keys.mistralApiKey.length > 0,
      hasGoogleKey: keys.googleApiKey.length > 0,
      hasSerperKey: keys.serperApiKey.length > 0,
      hasHunterKey: keys.hunterApiKey.length > 0,
      hasReoonKey: keys.reoonApiKey.length > 0,
      hasJinaKey: keys.jinaApiKey.length > 0,
      hasSnovKey: keys.snovClientId.length > 0 && keys.snovClientSecret.length > 0
    }
  })

  ipcMain.handle('settings:setGroqApiKey', (_event, key: string) => {
    setGroqApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setMistralApiKey', (_event, key: string) => {
    setMistralApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setGoogleApiKey', (_event, key: string) => {
    setGoogleApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setSerperApiKey', (_event, key: string) => {
    setSerperApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setHunterApiKey', (_event, key: string) => {
    setHunterApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setReoonApiKey', (_event, key: string) => {
    setReoonApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setJinaApiKey', (_event, key: string) => {
    setJinaApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setSnovClientId', (_event, clientId: string) => {
    setSnovClientId(clientId)
    return { success: true }
  })

  ipcMain.handle('settings:setSnovClientSecret', (_event, clientSecret: string) => {
    setSnovClientSecret(clientSecret)
    return { success: true }
  })

  ipcMain.handle('settings:hasRequiredKeys', () => {
    return hasRequiredApiKeys()
  })

  ipcMain.handle('settings:getSelectedModel', () => {
    return getSelectedModel()
  })

  ipcMain.handle('settings:setSelectedModel', (_event, model: string) => {
    setSelectedModel(model)
    return { success: true }
  })

  ipcMain.handle('settings:getSelectedAiProvider', () => {
    return getSelectedAiProvider()
  })

  ipcMain.handle('settings:setSelectedAiProvider', (_event, provider: AiProvider) => {
    setSelectedAiProvider(provider)
    return { success: true }
  })

  ipcMain.handle('settings:getSelectedGoogleMode', () => {
    return getSelectedGoogleMode()
  })

  ipcMain.handle('settings:setSelectedGoogleMode', (_event, mode: GoogleMode) => {
    setSelectedGoogleMode(mode)
    return { success: true }
  })

  ipcMain.handle('settings:getGoogleProjectId', () => {
    return getGoogleProjectId()
  })

  ipcMain.handle('settings:setGoogleProjectId', (_event, projectId: string) => {
    setGoogleProjectId(projectId)
    return { success: true }
  })

  ipcMain.handle('settings:getGoogleLocation', () => {
    return getGoogleLocation()
  })

  ipcMain.handle('settings:setGoogleLocation', (_event, location: string) => {
    setGoogleLocation(location)
    return { success: true }
  })

  // Profile handlers
  ipcMain.handle('profile:get', () => {
    return getAgencyProfile()
  })

  ipcMain.handle('profile:set', (_event, profile: AgencyProfile) => {
    setAgencyProfile(profile)
    return { success: true }
  })

  ipcMain.handle('profile:hasProfile', () => {
    return hasAgencyProfile()
  })

  // Voice Profile handlers
  ipcMain.handle('voice:get', () => {
    return getVoiceProfile()
  })

  ipcMain.handle('voice:set', (_event, profile: VoiceProfile) => {
    setVoiceProfile(profile)
    return { success: true }
  })

  ipcMain.handle('voice:hasVoiceProfile', () => {
    return hasVoiceProfile()
  })

  // Multi-key API handlers
  ipcMain.handle('settings:getMultiKeys', () => {
    const multiKeys = getAllMultiKeys()
    // Mask keys for display
    const maskKey = (entry: ApiKeyEntry): ApiKeyEntry => ({
      ...entry,
      key: entry.key ? '••••••••' + entry.key.slice(-4) : ''
    })
    return {
      serper: multiKeys.serper.map(maskKey),
      jina: multiKeys.jina.map(maskKey),
      hunter: multiKeys.hunter.map(maskKey),
      reoon: multiKeys.reoon.map(maskKey),
      snov: multiKeys.snov.map(maskKey)
    }
  })

  // Get AI provider multi-keys
  ipcMain.handle('settings:getAiProviderMultiKeys', () => {
    const maskKey = (entry: ApiKeyEntry): ApiKeyEntry => ({
      ...entry,
      key: entry.key ? '••••••••' + entry.key.slice(-4) : ''
    })
    return {
      groq: getGroqApiKeys().map(maskKey),
      mistral: getMistralApiKeys().map(maskKey),
      google: getGoogleApiKeys().map(maskKey)
    }
  })

  // Set AI provider multi-keys
  ipcMain.handle(
    'settings:setAiProviderMultiKeys',
    (_event, provider: string, keys: ApiKeyEntry[]) => {
      switch (provider) {
        case 'groq':
          setGroqApiKeys(keys)
          break
        case 'mistral':
          setMistralApiKeys(keys)
          break
        case 'google':
          setGoogleApiKeys(keys)
          break
        default:
          return { success: false, error: 'Unknown AI provider' }
      }
      return { success: true }
    }
  )

  ipcMain.handle('settings:setMultiKeys', (_event, service: string, keys: ApiKeyEntry[]) => {
    switch (service) {
      case 'serper':
        setSerperApiKeys(keys)
        break
      case 'jina':
        setJinaApiKeys(keys)
        break
      case 'hunter':
        setHunterApiKeys(keys)
        break
      case 'reoon':
        setReoonApiKeys(keys)
        break
      case 'snov':
        setSnovApiKeys(keys)
        break
      default:
        return { success: false, error: 'Unknown service' }
    }
    return { success: true }
  })

  // Chat streaming handler with fallback support
  ipcMain.handle('chat:stream', async (_event, messages: ChatMessage[]) => {
    const window = BrowserWindow.getFocusedWindow()

    if (!window) {
      return { success: false, error: 'No active window' }
    }

    try {
      await streamAgentResponse(messages, {
        onToken: (token) => {
          window.webContents.send('chat:token', token)
        },
        onComplete: (fullText) => {
          window.webContents.send('chat:complete', fullText)
        },
        onError: (error) => {
          window.webContents.send('chat:error', error)
        },
        onModelSwitch: (fromModel, toModel) => {
          console.log(`[IPC] Model switch: ${fromModel} -> ${toModel}`)
          window.webContents.send('chat:modelSwitch', { fromModel, toModel })
        },
        onRetry: (model, attempt, maxAttempts) => {
          console.log(`[IPC] Retry: ${model} attempt ${attempt}/${maxAttempts}`)
          window.webContents.send('chat:retry', { model, attempt, maxAttempts })
        }
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  })

  // Results storage handlers
  ipcMain.handle('results:getProcessedDomains', () => {
    return getProcessedDomains()
  })

  ipcMain.handle('results:addProcessedDomain', (_event, domain: ProcessedDomain) => {
    addProcessedDomain(domain)
    return { success: true }
  })

  ipcMain.handle('results:removeProcessedDomain', (_event, id: string) => {
    removeProcessedDomain(id)
    return { success: true }
  })

  ipcMain.handle('results:clearProcessedDomains', () => {
    clearProcessedDomains()
    return { success: true }
  })

  ipcMain.handle('results:getFoundLeads', () => {
    return getFoundLeads()
  })

  ipcMain.handle('results:addFoundLead', (_event, lead: FoundLead) => {
    addFoundLead(lead)
    return { success: true }
  })

  ipcMain.handle('results:removeFoundLead', (_event, id: string) => {
    removeFoundLead(id)
    return { success: true }
  })

  ipcMain.handle('results:clearFoundLeads', () => {
    clearFoundLeads()
    return { success: true }
  })

  // Email Pitch storage handlers
  ipcMain.handle('pitch:getAll', () => {
    return getEmailPitches()
  })

  ipcMain.handle('pitch:get', (_event, leadId: string) => {
    return getEmailPitch(leadId)
  })

  ipcMain.handle('pitch:save', (_event, pitch: StoredEmailPitch) => {
    saveEmailPitch(pitch)
    return { success: true }
  })

  ipcMain.handle('pitch:remove', (_event, leadId: string) => {
    removeEmailPitch(leadId)
    return { success: true }
  })

  ipcMain.handle('pitch:clearAll', () => {
    clearEmailPitches()
    return { success: true }
  })

  // Lead generation handler
  ipcMain.handle(
    'leads:generate',
    async (_event, input: LeadGenerationInput & { tabId: string }) => {
      const window = BrowserWindow.getFocusedWindow()
      if (!window) {
        return { success: false, error: 'No active window' }
      }

      const { tabId, ...genInput } = input

      const callbacks: LeadGenerationCallbacks = {
        onSearchStart: (query) =>
          window.webContents.send('leads:searchStart', { tabId, data: query }),
        onSearchComplete: (results) =>
          window.webContents.send('leads:searchComplete', { tabId, data: results }),
        onCleanupComplete: (urls) =>
          window.webContents.send('leads:cleanupComplete', { tabId, data: urls }),
        onScrapeStart: (url) => window.webContents.send('leads:scrapeStart', { tabId, data: url }),
        onScrapeComplete: (url, content) =>
          window.webContents.send('leads:scrapeComplete', { tabId, data: { url, content } }),
        onScrapeError: (url, error) =>
          window.webContents.send('leads:scrapeError', { tabId, data: { url, error } }),
        onAiAnalysisStart: (url) => window.webContents.send('leads:aiStart', { tabId, data: url }),
        onAiAnalysisResult: (url, email, decisionMaker) =>
          window.webContents.send('leads:aiResult', {
            tabId,
            data: { url, email, decisionMaker }
          }),
        onServiceMatchStart: (url) =>
          window.webContents.send('leads:serviceMatchStart', { tabId, data: url }),
        onServiceMatchResult: (url, needsServices, reason) =>
          window.webContents.send('leads:serviceMatchResult', {
            tabId,
            data: { url, needsServices, reason }
          }),
        onHunterStart: (url, type) =>
          window.webContents.send('leads:hunterStart', { tabId, data: { url, type } }),
        onHunterResult: (url, email) =>
          window.webContents.send('leads:hunterResult', { tabId, data: { url, email } }),
        onVerificationStart: (email) =>
          window.webContents.send('leads:verifyStart', { tabId, data: email }),
        onVerificationResult: (email, verified) =>
          window.webContents.send('leads:verifyResult', { tabId, data: { email, verified } }),
        onLeadFound: (lead) => window.webContents.send('leads:found', { tabId, data: lead }),
        onComplete: (leads) => window.webContents.send('leads:complete', { tabId, data: leads }),
        onError: (error) => window.webContents.send('leads:error', { tabId, data: error })
      }

      try {
        await generateLeads(genInput, callbacks, window)
        return { success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: errorMessage }
      }
    }
  )

  // Template Management Handlers
  ipcMain.handle('templates:getAll', () => {
    return templateManager.getAllMetadata()
  })

  ipcMain.handle('templates:get', (_event, id: string) => {
    return templateManager.getTemplate(id)
  })

  ipcMain.handle('templates:save', (_event, template: EmailTemplate) => {
    return templateManager.saveTemplate(template)
  })

  ipcMain.handle('templates:delete', (_event, id: string) => {
    return templateManager.deleteTemplate(id)
  })

  // Email Pitch Generator Handler
  ipcMain.handle('email:generate-pitch', async (_event, input: EmailPitchInput) => {
    try {
      const result = await generateEmailPitch(input)
      return { success: true, data: result }
    } catch (error) {
      console.error('Email Pitch Handler Error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Auto-scrape and generate Pitch Handler
  ipcMain.handle('email:generate-pitch-for-lead', async (_event, lead: FoundLead) => {
    try {
      // 1. Scrape content
      const { scrapeWithJina } = await import('./services/lead-generation')
      console.log(`[Email Pitch] Scraping content for ${lead.url}...`)
      const scrapedContent = await scrapeWithJina(lead.url)

      // 2. Generate Pitch
      console.log(`[Email Pitch] Generating pitch for ${lead.email}...`)
      const result = await generateEmailPitch({
        lead,
        scrapedContent
      })

      return { success: true, data: result }
    } catch (error) {
      console.error('Email Pitch For Lead Handler Error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
  // Strategy Management Handlers
  // Strategy Management Handlers

  ipcMain.handle('strategy:get', () => {
    return getNicheStrategy()
  })

  ipcMain.handle('strategy:save', (_event, strategy) => {
    try {
      saveNicheStrategy(strategy)
      return true
    } catch (e) {
      console.error('Failed to save strategy', e)
      return false
    }
  })

  ipcMain.handle(
    'strategy:research',
    async (_event, { niche, targetAudience }: { niche: string; targetAudience: string }) => {
      try {
        const result = await researchNicheStrategy(niche, targetAudience)
        return { success: true, data: result }
      } catch (error) {
        console.error('Strategy Research Error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )
}
