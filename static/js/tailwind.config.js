/*
 * tailwind.config.js - Theme settings for Tailwind CSS.
 *
 * CHANGE THE APP'S COLOURS HERE.
 *   brand  = main colour   (buttons, section numbers, input letters, links)
 *   accent = result colour (results, copy buttons, output letters)
 * To switch colour, paste another palette from
 * https://tailwindcss.com/docs/customizing-colors (keep the same 50-950 keys).
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        // Indigo palette
        brand: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
          500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
        },
        // Emerald palette
        accent: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
          500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      // Small animations used by the matrix cells and notifications.
      keyframes: {
        pop: { '0%': { opacity: '0', transform: 'scale(0.6)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        pop: 'pop 260ms ease-out both',
        'slide-up': 'slide-up 200ms ease-out',
      },
    },
  },
};
