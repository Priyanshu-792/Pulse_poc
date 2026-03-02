/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pulse: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulse_ring: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':        { transform: 'scale(1.15)', opacity: '0.7' },
        },
        waveform: {
          '0%, 100%': { height: '4px' },
          '50%':       { height: '20px' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulse_ring: 'pulse_ring 1.5s ease-in-out infinite',
        waveform:   'waveform 0.8s ease-in-out infinite',
        fadeIn:     'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
