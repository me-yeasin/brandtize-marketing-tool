import { ipcMain, shell, BrowserWindow } from 'electron'
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
import { EmailAgent } from './agent/email-agent'

const activeAgents: Map<string, EmailAgent> = new Map()

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

  // Agent handlers
  ipcMain.handle(
    'agent:start',
    async (event, { tabId, niche }: { tabId: string; niche: string }) => {
      const keys = getApiKeys()
      if (!keys.groqApiKey || !keys.serperApiKey) {
        return { success: false, error: 'API keys not configured. Please set them in Settings.' }
      }

      if (!hasAgencyProfile()) {
        return {
          success: false,
          error:
            'Profile not configured. Please go to Settings and add your profile (type, name, and at least one service).'
        }
      }

      // Stop existing agent for this tab if any
      if (activeAgents.has(tabId)) {
        activeAgents.get(tabId)?.stop()
        activeAgents.delete(tabId)
      }

      const selectedModel = getSelectedModel()
      const agent = new EmailAgent(keys.groqApiKey, keys.serperApiKey, selectedModel)
      activeAgents.set(tabId, agent)

      // Set up event forwarding to renderer
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        agent.on('event', (agentEvent) => {
          window.webContents.send('agent:event', { tabId, event: agentEvent })
        })

        agent.on('lead', (lead) => {
          window.webContents.send('agent:lead', { tabId, lead })
        })

        agent.on('complete', () => {
          window.webContents.send('agent:complete', { tabId })
          activeAgents.delete(tabId)
        })

        agent.on('error', (error) => {
          window.webContents.send('agent:error', { tabId, error: error.message })
          activeAgents.delete(tabId)
        })
      }

      // Start agent (non-blocking)
      agent.run(niche).catch((err) => {
        console.error('Agent error:', err)
      })

      return { success: true }
    }
  )

  ipcMain.handle('agent:stop', (_event, { tabId }: { tabId: string }) => {
    if (activeAgents.has(tabId)) {
      activeAgents.get(tabId)?.stop()
      activeAgents.delete(tabId)
      return { success: true }
    }
    return { success: false, error: 'No active agent for this tab' }
  })

  // Mail handler
  ipcMain.handle(
    'mail:open',
    (_event, { to, subject, body }: { to: string; subject: string; body: string }) => {
      const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      shell.openExternal(mailtoUrl)
      return { success: true }
    }
  )
}
