/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        papel: '#FAF8F5',
        linho: '#F1EDE6',
        borda: '#E4DED4',
        tinta: '#1C1A17',
        grafite: '#57524A',
        nevoa: '#8E877C',
        couro: { DEFAULT: '#8A5A33', claro: '#F4E9DE', escuro: '#6E4626' },
        pendente: { DEFAULT: '#A86B12', claro: '#FBF0DC' },
        andamento: { DEFAULT: '#2F5D8A', claro: '#E3ECF5' },
        concluido: { DEFAULT: '#3D7350', claro: '#E2F0E6' },
        bloqueado: { DEFAULT: '#A23B2A', claro: '#F8E3DF' },
      },
      fontFamily: {
        serif: ['"Bodoni Moda"', 'Didot', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        cartao: '0 1px 2px rgba(28,26,23,0.04), 0 2px 8px rgba(28,26,23,0.04)',
        flutuante: '0 8px 24px rgba(28,26,23,0.18)',
      },
    },
  },
  plugins: [],
}
