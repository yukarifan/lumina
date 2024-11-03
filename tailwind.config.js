/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(-10px) translateX(10px) translateY(-50%)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0) translateX(0) translateY(-50%)'
          },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out'
      }
    }
  },
  plugins: [],
} 