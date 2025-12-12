import Store from 'electron-store'

interface StoreSchema {
  groqApiKey: string
  serperApiKey: string
}

const store = new Store<StoreSchema>({
  defaults: {
    groqApiKey: '',
    serperApiKey: ''
  },
  encryptionKey: 'ar-branding-secure-key-2025'
})

export function getApiKeys(): { groqApiKey: string; serperApiKey: string } {
  return {
    groqApiKey: store.get('groqApiKey', ''),
    serperApiKey: store.get('serperApiKey', '')
  }
}

export function setGroqApiKey(key: string): void {
  store.set('groqApiKey', key)
}

export function setSerperApiKey(key: string): void {
  store.set('serperApiKey', key)
}

export function hasRequiredApiKeys(): boolean {
  const keys = getApiKeys()
  return keys.groqApiKey.length > 0 && keys.serperApiKey.length > 0
}

export { store }
