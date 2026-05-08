/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:       '#0E160E',
        fairway:   '#1B2F1B',
        rough:     '#243824',
        deeprough: '#161F16',
        sand:      '#C9A96E',
        sandlight: '#DFC08A',
        chalk:     '#EDE9DF',
        fog:       '#8A9E8A',
        birdie:    '#4ADE80',
        bogey:     '#F87171',
        eagle:     '#FBBF24',
        albatross: '#E879F9',
        water:     '#60A5FA',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        serif:   ['"Instrument Serif"', 'Georgia', 'serif'],
        mono:    ['"DM Mono"', 'monospace'],
        ui:      ['"Archivo Narrow"', '"Arial Narrow"', 'sans-serif'],
      },
      boxShadow: {
        card:      '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        glow:      '0 0 20px rgba(201,169,110,0.35)',
        'glow-sm': '0 0 10px rgba(201,169,110,0.2)',
        player:    '0 0 0 6px rgba(201,169,110,0.3)',
      },
      animation: {
        shimmer:      'shimmer 2s linear infinite',
        'fade-up':    'fadeUp 0.3s ease-out',
        'slide-up':   'slideUp 0.35s cubic-bezier(0.32,0.72,0,1)',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.32,0.72,0,1)',
        'pulse-gps':  'pulseGPS 2s ease-in-out infinite',
        'dist-pulse': 'distPulse 2s ease-in-out infinite',
        flip:         'flip 0.25s ease-in-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        slideDown: {
          from: { transform: 'translateY(0)' },
          to:   { transform: 'translateY(100%)' },
        },
        pulseGPS: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.7', transform: 'scale(1.1)' },
        },
        distPulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.82' },
        },
        flip: {
          '0%':   { transform: 'rotateX(0deg)' },
          '50%':  { transform: 'rotateX(-90deg)' },
          '100%': { transform: 'rotateX(0deg)' },
        },
      },
    },
  },
  plugins: [],
}
