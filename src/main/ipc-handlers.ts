import { ipcMain } from 'electron'
import {
  getApiKeys,
  getGoogleApiKeys,
  // Multi-key getters/setters
  getGroqApiKeys,
  getHunterApiKeys,
  getJinaApiKeys,
  getMistralApiKeys,
  getReoonApiKeys,
  getSerperApiKeys,
  getSnovApiKeys,
  setGoogleApiKey,
  setGoogleApiKeys,
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
  setSerperApiKey,
  setSerperApiKeys,
  setSnovApiKeys,
  setSnovClientId,
  setSnovClientSecret,
  type ApiKeyEntry
} from './store'

export function registerIpcHandlers(): void {
  // ========================================
  // GET ALL API KEYS
  // ========================================
  ipcMain.handle('get-api-keys', () => {
    return getApiKeys()
  })

  // ========================================
  // GROQ
  // ========================================
  ipcMain.handle('get-groq-api-key', () => {
    return getApiKeys().groqApiKey
  })

  ipcMain.handle('set-groq-api-key', (_event, key: string) => {
    setGroqApiKey(key)
    return true
  })

  ipcMain.handle('get-groq-api-keys', () => {
    return getGroqApiKeys()
  })

  ipcMain.handle('set-groq-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setGroqApiKeys(keys)
    return true
  })

  // ========================================
  // MISTRAL
  // ========================================
  ipcMain.handle('get-mistral-api-key', () => {
    return getApiKeys().mistralApiKey
  })

  ipcMain.handle('set-mistral-api-key', (_event, key: string) => {
    setMistralApiKey(key)
    return true
  })

  ipcMain.handle('get-mistral-api-keys', () => {
    return getMistralApiKeys()
  })

  ipcMain.handle('set-mistral-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setMistralApiKeys(keys)
    return true
  })

  // ========================================
  // GOOGLE (GEMINI)
  // ========================================
  ipcMain.handle('get-google-api-key', () => {
    return getApiKeys().googleApiKey
  })

  ipcMain.handle('set-google-api-key', (_event, key: string) => {
    setGoogleApiKey(key)
    return true
  })

  ipcMain.handle('get-google-api-keys', () => {
    return getGoogleApiKeys()
  })

  ipcMain.handle('set-google-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setGoogleApiKeys(keys)
    return true
  })

  // ========================================
  // SERPER
  // ========================================
  ipcMain.handle('get-serper-api-key', () => {
    return getApiKeys().serperApiKey
  })

  ipcMain.handle('set-serper-api-key', (_event, key: string) => {
    setSerperApiKey(key)
    return true
  })

  ipcMain.handle('get-serper-api-keys', () => {
    return getSerperApiKeys()
  })

  ipcMain.handle('set-serper-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setSerperApiKeys(keys)
    return true
  })

  // ========================================
  // JINA
  // ========================================
  ipcMain.handle('get-jina-api-key', () => {
    return getApiKeys().jinaApiKey
  })

  ipcMain.handle('set-jina-api-key', (_event, key: string) => {
    setJinaApiKey(key)
    return true
  })

  ipcMain.handle('get-jina-api-keys', () => {
    return getJinaApiKeys()
  })

  ipcMain.handle('set-jina-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setJinaApiKeys(keys)
    return true
  })

  // ========================================
  // HUNTER
  // ========================================
  ipcMain.handle('get-hunter-api-key', () => {
    return getApiKeys().hunterApiKey
  })

  ipcMain.handle('set-hunter-api-key', (_event, key: string) => {
    setHunterApiKey(key)
    return true
  })

  ipcMain.handle('get-hunter-api-keys', () => {
    return getHunterApiKeys()
  })

  ipcMain.handle('set-hunter-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setHunterApiKeys(keys)
    return true
  })

  // ========================================
  // REOON
  // ========================================
  ipcMain.handle('get-reoon-api-key', () => {
    return getApiKeys().reoonApiKey
  })

  ipcMain.handle('set-reoon-api-key', (_event, key: string) => {
    setReoonApiKey(key)
    return true
  })

  ipcMain.handle('get-reoon-api-keys', () => {
    return getReoonApiKeys()
  })

  ipcMain.handle('set-reoon-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setReoonApiKeys(keys)
    return true
  })

  // ========================================
  // SNOV
  // ========================================
  ipcMain.handle('get-snov-credentials', () => {
    const keys = getApiKeys()
    return {
      clientId: keys.snovClientId,
      clientSecret: keys.snovClientSecret
    }
  })

  ipcMain.handle('set-snov-credentials', (_event, clientId: string, clientSecret: string) => {
    setSnovClientId(clientId)
    setSnovClientSecret(clientSecret)
    return true
  })

  ipcMain.handle('get-snov-api-keys', () => {
    return getSnovApiKeys()
  })

  ipcMain.handle('set-snov-api-keys', (_event, keys: ApiKeyEntry[]) => {
    setSnovApiKeys(keys)
    return true
  })
}
