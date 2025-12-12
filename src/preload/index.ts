import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Settings
  getApiKeys: () => ipcRenderer.invoke('settings:getApiKeys'),
  setGroqApiKey: (key: string) => ipcRenderer.invoke('settings:setGroqApiKey', key),
  setSerperApiKey: (key: string) => ipcRenderer.invoke('settings:setSerperApiKey', key),
  hasRequiredKeys: () => ipcRenderer.invoke('settings:hasRequiredKeys'),
  getSelectedModel: () => ipcRenderer.invoke('settings:getSelectedModel'),
  setSelectedModel: (model: string) => ipcRenderer.invoke('settings:setSelectedModel', model),

  // Profile
  getProfile: () => ipcRenderer.invoke('profile:get'),
  setProfile: (profile: unknown) => ipcRenderer.invoke('profile:set', profile),
  hasProfile: () => ipcRenderer.invoke('profile:hasProfile'),

  // Agent
  startAgent: (tabId: string, niche: string) => ipcRenderer.invoke('agent:start', { tabId, niche }),
  stopAgent: (tabId: string) => ipcRenderer.invoke('agent:stop', { tabId }),
  onAgentEvent: (callback: (data: { tabId: string; event: unknown }) => void): (() => void) => {
    const handler = (_event: unknown, data: { tabId: string; event: unknown }): void =>
      callback(data)
    ipcRenderer.on('agent:event', handler)
    return (): void => {
      ipcRenderer.removeListener('agent:event', handler)
    }
  },
  onAgentLead: (callback: (data: { tabId: string; lead: unknown }) => void): (() => void) => {
    const handler = (_event: unknown, data: { tabId: string; lead: unknown }): void =>
      callback(data)
    ipcRenderer.on('agent:lead', handler)
    return (): void => {
      ipcRenderer.removeListener('agent:lead', handler)
    }
  },
  onAgentComplete: (callback: (data: { tabId: string }) => void): (() => void) => {
    const handler = (_event: unknown, data: { tabId: string }): void => callback(data)
    ipcRenderer.on('agent:complete', handler)
    return (): void => {
      ipcRenderer.removeListener('agent:complete', handler)
    }
  },
  onAgentError: (callback: (data: { tabId: string; error: string }) => void): (() => void) => {
    const handler = (_event: unknown, data: { tabId: string; error: string }): void =>
      callback(data)
    ipcRenderer.on('agent:error', handler)
    return (): void => {
      ipcRenderer.removeListener('agent:error', handler)
    }
  },

  // Mail
  openMail: (to: string, subject: string, body: string) =>
    ipcRenderer.invoke('mail:open', { to, subject, body })
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
