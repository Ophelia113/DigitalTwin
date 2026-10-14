/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: '#080c14',
          surface: '#0f172a',
          panel: '#131d31',
          panelBorder: '#1e293b',
          subtle: '#334155',
          accent: '#06b6d4',
          accentGlow: 'rgba(6, 182, 212, 0.25)',
          warning: '#f59e0b',
          warningGlow: 'rgba(245, 158, 11, 0.25)',
          danger: '#ef4444',
          dangerGlow: 'rgba(239, 68, 68, 0.3)',
          success: '#10b981',
          successGlow: 'rgba(16, 185, 129, 0.25)',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'conveyor-stripes': 'conveyor 1s linear infinite',
      },
      keyframes: {
        conveyor: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        }
      }
    },
  },
  plugins: [],
}
