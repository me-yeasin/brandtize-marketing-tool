import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
  setNeutrinoApiKey: (key: string) => ipcRenderer.invoke('settings:setNeutrinoApiKey', key),
  setNeutrinoUserId: (userId: string) => ipcRenderer.invoke('settings:setNeutrinoUserId', userId),
  setLinkPreviewApiKey: (key: string) => ipcRenderer.invoke('settings:setLinkPreviewApiKey', key),
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

  // Multi-key API management
  getMultiKeys: () => ipcRenderer.invoke('settings:getMultiKeys'),
  setMultiKeys: (service: string, keys: { key: string; userId?: string; label?: string }[]) =>
    ipcRenderer.invoke('settings:setMultiKeys', service, keys),

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
  generateLeads: (input: { searchQuery: string; niche: string; location: string }) =>
    ipcRenderer.invoke('leads:generate', input),
  onLeadsSearchStart: (cb: (query: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, q: string): void => cb(q)
    ipcRenderer.on('leads:searchStart', handler)
    return () => ipcRenderer.removeListener('leads:searchStart', handler)
  },
  onLeadsSearchComplete: (cb: (results: unknown[]) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, r: unknown[]): void => cb(r)
    ipcRenderer.on('leads:searchComplete', handler)
    return () => ipcRenderer.removeListener('leads:searchComplete', handler)
  },
  onLeadsCleanupProgress: (
    cb: (data: {
      current: number
      total: number
      url: string
      status: 'processing' | 'blocked' | 'allowed'
      service?: string
      category?: string
    }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      data: {
        current: number
        total: number
        url: string
        status: 'processing' | 'blocked' | 'allowed'
        service?: string
        category?: string
      }
    ): void => cb(data)
    ipcRenderer.on('leads:cleanupProgress', handler)
    return () => ipcRenderer.removeListener('leads:cleanupProgress', handler)
  },
  onLeadsServiceSwitched: (cb: (data: { from: string; to: string; reason: string }) => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      data: { from: string; to: string; reason: string }
    ): void => cb(data)
    ipcRenderer.on('leads:serviceSwitched', handler)
    return () => ipcRenderer.removeListener('leads:serviceSwitched', handler)
  },
  onLeadsProtectedUrl: (cb: (data: { url: string; reason: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { url: string; reason: string }): void =>
      cb(data)
    ipcRenderer.on('leads:protectedUrl', handler)
    return () => ipcRenderer.removeListener('leads:protectedUrl', handler)
  },
  onLeadsCleanupComplete: (cb: (urls: string[]) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, u: string[]): void => cb(u)
    ipcRenderer.on('leads:cleanupComplete', handler)
    return () => ipcRenderer.removeListener('leads:cleanupComplete', handler)
  },
  onLeadsScrapeStart: (cb: (url: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, u: string): void => cb(u)
    ipcRenderer.on('leads:scrapeStart', handler)
    return () => ipcRenderer.removeListener('leads:scrapeStart', handler)
  },
  onLeadsScrapeComplete: (cb: (data: { url: string; content: unknown }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { url: string; content: unknown }): void =>
      cb(d)
    ipcRenderer.on('leads:scrapeComplete', handler)
    return () => ipcRenderer.removeListener('leads:scrapeComplete', handler)
  },
  onLeadsScrapeError: (cb: (data: { url: string; error: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { url: string; error: string }): void =>
      cb(d)
    ipcRenderer.on('leads:scrapeError', handler)
    return () => ipcRenderer.removeListener('leads:scrapeError', handler)
  },
  onLeadsAiStart: (cb: (url: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, u: string): void => cb(u)
    ipcRenderer.on('leads:aiStart', handler)
    return () => ipcRenderer.removeListener('leads:aiStart', handler)
  },
  onLeadsAiResult: (
    cb: (data: { url: string; email: string | null; decisionMaker: string | null }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { url: string; email: string | null; decisionMaker: string | null }
    ): void => cb(d)
    ipcRenderer.on('leads:aiResult', handler)
    return () => ipcRenderer.removeListener('leads:aiResult', handler)
  },
  onLeadsServiceMatchStart: (cb: (url: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, u: string): void => cb(u)
    ipcRenderer.on('leads:serviceMatchStart', handler)
    return () => ipcRenderer.removeListener('leads:serviceMatchStart', handler)
  },
  onLeadsServiceMatchResult: (
    cb: (data: { url: string; needsServices: boolean; reason: string | null }) => void
  ) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { url: string; needsServices: boolean; reason: string | null }
    ): void => cb(d)
    ipcRenderer.on('leads:serviceMatchResult', handler)
    return () => ipcRenderer.removeListener('leads:serviceMatchResult', handler)
  },
  onLeadsHunterStart: (cb: (data: { url: string; type: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, d: { url: string; type: string }): void => cb(d)
    ipcRenderer.on('leads:hunterStart', handler)
    return () => ipcRenderer.removeListener('leads:hunterStart', handler)
  },
  onLeadsHunterResult: (cb: (data: { url: string; email: string | null }) => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { url: string; email: string | null }
    ): void => cb(d)
    ipcRenderer.on('leads:hunterResult', handler)
    return () => ipcRenderer.removeListener('leads:hunterResult', handler)
  },
  onLeadsVerifyStart: (cb: (email: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, e: string): void => cb(e)
    ipcRenderer.on('leads:verifyStart', handler)
    return () => ipcRenderer.removeListener('leads:verifyStart', handler)
  },
  onLeadsVerifyResult: (cb: (data: { email: string; verified: boolean }) => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      d: { email: string; verified: boolean }
    ): void => cb(d)
    ipcRenderer.on('leads:verifyResult', handler)
    return () => ipcRenderer.removeListener('leads:verifyResult', handler)
  },
  onLeadFound: (cb: (lead: unknown) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, l: unknown): void => cb(l)
    ipcRenderer.on('leads:found', handler)
    return () => ipcRenderer.removeListener('leads:found', handler)
  },
  onLeadsComplete: (cb: (leads: unknown[]) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, l: unknown[]): void => cb(l)
    ipcRenderer.on('leads:complete', handler)
    return () => ipcRenderer.removeListener('leads:complete', handler)
  },
  onLeadsError: (cb: (error: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, e: string): void => cb(e)
    ipcRenderer.on('leads:error', handler)
    return () => ipcRenderer.removeListener('leads:error', handler)
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
