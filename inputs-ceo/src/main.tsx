import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { EM_ARTIFACT } from './lib/ambiente'

// No link de teste a página roda num quadro do claude.ai, sem endereço próprio: rotas ficam em memória.
const Roteador = EM_ARTIFACT ? MemoryRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Roteador>
      <App />
    </Roteador>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && !EM_ARTIFACT) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
