import { useState, useEffect } from 'react'
import { FiDownload, FiRefreshCw } from 'react-icons/fi'

export function UpdateNotification(): React.JSX.Element | null {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [newVersion, setNewVersion] = useState('')

  useEffect(() => {
    const unsubAvailable = window.api.onUpdateAvailable((data) => {
      setUpdateAvailable(true)
      setNewVersion(data.version)
    })

    const unsubProgress = window.api.onUpdateProgress((data) => {
      setDownloadProgress(Math.round(data.percent))
    })

    const unsubDownloaded = window.api.onUpdateDownloaded((data) => {
      setUpdateDownloaded(true)
      setNewVersion(data.version)
    })

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubDownloaded()
    }
  }, [])

  const handleRestart = (): void => {
    window.api.installUpdate()
  }

  if (!updateAvailable && !updateDownloaded) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl max-w-sm">
        {updateDownloaded ? (
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <FiRefreshCw className="text-green-400" size={20} />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">Update Ready!</div>
              <div className="text-white/60 text-sm">Version {newVersion} is ready to install</div>
            </div>
            <button
              onClick={handleRestart}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Restart
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <FiDownload className="text-blue-400" size={20} />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">Downloading Update</div>
              <div className="text-white/60 text-sm">
                Version {newVersion} - {downloadProgress}%
              </div>
              <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
