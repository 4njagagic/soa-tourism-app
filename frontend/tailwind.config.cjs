/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F8FAF9',
        surface: '#FFFFFF',
        muted: '#EEF2F1',
        border: '#DDE5E3',

        text: {
          primary: '#1F2A2E',
          secondary: '#5F6C72',
          muted: '#8A979C',
        },

        primary: {
          DEFAULT: '#2FA38A',
          hover: '#258A74',
          soft: '#D9F3EC',
        },

        secondary: {
          DEFAULT: '#F08A5D',
          hover: '#D9774A',
          soft: '#FDE6DD',
        },

        success: '#3FB950',
        warning: '#F2C14E',
        error: '#E5533D',
        info: '#3A86FF',

        like: '#FF5A5F',
        highlight: '#B8E1DD',
      },
      fontFamily: {
        sans: [
          'Roboto',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
