import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

// Custom APIs for renderer
type AiProvider = 'groq' | 'mistral'

const api = {
  // Settings
  getApiKeys: () => ipcRenderer.invoke('settings:getApiKeys'),
  setGroqApiKey: (key: string) => ipcRenderer.invoke('settings:setGroqApiKey', key),
  setMistralApiKey: (key: string) => ipcRenderer.invoke('settings:setMistralApiKey', key),
  setSerperApiKey: (key: string) => ipcRenderer.invoke('settings:setSerperApiKey', key),
  hasRequiredKeys: () => ipcRenderer.invoke('settings:hasRequiredKeys'),
  getSelectedModel: () => ipcRenderer.invoke('settings:getSelectedModel'),
  setSelectedModel: (model: string) => ipcRenderer.invoke('settings:setSelectedModel', model),
  getSelectedAiProvider: () => ipcRenderer.invoke('settings:getSelectedAiProvider'),
  setSelectedAiProvider: (provider: AiProvider) =>
    ipcRenderer.invoke('settings:setSelectedAiProvider', provider),

  // Profile
  getProfile: () => ipcRenderer.invoke('profile:get'),
  setProfile: (profile: unknown) => ipcRenderer.invoke('profile:set', profile),
  hasProfile: () => ipcRenderer.invoke('profile:hasProfile'),

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
