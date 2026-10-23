/** @type {import('tailwindcss').Config} */
const token = (nome) => `rgb(var(--${nome}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Cores definidas como variáveis em src/index.css (padrão Arezzo&CO, tema claro e escuro)
      colors: {
        papel: token('papel'),
        superficie: token('superficie'),
        linho: token('linho'),
        borda: token('borda'),
        regua: token('regua'),
        tinta: token('tinta'),
        grafite: token('grafite'),
        nevoa: token('nevoa'),
        cinza: token('cinza'),
        perigo: token('perigo'),
        aqua: { DEFAULT: token('aqua'), claro: token('aqua-claro'), medio: token('aqua-medio') },
        rose: { DEFAULT: token('rose'), claro: token('rose-claro') },
        oliva: { DEFAULT: token('oliva'), claro: token('oliva-claro') },
        azul: { DEFAULT: token('azul'), claro: token('azul-claro') },
        bom: { DEFAULT: token('bom'), claro: token('bom-claro') },
        neutro: { DEFAULT: token('neutro'), claro: token('neutro-claro') },
        ruim: { DEFAULT: token('ruim'), claro: token('ruim-claro') },
        pendente: { DEFAULT: token('pendente'), claro: token('pendente-claro') },
        andamento: { DEFAULT: token('andamento'), claro: token('andamento-claro') },
        concluido: { DEFAULT: token('concluido'), claro: token('concluido-claro') },
        bloqueado: { DEFAULT: token('bloqueado'), claro: token('bloqueado-claro') },
      },
      fontFamily: {
        // Gotham (fonte do padrão) não é aberta: Montserrat é a alternativa geométrica mais próxima
        sans: ['Montserrat', 'Gotham', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        flutuante: '0 6px 20px rgba(0,0,0,0.14)',
      },
    },
  },
  plugins: [],
}
