/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'laranja-energia': '#FF6B35',
        'laranja-hover': '#E55A2B',
        'navy-confianca': '#1A1A2E',
        'navy-light': '#2D2D44',
        'verde-progresso': '#16DB93',
        'verde-hover': '#12B577',
        'cinza-claro': '#F7F7F7',
        'cinza-medio': '#E0E0E0',
        'texto-principal': '#2D2D2D',
        'texto-secundario': '#666666',
        'bg-light': '#FFFFFF',
        'bg-section': '#FFF9F7',
        'bg-dark': '#1A1A2E',
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'system-ui', 'sans-serif'],
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
    },
  },
  plugins: [],
}
