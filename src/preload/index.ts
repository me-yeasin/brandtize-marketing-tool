import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

// Custom APIs for renderer
type AiProvider = 'groq' | 'mistral' | 'google'
type GoogleMode = 'aiStudio' | 'vertexApiKey'

const api = {
  // Settings
  getApiKeys: () => ipcRenderer.invoke('settings:getApiKeys'),
  setGroqApiKey: (key: string) => ipcRenderer.invoke('settings:setGroqApiKey', key),
  setMistralApiKey: (key: string) => ipcRenderer.invoke('settings:setMistralApiKey', key),
  setGoogleApiKey: (key: string) => ipcRenderer.invoke('settings:setGoogleApiKey', key),
  setSerperApiKey: (key: string) => ipcRenderer.invoke('settings:setSerperApiKey', key),
  setHunterApiKey: (key: string) => ipcRenderer.invoke('settings:setHunterApiKey', key),
  setReoonApiKey: (key: string) => ipcRenderer.invoke('settings:setReoonApiKey', key),
  setJinaApiKey: (key: string) => ipcRenderer.invoke('settings:setJinaApiKey', key),
  setSnovClientId: (clientId: string) => ipcRenderer.invoke('settings:setSnovClientId', clientId),
  setSnovClientSecret: (clientSecret: string) =>
    ipcRenderer.invoke('settings:setSnovClientSecret', clientSecret),
  hasRequiredKeys: () => ipcRenderer.invoke('settings:hasRequiredKeys'),
  getSelectedModel: () => ipcRenderer.invoke('settings:getSelectedModel'),
  setSelectedModel: (model: string) => ipcRenderer.invoke('settings:setSelectedModel', model),
  getSelectedAiProvider: () => ipcRenderer.invoke('settings:getSelectedAiProvider'),
  setSelectedAiProvider: (provider: AiProvider) =>
    ipcRenderer.invoke('settings:setSelectedAiProvider', provider),
  getSelectedGoogleMode: () => ipcRenderer.invoke('settings:getSelectedGoogleMode'),
  setSelectedGoogleMode: (mode: GoogleMode) =>
    ipcRenderer.invoke('settings:setSelectedGoogleMode', mode),
  getGoogleProjectId: () => ipcRenderer.invoke('settings:getGoogleProjectId'),
  setGoogleProjectId: (projectId: string) =>
    ipcRenderer.invoke('settings:setGoogleProjectId', projectId),
  getGoogleLocation: () => ipcRenderer.invoke('settings:getGoogleLocation'),
  setGoogleLocation: (location: string) =>
    ipcRenderer.invoke('settings:setGoogleLocation', location),

  // Profile
  getProfile: () => ipcRenderer.invoke('profile:get'),
  setProfile: (profile: unknown) => ipcRenderer.invoke('profile:set', profile),
  hasProfile: () => ipcRenderer.invoke('profile:hasProfile'),

  // Voice Profile (My Writing Voice)
  getVoiceProfile: () => ipcRenderer.invoke('voice:get'),
  setVoiceProfile: (profile: unknown) => ipcRenderer.invoke('voice:set', profile),
  hasVoiceProfile: () => ipcRenderer.invoke('voice:hasVoiceProfile'),

  // Multi-key API management
  getMultiKeys: () => ipcRenderer.invoke('settings:getMultiKeys'),
  setMultiKeys: (service: string, keys: { key: string; userId?: string; label?: string }[]) =>
    ipcRenderer.invoke('settings:setMultiKeys', service, keys),

  // AI Provider multi-key management
  getAiProviderMultiKeys: () => ipcRenderer.invoke('settings:getAiProviderMultiKeys'),
  setAiProviderMultiKeys: (
    provider: string,
    keys: { key: string; userId?: string; label?: string }[]
  ) => ipcRenderer.invoke('settings:setAiProviderMultiKeys', provider, keys),

  // Chat streaming
  streamChat: (messages: ChatMessage[]) => ipcRenderer.invoke('chat:stream', messages),
  onChatToken: (callback: (token: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string): void => callback(token)
    ipcRenderer.on('chat:token', handler)
    return () => ipcRenderer.removeListener('chat:token', handler)
  },
  onChatComplete: (callback: (fullText: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, fullText: string): void =>
      callback(fullText)
    ipcRenderer.on('chat:complete', handler)
    return () => ipcRenderer.removeListener('chat:complete', handler)
  },
  onChatError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string): void => callback(error)
    ipcRenderer.on('chat:error', handler)
    return () => ipcRenderer.removeListener('chat:error', handler)
  },
  onChatRetry: (
    callback: (data: { model: string; attempt: number; maxAttempts: number }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { model: string; attempt: number; maxAttempts: number }
    ): void => callback(data)
    ipcRenderer.on('chat:retry', handler)
    return () => ipcRenderer.removeListener('chat:retry', handler)
  },
  onChatModelSwitch: (callback: (data: { fromModel: string; toModel: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { fromModel: string; toModel: string }
    ): void => callback(data)
    ipcRenderer.on('chat:modelSwitch', handler)
    return () => ipcRenderer.removeListener('chat:modelSwitch', handler)
  },

  // Lead Generation
  generateLeads: (input: { searchQuery: string; niche: string; location: string; tabId: string }) =>
    ipcRenderer.invoke('leads:generate', input),
  onLeadsSearchStart: (cb: (data: { tabId: string; data: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: string }): void =>
      cb(d)
    ipcRenderer.on('leads:searchStart', handler)
    return () => ipcRenderer.removeListener('leads:searchStart', handler)
  },
  onLeadsSearchComplete: (cb: (data: { tabId: string; data: unknown[] }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: unknown[] }): void =>
      cb(d)
    ipcRenderer.on('leads:searchComplete', handler)
    return () => ipcRenderer.removeListener('leads:searchComplete', handler)
  },
  onLeadsCleanupProgress: (
    cb: (data: {
      tabId: string
      data: {
        current: number
        total: number
        url: string
        status: 'processing' | 'blocked' | 'allowed'
        service?: string
        category?: string
      }
    }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: {
        tabId: string
        data: {
          current: number
          total: number
          url: string
          status: 'processing' | 'blocked' | 'allowed'
          service?: string
          category?: string
        }
      }
    ): void => cb(d)
    ipcRenderer.on('leads:cleanupProgress', handler)
    return () => ipcRenderer.removeListener('leads:cleanupProgress', handler)
  },
  onLeadsServiceSwitched: (
    cb: (data: { tabId: string; data: { from: string; to: string; reason: string } }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { tabId: string; data: { from: string; to: string; reason: string } }
    ): void => cb(d)
    ipcRenderer.on('leads:serviceSwitched', handler)
    return () => ipcRenderer.removeListener('leads:serviceSwitched', handler)
  },
  onLeadsKeyRotation: (
    cb: (data: {
      tabId: string
      data: { service: string; keyIndex: number; totalKeys: number; reason: string }
    }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: {
        tabId: string
        data: { service: string; keyIndex: number; totalKeys: number; reason: string }
      }
    ): void => cb(d)
    ipcRenderer.on('leads:keyRotation', handler)
    return () => ipcRenderer.removeListener('leads:keyRotation', handler)
  },
  onLeadsProtectedUrl: (
    cb: (data: { tabId: string; data: { url: string; reason: string } }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { tabId: string; data: { url: string; reason: string } }
    ): void => cb(d)
    ipcRenderer.on('leads:protectedUrl', handler)
    return () => ipcRenderer.removeListener('leads:protectedUrl', handler)
  },
  onLeadsCleanupComplete: (cb: (data: { tabId: string; data: string[] }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: string[] }): void =>
      cb(d)
    ipcRenderer.on('leads:cleanupComplete', handler)
    return () => ipcRenderer.removeListener('leads:cleanupComplete', handler)
  },
  onLeadsScrapeStart: (cb: (data: { tabId: string; data: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: string }): void =>
      cb(d)
    ipcRenderer.on('leads:scrapeStart', handler)
    return () => ipcRenderer.removeListener('leads:scrapeStart', handler)
  },
  onLeadsScrapeComplete: (
    cb: (data: { tabId: string; data: { url: string; content: unknown } }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { tabId: string; data: { url: string; content: unknown } }
    ): void => cb(d)
    ipcRenderer.on('leads:scrapeComplete', handler)
    return () => ipcRenderer.removeListener('leads:scrapeComplete', handler)
  },
  onLeadsScrapeError: (
    cb: (data: { tabId: string; data: { url: string; error: string } }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { tabId: string; data: { url: string; error: string } }
    ): void => cb(d)
    ipcRenderer.on('leads:scrapeError', handler)
    return () => ipcRenderer.removeListener('leads:scrapeError', handler)
  },
  onLeadsAiStart: (cb: (data: { tabId: string; data: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: string }): void =>
      cb(d)
    ipcRenderer.on('leads:aiStart', handler)
    return () => ipcRenderer.removeListener('leads:aiStart', handler)
  },
  onLeadsAiResult: (
    cb: (data: {
      tabId: string
      data: { url: string; email: string | null; decisionMaker: string | null }
    }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: {
        tabId: string
        data: { url: string; email: string | null; decisionMaker: string | null }
      }
    ): void => cb(d)
    ipcRenderer.on('leads:aiResult', handler)
    return () => ipcRenderer.removeListener('leads:aiResult', handler)
  },
  onLeadsServiceMatchStart: (cb: (data: { tabId: string; data: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: string }): void =>
      cb(d)
    ipcRenderer.on('leads:serviceMatchStart', handler)
    return () => ipcRenderer.removeListener('leads:serviceMatchStart', handler)
  },
  onLeadsServiceMatchResult: (
    cb: (data: {
      tabId: string
      data: { url: string; needsServices: boolean; reason: string | null }
    }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: {
        tabId: string
        data: { url: string; needsServices: boolean; reason: string | null }
      }
    ): void => cb(d)
    ipcRenderer.on('leads:serviceMatchResult', handler)
    return () => ipcRenderer.removeListener('leads:serviceMatchResult', handler)
  },
  onLeadsHunterStart: (
    cb: (data: { tabId: string; data: { url: string; type: string } }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { tabId: string; data: { url: string; type: string } }
    ): void => cb(d)
    ipcRenderer.on('leads:hunterStart', handler)
    return () => ipcRenderer.removeListener('leads:hunterStart', handler)
  },
  onLeadsHunterResult: (
    cb: (data: { tabId: string; data: { url: string; email: string | null } }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { tabId: string; data: { url: string; email: string | null } }
    ): void => cb(d)
    ipcRenderer.on('leads:hunterResult', handler)
    return () => ipcRenderer.removeListener('leads:hunterResult', handler)
  },
  onLeadsVerifyStart: (cb: (data: { tabId: string; data: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: string }): void =>
      cb(d)
    ipcRenderer.on('leads:verifyStart', handler)
    return () => ipcRenderer.removeListener('leads:verifyStart', handler)
  },
  onLeadsVerifyResult: (
    cb: (data: { tabId: string; data: { email: string; verified: boolean } }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { tabId: string; data: { email: string; verified: boolean } }
    ): void => cb(d)
    ipcRenderer.on('leads:verifyResult', handler)
    return () => ipcRenderer.removeListener('leads:verifyResult', handler)
  },
  onLeadFound: (cb: (data: { tabId: string; data: unknown }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: unknown }): void =>
      cb(d)
    ipcRenderer.on('leads:found', handler)
    return () => ipcRenderer.removeListener('leads:found', handler)
  },
  onLeadsComplete: (cb: (data: { tabId: string; data: unknown[] }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: unknown[] }): void =>
      cb(d)
    ipcRenderer.on('leads:complete', handler)
    return () => ipcRenderer.removeListener('leads:complete', handler)
  },
  onLeadsError: (cb: (data: { tabId: string; data: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { tabId: string; data: string }): void =>
      cb(d)
    ipcRenderer.on('leads:error', handler)
    return () => ipcRenderer.removeListener('leads:error', handler)
  },

  // Auto-Update API
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (cb: (data: { version: string; releaseNotes?: string }) => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      data: { version: string; releaseNotes?: string }
    ): void => cb(data)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateProgress: (
    cb: (data: {
      percent: number
      bytesPerSecond: number
      transferred: number
      total: number
    }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      data: { percent: number; bytesPerSecond: number; transferred: number; total: number }
    ): void => cb(data)
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  },
  onUpdateDownloaded: (cb: (data: { version: string; releaseNotes?: string }) => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      data: { version: string; releaseNotes?: string }
    ): void => cb(data)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateError: (cb: (error: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, e: string): void => cb(e)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },

  // Template Management
  getTemplates: () => ipcRenderer.invoke('templates:getAll'),
  getTemplate: (id: string) => ipcRenderer.invoke('templates:get', id),
  saveTemplate: (template: {
    id?: string
    name: string
    json: Record<string, unknown>
    thumbnail?: string
  }) => ipcRenderer.invoke('templates:save', template),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id),

  // Email Pitch Generator
  generateEmailPitch: (input: unknown) => ipcRenderer.invoke('email:generate-pitch', input),
  generateEmailPitchForLead: (lead: unknown) =>
    ipcRenderer.invoke('email:generate-pitch-for-lead', lead),

  // Strategy Management
  getNicheStrategy: () => ipcRenderer.invoke('strategy:get'),
  saveNicheStrategy: (strategy: unknown) => ipcRenderer.invoke('strategy:save', strategy),
  researchNicheStrategy: (niche: string, targetAudience: string) =>
    ipcRenderer.invoke('strategy:research', { niche, targetAudience }),
  onStrategyProgress: (
    cb: (data: {
      pillarId: 'service' | 'persona' | 'offer' | 'tactics'
      pillarName: string
      step: 'waiting' | 'searching' | 'scraping' | 'analyzing' | 'complete' | 'error'
      message: string
      searchQueries?: number
      urlsFound?: number
      urlsScraped?: number
      error?: string
    }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      data: {
        pillarId: 'service' | 'persona' | 'offer' | 'tactics'
        pillarName: string
        step: 'waiting' | 'searching' | 'scraping' | 'analyzing' | 'complete' | 'error'
        message: string
        searchQueries?: number
        urlsFound?: number
        urlsScraped?: number
        error?: string
      }
    ): void => cb(data)
    ipcRenderer.on('strategy:progress', handler)
    return () => ipcRenderer.removeListener('strategy:progress', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
