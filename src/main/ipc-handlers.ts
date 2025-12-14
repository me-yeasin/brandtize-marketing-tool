import { ipcMain, BrowserWindow } from 'electron'
import {
  getApiKeys,
  setGroqApiKey,
  setMistralApiKey,
  setGoogleApiKey,
  setSerperApiKey,
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
  type AgencyProfile,
  type AiProvider,
  type GoogleMode
} from './store'
import { streamAgentResponse, type ChatMessage } from './services'

export function setupIpcHandlers(): void {
  // Settings handlers
  ipcMain.handle('settings:getApiKeys', () => {
    const keys = getApiKeys()
    return {
      groqApiKey: keys.groqApiKey ? '••••••••' + keys.groqApiKey.slice(-4) : '',
      mistralApiKey: keys.mistralApiKey ? '••••••••' + keys.mistralApiKey.slice(-4) : '',
      googleApiKey: keys.googleApiKey ? '••••••••' + keys.googleApiKey.slice(-4) : '',
      serperApiKey: keys.serperApiKey ? '••••••••' + keys.serperApiKey.slice(-4) : '',
      hasGroqKey: keys.groqApiKey.length > 0,
      hasMistralKey: keys.mistralApiKey.length > 0,
      hasGoogleKey: keys.googleApiKey.length > 0,
      hasSerperKey: keys.serperApiKey.length > 0
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
}
