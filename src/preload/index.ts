import { contextBridge } from 'electron'

// Expose minimal API to renderer
contextBridge.exposeInMainWorld('api', {
  // Add API methods here as needed
})
