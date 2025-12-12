import { forwardRef, type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary text-white',
    'hover:bg-primary-hover',
    'shadow-[0_0_20px_rgba(99,102,241,0.3)]',
    'hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]',
    'active:shadow-[0_0_15px_rgba(99,102,241,0.2)]',
    'transition-all duration-200'
  ].join(' '),
  ghost: [
    'bg-transparent text-text-main',
    'hover:bg-surface',
    'transition-colors duration-200'
  ].join(' '),
  outline: [
    'bg-transparent text-text-main',
    'border border-border',
    'hover:border-primary hover:text-primary',
    'transition-colors duration-200'
  ].join(' ')
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', children, disabled, ...props }, ref) => {
    const baseStyles = [
      'inline-flex items-center justify-center',
      'px-4 py-2',
      'text-sm font-medium',
      'rounded-md',
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
      'disabled:opacity-50 disabled:pointer-events-none'
    ].join(' ')

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, type ButtonProps, type ButtonVariant }
