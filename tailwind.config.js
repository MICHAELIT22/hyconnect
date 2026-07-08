/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core
        primary: {
          DEFAULT: 'rgb(0, 63, 177)',
          container: 'rgb(26, 86, 219)',
          'fixed': 'rgb(219, 225, 255)',
          'fixed-dim': 'rgb(181, 196, 255)',
          'fixed-variant': 'rgb(0, 61, 171)',
          foreground: '#FFFFFF',
        },
        'on-primary': 'rgb(255, 255, 255)',
        'on-primary-container': 'rgb(212, 220, 255)',
        'inverse-primary': 'rgb(181, 196, 255)',

        secondary: {
          DEFAULT: 'rgb(76, 97, 108)',
          container: 'rgb(207, 230, 242)',
          fixed: 'rgb(207, 230, 242)',
          'fixed-dim': 'rgb(180, 202, 214)',
        },
        'on-secondary': 'rgb(255, 255, 255)',
        'on-secondary-container': 'rgb(82, 103, 114)',

        tertiary: {
          DEFAULT: 'rgb(0, 84, 76)',
          container: 'rgb(0, 110, 101)',
          fixed: 'rgb(137, 245, 231)',
          'fixed-dim': 'rgb(107, 216, 203)',
        },
        'on-tertiary': 'rgb(255, 255, 255)',
        'on-tertiary-container': 'rgb(132, 240, 226)',

        // Surfaces
        background: 'rgb(250, 248, 255)',
        'on-background': 'rgb(25, 27, 35)',
        surface: {
          DEFAULT: 'rgb(250, 248, 255)',
          dim: 'rgb(217, 217, 228)',
          bright: 'rgb(250, 248, 255)',
          variant: 'rgb(226, 225, 237)',
          'container': 'rgb(237, 237, 248)',
          'container-low': 'rgb(243, 243, 254)',
          'container-lowest': 'rgb(255, 255, 255)',
          'container-high': 'rgb(231, 231, 243)',
          'container-highest': 'rgb(226, 225, 237)',
          tint: 'rgb(19, 83, 216)',
        },
        'on-surface': {
          DEFAULT: 'rgb(25, 27, 35)',
          variant: 'rgb(67, 70, 84)',
        },
        'inverse-surface': 'rgb(46, 48, 57)',
        'inverse-on-surface': 'rgb(240, 240, 251)',

        // Utility
        outline: {
          DEFAULT: 'rgb(115, 118, 134)',
          variant: 'rgb(195, 197, 215)',
        },
        error: {
          DEFAULT: 'rgb(186, 26, 26)',
          container: 'rgb(255, 218, 214)',
        },
        'on-error': 'rgb(255, 255, 255)',
        'on-error-container': 'rgb(147, 0, 10)',
        success: {
          DEFAULT: '#2E7D32',
          container: '#C8E6C9',
        },
        'success-container': '#C8E6C9',
        warning: {
          DEFAULT: '#E65100',
          container: '#FFE0CC',
        },
        'warning-container': '#FFE0CC',
      },
      spacing: {
        'topbar-height': '44px',
        'sidebar-width': '280px',
      },
      fontSize: {
        'display-lg': ['20px', { lineHeight: '24px', fontWeight: '700' }],
        'headline-md': ['16px', { lineHeight: '20px', fontWeight: '600' }],
        'title-md': ['15px', { lineHeight: '20px', fontWeight: '600' }],
        'title-sm': ['13px', { lineHeight: '18px', fontWeight: '600' }],
        'body-lg': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'body-md': ['11px', { lineHeight: '15px', fontWeight: '400' }],
        'label-md': ['9px', { lineHeight: '12px', letterSpacing: '0.03em', fontWeight: '500' }],
        'caption': ['8px', { lineHeight: '10px', fontWeight: '400' }],
      },
      boxShadow: {
        'level-1': '0px 1px 3px rgba(0,0,0,0.10), 0px 1px 2px rgba(0,0,0,0.06)',
        'level-2': '0px 1px 2px rgba(0,0,0,0.30), 0px 2px 6px 2px rgba(0,0,0,0.15)',
        'level-3': '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px rgba(0,0,0,0.30)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
