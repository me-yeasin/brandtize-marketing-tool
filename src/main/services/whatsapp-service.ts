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
import { existsSync } from 'fs'
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

function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
  if (signal.aborted) {
    const err = new Error('Aborted')
    ;(err as { name?: string }).name = 'AbortError'
    return Promise.reject(err)
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timeout)
      const err = new Error('Aborted')
      ;(err as { name?: string }).name = 'AbortError'
      reject(err)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

// Get the data path for storing session
function getDataPath(): string {
  return join(app.getPath('userData'), '.wwebjs_auth')
}

function resolveBrowserExecutablePath(): string | null {
  const explicit =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    process.env.GOOGLE_CHROME_BIN ||
    process.env.CHROMIUM_PATH

  if (explicit && existsSync(explicit)) {
    return explicit
  }

  const candidates: string[] = []

  if (process.platform === 'win32') {
    const programFiles = process.env.PROGRAMFILES
    const programFilesX86 = process.env['PROGRAMFILES(X86)']
    const localAppData = process.env.LOCALAPPDATA

    if (programFiles) {
      candidates.push(join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'))
      candidates.push(join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
      candidates.push(
        join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
      )
    }

    if (programFilesX86) {
      candidates.push(join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'))
      candidates.push(join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
      candidates.push(
        join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
      )
    }

    if (localAppData) {
      candidates.push(join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'))
      candidates.push(join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
      candidates.push(
        join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
      )
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    candidates.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')
    candidates.push('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser')
    candidates.push('/Applications/Chromium.app/Contents/MacOS/Chromium')
  } else {
    candidates.push('/usr/bin/google-chrome-stable')
    candidates.push('/usr/bin/google-chrome')
    candidates.push('/usr/bin/chromium-browser')
    candidates.push('/usr/bin/chromium')
    candidates.push('/snap/bin/chromium')
    candidates.push('/usr/bin/microsoft-edge')
    candidates.push('/usr/bin/microsoft-edge-stable')
    candidates.push('/usr/bin/brave-browser')
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  return null
}

/**
 * Initialize the WhatsApp client
 */
export async function initializeWhatsAppClient(): Promise<void> {
  if (isClientInitializing) {
    console.log('[WhatsApp] Client is initializing')
    return
  }

  if (client && !isClientReady) {
    try {
      await client.destroy()
    } catch {
      // ignore
    }
    client = null
  }

  if (client) {
    console.log('[WhatsApp] Client already exists')
    return
  }

  isClientInitializing = true
  lastError = null
  currentQrCode = null

  try {
    console.log('[WhatsApp] Initializing client...')

    const executablePath = resolveBrowserExecutablePath()
    if (!executablePath) {
      throw new Error(
        'Could not find a Chromium-based browser (Chrome/Edge/Brave). Install one, or set PUPPETEER_EXECUTABLE_PATH.'
      )
    }

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: getDataPath(),
        clientId: 'brandtize-whatsapp-checker'
      }),
      puppeteer: {
        executablePath,
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
    isClientReady = false
    currentQrCode = null
    try {
      await client?.destroy()
    } catch {
      // ignore
    }
    client = null
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
export async function checkWhatsAppNumber(
  phoneNumber: string,
  signal?: AbortSignal
): Promise<{
  hasWhatsApp: boolean
  formattedNumber: string | null
  error: string | null
}> {
  if (signal?.aborted) {
    const err = new Error('Aborted')
    ;(err as { name?: string }).name = 'AbortError'
    throw err
  }
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
    await sleepWithSignal(waitTime, signal)
  }
  lastCheckTime = Date.now()

  try {
    if (signal?.aborted) {
      const err = new Error('Aborted')
      ;(err as { name?: string }).name = 'AbortError'
      throw err
    }
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
    const clientToDestroy = client
    client = null
    isClientReady = false
    currentQrCode = null
    isClientInitializing = false
    try {
      await clientToDestroy.destroy()
    } catch (error) {
      console.error('[WhatsApp] Error destroying client:', error)
    }
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
