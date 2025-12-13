import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        surface: '#1e293b',
        border: '#334155',
        primary: '#6366f1',
        'primary-hover': '#4f46e5',
        'text-main': '#f8fafc',
        'text-muted': '#94a3b8'
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif'
        ]
      },
      borderRadius: {
        DEFAULT: '0.5rem'
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#f8fafc',
            maxWidth: 'none',
            a: {
              color: '#6366f1',
              '&:hover': {
                color: '#4f46e5'
              }
            },
            strong: {
              color: '#f8fafc'
            },
            h1: {
              color: '#f8fafc'
            },
            h2: {
              color: '#f8fafc'
            },
            h3: {
              color: '#f8fafc'
            },
            h4: {
              color: '#f8fafc'
            },
            code: {
              color: '#f8fafc',
              backgroundColor: '#334155',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontWeight: '400'
            },
            'code::before': {
              content: 'none'
            },
            'code::after': {
              content: 'none'
            },
            pre: {
              backgroundColor: '#1e293b',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #334155'
            },
            blockquote: {
              color: '#94a3b8',
              borderLeftColor: '#6366f1'
            },
            hr: {
              borderColor: '#334155'
            },
            'ul > li::marker': {
              color: '#94a3b8'
            },
            'ol > li::marker': {
              color: '#94a3b8'
            },
            th: {
              color: '#f8fafc'
            },
            td: {
              color: '#f8fafc'
            },
            thead: {
              borderBottomColor: '#334155'
            },
            'tbody tr': {
              borderBottomColor: '#334155'
            }
          }
        }
      }
    }
  },
  plugins: [typography]
}
