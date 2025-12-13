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
  hasProfile: () => ipcRenderer.invoke('profile:hasProfile')
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
