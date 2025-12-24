/**
 * WhatsApp Service
 * Uses whatsapp-web.js to check if phone numbers are registered on WhatsApp.
 * This is a FREE solution that runs locally via WhatsApp Web.
 *
 * IMPORTANT:
 * - Requires scanning a QR code with your phone to authenticate
 * - Use a dedicated/burner WhatsApp account for this, not your personal one
 * - Adds delays between checks to avoid being rate-limited/banned
 */

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { Client, LocalAuth } from 'whatsapp-web.js'

// WhatsApp client instance
let client: Client | null = null
let isClientReady = false
let isClientInitializing = false
let currentQrCode: string | null = null
let lastError: string | null = null

// Rate limiting
const CHECK_DELAY_MS = 5000 // 5 seconds between each check to be safe
let lastCheckTime = 0

// Get the data path for storing session
function getDataPath(): string {
  return join(app.getPath('userData'), '.wwebjs_auth')
}

/**
 * Initialize the WhatsApp client
 */
export async function initializeWhatsAppClient(): Promise<void> {
  if (client || isClientInitializing) {
    console.log('[WhatsApp] Client already exists or is initializing')
    return
  }

  isClientInitializing = true
  lastError = null
  currentQrCode = null

  try {
    console.log('[WhatsApp] Initializing client...')

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: getDataPath(),
        clientId: 'brandtize-whatsapp-checker'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    })

    // Event: QR code received (needs to be scanned)
    client.on('qr', (qr: string) => {
      console.log('[WhatsApp] QR Code received. Send to renderer for display.')
      currentQrCode = qr
      isClientReady = false

      // Send QR to all renderer windows
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('whatsapp-qr', qr)
      })
    })

    // Event: Client is ready
    client.on('ready', () => {
      console.log('[WhatsApp] Client is ready!')
      isClientReady = true
      currentQrCode = null
      isClientInitializing = false

      // Notify renderer
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('whatsapp-ready')
      })
    })

    // Event: Authenticated
    client.on('authenticated', () => {
      console.log('[WhatsApp] Client authenticated')
    })

    // Event: Authentication failure
    client.on('auth_failure', (msg: string) => {
      console.error('[WhatsApp] Authentication failure:', msg)
      lastError = `Authentication failed: ${msg}`
      isClientReady = false
      isClientInitializing = false

      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('whatsapp-auth-failure', msg)
      })
    })

    // Event: Disconnected
    client.on('disconnected', (reason: string) => {
      console.log('[WhatsApp] Client disconnected:', reason)
      isClientReady = false
      currentQrCode = null

      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('whatsapp-disconnected', reason)
      })
    })

    // Initialize the client
    await client.initialize()
  } catch (error) {
    console.error('[WhatsApp] Failed to initialize client:', error)
    lastError = error instanceof Error ? error.message : 'Failed to initialize WhatsApp client'
    isClientInitializing = false
    throw error
  }
}

/**
 * Get the current status of the WhatsApp client
 */
export function getWhatsAppStatus(): {
  isReady: boolean
  isInitializing: boolean
  hasQrCode: boolean
  qrCode: string | null
  error: string | null
} {
  return {
    isReady: isClientReady,
    isInitializing: isClientInitializing,
    hasQrCode: !!currentQrCode,
    qrCode: currentQrCode,
    error: lastError
  }
}

/**
 * Check if a phone number is registered on WhatsApp
 * @param phoneNumber - The phone number to check (with country code, e.g., "1234567890" or "+1234567890")
 * @returns Object with hasWhatsApp status and formatted number
 */
export async function checkWhatsAppNumber(phoneNumber: string): Promise<{
  hasWhatsApp: boolean
  formattedNumber: string | null
  error: string | null
}> {
  if (!client || !isClientReady) {
    return {
      hasWhatsApp: false,
      formattedNumber: null,
      error: 'WhatsApp client is not ready. Please scan the QR code first.'
    }
  }

  // Rate limiting - wait if we checked too recently
  const now = Date.now()
  const timeSinceLastCheck = now - lastCheckTime
  if (timeSinceLastCheck < CHECK_DELAY_MS) {
    const waitTime = CHECK_DELAY_MS - timeSinceLastCheck
    console.log(`[WhatsApp] Rate limiting: waiting ${waitTime}ms before check`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }
  lastCheckTime = Date.now()

  try {
    // Clean the phone number - remove all non-numeric characters except leading +
    let cleanNumber = phoneNumber.replace(/[^\d+]/g, '')
    // Remove leading + if present (WhatsApp API expects just numbers)
    if (cleanNumber.startsWith('+')) {
      cleanNumber = cleanNumber.substring(1)
    }

    console.log(`[WhatsApp] Checking number: ${cleanNumber}`)

    // Use getNumberId to check if the number is registered
    // This returns the WhatsApp ID if registered, null if not
    const numberId = await client.getNumberId(cleanNumber)

    if (numberId) {
      console.log(`[WhatsApp] Number ${cleanNumber} IS registered on WhatsApp`)
      return {
        hasWhatsApp: true,
        formattedNumber: numberId._serialized,
        error: null
      }
    } else {
      console.log(`[WhatsApp] Number ${cleanNumber} is NOT registered on WhatsApp`)
      return {
        hasWhatsApp: false,
        formattedNumber: null,
        error: null
      }
    }
  } catch (error) {
    console.error('[WhatsApp] Error checking number:', error)
    return {
      hasWhatsApp: false,
      formattedNumber: null,
      error: error instanceof Error ? error.message : 'Failed to check WhatsApp number'
    }
  }
}

/**
 * Disconnect the WhatsApp client
 */
export async function disconnectWhatsApp(): Promise<void> {
  if (client) {
    try {
      await client.destroy()
    } catch (error) {
      console.error('[WhatsApp] Error destroying client:', error)
    }
    client = null
    isClientReady = false
    currentQrCode = null
    isClientInitializing = false
  }
}

/**
 * Logout from WhatsApp (clears session)
 */
export async function logoutWhatsApp(): Promise<void> {
  if (client && isClientReady) {
    try {
      await client.logout()
    } catch (error) {
      console.error('[WhatsApp] Error logging out:', error)
    }
  }
  await disconnectWhatsApp()
}
