import { ipcMain, BrowserWindow } from 'electron'
import {
  getApiKeys,
  setGroqApiKey,
  setMistralApiKey,
  setGoogleApiKey,
  setSerperApiKey,
  setHunterApiKey,
  setReoonApiKey,
  setJinaApiKey,
  setNeutrinoApiKey,
  setNeutrinoUserId,
  setLinkPreviewApiKey,
  hasRequiredApiKeys,
  getSelectedModel,
  setSelectedModel,
  getSelectedAiProvider,
  setSelectedAiProvider,
  getSelectedGoogleMode,
  setSelectedGoogleMode,
  getGoogleProjectId,
  setGoogleProjectId,
  getGoogleLocation,
  setGoogleLocation,
  getAgencyProfile,
  setAgencyProfile,
  hasAgencyProfile,
  // Multi-key functions
  getAllMultiKeys,
  setSerperApiKeys,
  setJinaApiKeys,
  setNeutrinoApiKeys,
  setLinkPreviewApiKeys,
  setHunterApiKeys,
  setReoonApiKeys,
  // AI Provider multi-key functions
  getGroqApiKeys,
  setGroqApiKeys,
  getMistralApiKeys,
  setMistralApiKeys,
  getGoogleApiKeys,
  setGoogleApiKeys,
  type AgencyProfile,
  type AiProvider,
  type GoogleMode,
  type ApiKeyEntry
} from './store'
import { streamAgentResponse, type ChatMessage } from './services'
import {
  generateLeads,
  type LeadGenerationInput,
  type LeadGenerationCallbacks
} from './services/lead-generation'

export function setupIpcHandlers(): void {
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
      neutrinoApiKey: keys.neutrinoApiKey ? '••••••••' + keys.neutrinoApiKey.slice(-4) : '',
      neutrinoUserId: keys.neutrinoUserId || '',
      linkPreviewApiKey: keys.linkPreviewApiKey
        ? '••••••••' + keys.linkPreviewApiKey.slice(-4)
        : '',
      hasGroqKey: keys.groqApiKey.length > 0,
      hasMistralKey: keys.mistralApiKey.length > 0,
      hasGoogleKey: keys.googleApiKey.length > 0,
      hasSerperKey: keys.serperApiKey.length > 0,
      hasHunterKey: keys.hunterApiKey.length > 0,
      hasReoonKey: keys.reoonApiKey.length > 0,
      hasJinaKey: keys.jinaApiKey.length > 0,
      hasNeutrinoKey: keys.neutrinoApiKey.length > 0 && keys.neutrinoUserId.length > 0,
      hasLinkPreviewKey: keys.linkPreviewApiKey.length > 0
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

  ipcMain.handle('settings:setNeutrinoApiKey', (_event, key: string) => {
    setNeutrinoApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setNeutrinoUserId', (_event, userId: string) => {
    setNeutrinoUserId(userId)
    return { success: true }
  })

  ipcMain.handle('settings:setLinkPreviewApiKey', (_event, key: string) => {
    setLinkPreviewApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setJinaApiKey', (_event, key: string) => {
    setJinaApiKey(key)
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
      neutrino: multiKeys.neutrino.map(maskKey),
      linkPreview: multiKeys.linkPreview.map(maskKey),
      hunter: multiKeys.hunter.map(maskKey),
      reoon: multiKeys.reoon.map(maskKey)
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
      case 'neutrino':
        setNeutrinoApiKeys(keys)
        break
      case 'linkPreview':
        setLinkPreviewApiKeys(keys)
        break
      case 'hunter':
        setHunterApiKeys(keys)
        break
      case 'reoon':
        setReoonApiKeys(keys)
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

  // Lead generation handler
  ipcMain.handle('leads:generate', async (_event, input: LeadGenerationInput) => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) {
      return { success: false, error: 'No active window' }
    }

    const callbacks: LeadGenerationCallbacks = {
      onSearchStart: (query) => window.webContents.send('leads:searchStart', query),
      onSearchComplete: (results) => window.webContents.send('leads:searchComplete', results),
      onCleanupComplete: (urls) => window.webContents.send('leads:cleanupComplete', urls),
      onScrapeStart: (url) => window.webContents.send('leads:scrapeStart', url),
      onScrapeComplete: (url, content) =>
        window.webContents.send('leads:scrapeComplete', { url, content }),
      onScrapeError: (url, error) => window.webContents.send('leads:scrapeError', { url, error }),
      onAiAnalysisStart: (url) => window.webContents.send('leads:aiStart', url),
      onAiAnalysisResult: (url, email, decisionMaker) =>
        window.webContents.send('leads:aiResult', { url, email, decisionMaker }),
      onServiceMatchStart: (url) => window.webContents.send('leads:serviceMatchStart', url),
      onServiceMatchResult: (url, needsServices, reason) =>
        window.webContents.send('leads:serviceMatchResult', { url, needsServices, reason }),
      onHunterStart: (url, type) => window.webContents.send('leads:hunterStart', { url, type }),
      onHunterResult: (url, email) => window.webContents.send('leads:hunterResult', { url, email }),
      onVerificationStart: (email) => window.webContents.send('leads:verifyStart', email),
      onVerificationResult: (email, verified) =>
        window.webContents.send('leads:verifyResult', { email, verified }),
      onLeadFound: (lead) => window.webContents.send('leads:found', lead),
      onComplete: (leads) => window.webContents.send('leads:complete', leads),
      onError: (error) => window.webContents.send('leads:error', error)
    }

    try {
      await generateLeads(input, callbacks, window)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  })
}
