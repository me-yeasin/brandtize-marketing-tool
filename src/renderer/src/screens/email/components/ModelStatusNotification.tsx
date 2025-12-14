import { FiX, FiRefreshCw, FiAlertCircle } from 'react-icons/fi'

interface ModelStatusNotificationProps {
  currentModel: string
  attempt: number
  maxAttempts: number
  isModelSwitch: boolean
  previousModel?: string
  onClose: () => void
}

function ModelStatusNotification({
  currentModel,
  attempt,
  maxAttempts,
  isModelSwitch,
  previousModel,
  onClose
}: ModelStatusNotificationProps): React.JSX.Element {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm px-4 py-3 shadow-lg min-w-[320px] max-w-[500px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          {isModelSwitch ? (
            <FiRefreshCw className="text-amber-400 animate-spin" size={16} />
          ) : (
            <FiAlertCircle className="text-amber-400" size={16} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {isModelSwitch && previousModel ? (
            <p className="text-sm text-amber-200">
              Switching from <span className="font-medium">{previousModel}</span>
            </p>
          ) : null}

          <p className="text-sm text-text-main">
            {isModelSwitch ? 'Now trying: ' : 'Trying: '}
            <span className="font-semibold text-amber-300">{currentModel}</span>
          </p>

          {!isModelSwitch && attempt > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-text-muted">Retry attempts:</span>
              <div className="flex gap-1">
                {Array.from({ length: maxAttempts }, (_, i) => (
                  <span
                    key={i}
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      i < attempt
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-surface/50 text-text-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-md text-text-muted hover:text-text-main hover:bg-surface/50 transition-colors"
          aria-label="Close notification"
        >
          <FiX size={16} />
        </button>
      </div>
    </div>
  )
}

export { ModelStatusNotification }
