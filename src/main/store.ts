import Store from 'electron-store'

interface StoreSchema {
  groqApiKey: string
  serperApiKey: string
  selectedModel: string
}

const store = new Store<StoreSchema>({
  defaults: {
    groqApiKey: '',
    serperApiKey: '',
    selectedModel: 'llama-3.3-70b-versatile'
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

export function getSelectedModel(): string {
  return store.get('selectedModel', 'llama-3.3-70b-versatile')
}

export function setSelectedModel(model: string): void {
  store.set('selectedModel', model)
}

export function hasRequiredApiKeys(): boolean {
  const keys = getApiKeys()
  return keys.groqApiKey.length > 0 && keys.serperApiKey.length > 0
}

export { store }
