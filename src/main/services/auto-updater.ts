import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'

let mainWindow: BrowserWindow | null = null

export function setupAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  // Disable auto download - we'll control when to download
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Check for updates on startup (after 5 seconds to let app load)
  setTimeout(() => {
    checkForUpdates()
  }, 5000)

  // Check every 30 minutes
  setInterval(
    () => {
      checkForUpdates()
    },
    30 * 60 * 1000
  )

  // Event: Update available
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version)
    mainWindow?.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
    // Auto-download the update
    autoUpdater.downloadUpdate()
  })

  // Event: No update available
  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] No update available')
  })

  // Event: Download progress
  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(1)}%`)
    mainWindow?.webContents.send('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  // Event: Update downloaded - ready to install
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version)
    mainWindow?.webContents.send('update:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  // Event: Error
  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdater] Error:', error.message)
    mainWindow?.webContents.send('update:error', error.message)
  })

  // IPC: Manual check for updates
  ipcMain.handle('update:check', async () => {
    return checkForUpdates()
  })

  // IPC: Install update and restart
  ipcMain.handle('update:install', () => {
    console.log('[AutoUpdater] Installing update and restarting...')
    autoUpdater.quitAndInstall(false, true)
  })
}

async function checkForUpdates(): Promise<boolean> {
  try {
    console.log('[AutoUpdater] Checking for updates...')
    const result = await autoUpdater.checkForUpdates()
    return result !== null
  } catch (error) {
    console.error('[AutoUpdater] Check failed:', error)
    return false
  }
}
