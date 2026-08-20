/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '420px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
      fontFamily: {
        sans: ['"Poppins"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
        mono: ['"Poppins"', 'monospace'],
      },
      colors: {
        // Design Guide Palette
        primary: {
          DEFAULT: '#E86A5B',
          50: '#FDF5F4',
          100: '#FBE9E7',
          200: '#F6D2CE',
          300: '#F3A08F', // Accent
          400: '#EE7E6F',
          500: '#E86A5B', // Primary
          600: '#C94F43', // Primary Dark
          700: '#A73D33',
          800: '#842C24',
          900: '#621E18',
        },
        // Alias brand to primary for backward-compatibility with UI components
        brand: {
          DEFAULT: '#E86A5B',
          50: '#FDF5F4',
          100: '#FBE9E7',
          200: '#F6D2CE',
          300: '#F3A08F',
          400: '#EE7E6F',
          500: '#E86A5B',
          600: '#C94F43',
          700: '#A73D33',
          800: '#842C24',
          900: '#621E18',
        },
        secondary: {
          DEFAULT: '#D9A441',
          50: '#FBF7EE',
          100: '#F7EFDB',
          200: '#ECDCB4',
          300: '#E2CA8D',
          400: '#DDB665',
          500: '#D9A441', // Secondary Gold
          600: '#B8842E',
          700: '#8F6420',
          800: '#664514',
          900: '#3D280B',
        },
        accent: {
          DEFAULT: '#F3A08F',
          light: '#FCECE9',
        },
        surface: {
          bg: '#FAF9F7',
          card: '#FFFFFF',
          border: '#E8E5E2',
        },
        neutral: {
          primary: '#1F1F1F',
          secondary: '#6B6B6B',
          border: '#E8E5E2',
          bg: '#FAF9F7',
        },
        status: {
          success: '#3FA66B',
          warning: '#D99A2B',
          error: '#D9534F',
        },
        // Mapped neutrals for legacy dark tokens so cards and panels look beautiful & crisp
        obsidian: {
          950: '#1F1F1F',
          900: '#2A2A2A',
          850: '#333333',
          800: '#404040',
          750: '#525252',
          700: '#6B6B6B',
          600: '#8E8E8E',
        },
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(31, 31, 31, 0.05), 0 2px 6px -1px rgba(31, 31, 31, 0.03)',
        'card-hover': '0 12px 30px -4px rgba(232, 106, 91, 0.12), 0 4px 12px -2px rgba(31, 31, 31, 0.06)',
        'button': '0 4px 14px 0 rgba(232, 106, 91, 0.35)',
        'button-hover': '0 6px 20px rgba(232, 106, 91, 0.45)',
        'gold-button': '0 4px 14px 0 rgba(217, 164, 65, 0.35)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
