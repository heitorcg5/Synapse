import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C5CFF',
          cyan: '#00F5D4',
          pink: '#FF4ECD',
        },
        app: {
          bg: '#0B0B0F',
          bg2: '#12121A',
          card: '#161621',
          text: '#EAEAF0',
          muted: '#9CA3AF',
          dim: '#6B7280',
          success: '#00FF9C',
          warning: '#FFB020',
          error: '#FF4D6D',
        },
      },
      fontFamily: {
        heading: ['"Orbitron"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(124, 92, 255, 0.35), 0 0 18px rgba(124, 92, 255, 0.22)',
        card: '0 14px 36px rgba(0, 0, 0, 0.38)',
      },
      backgroundImage: {
        'app-gradient':
          'radial-gradient(1200px circle at 10% -10%, rgba(124, 92, 255, 0.18), transparent 40%), radial-gradient(900px circle at 100% 0%, rgba(0, 245, 212, 0.12), transparent 45%)',
      },
    },
  },
  plugins: [],
}

export default config
