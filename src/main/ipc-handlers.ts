import { ipcMain } from 'electron'
import {
  getApiKeys,
  setGroqApiKey,
  setSerperApiKey,
  hasRequiredApiKeys,
  getSelectedModel,
  setSelectedModel,
  getAgencyProfile,
  setAgencyProfile,
  hasAgencyProfile,
  type AgencyProfile
} from './store'

export function setupIpcHandlers(): void {
  // Settings handlers
  ipcMain.handle('settings:getApiKeys', () => {
    const keys = getApiKeys()
    return {
      groqApiKey: keys.groqApiKey ? '••••••••' + keys.groqApiKey.slice(-4) : '',
      serperApiKey: keys.serperApiKey ? '••••••••' + keys.serperApiKey.slice(-4) : '',
      hasGroqKey: keys.groqApiKey.length > 0,
      hasSerperKey: keys.serperApiKey.length > 0
    }
  })

  ipcMain.handle('settings:setGroqApiKey', (_event, key: string) => {
    setGroqApiKey(key)
    return { success: true }
  })

  ipcMain.handle('settings:setSerperApiKey', (_event, key: string) => {
    setSerperApiKey(key)
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
}
