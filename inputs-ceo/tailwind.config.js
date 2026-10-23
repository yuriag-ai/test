/** @type {import('tailwindcss').Config} */
const token = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Cores definidas como variáveis em src/index.css (tema claro e escuro)
      colors: {
        papel: token('papel'),
        superficie: token('superficie'),
        linho: token('linho'),
        borda: token('borda'),
        tinta: token('tinta'),
        grafite: token('grafite'),
        nevoa: token('nevoa'),
        couro: { DEFAULT: token('couro'), claro: token('couro-claro'), escuro: token('couro-escuro') },
        pendente: { DEFAULT: token('pendente'), claro: token('pendente-claro') },
        andamento: { DEFAULT: token('andamento'), claro: token('andamento-claro') },
        concluido: { DEFAULT: token('concluido'), claro: token('concluido-claro') },
        bloqueado: { DEFAULT: token('bloqueado'), claro: token('bloqueado-claro') },
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
