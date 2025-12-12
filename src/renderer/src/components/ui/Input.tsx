import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-main">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full px-3 py-2',
            'bg-surface text-text-main placeholder:text-text-muted',
            'border border-border rounded-md',
            'focus:outline-none focus:border-primary',
            'focus:ring-2 focus:ring-primary/30',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : '',
            className
          ].join(' ')}
          {...props}
        />
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, type InputProps }
