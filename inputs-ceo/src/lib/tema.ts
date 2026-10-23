export type Tema = 'claro' | 'escuro' | 'auto'

const CHAVE = 'tema'

export function lerTema(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo === 'escuro' || salvo === 'auto' ? salvo : 'claro'
  } catch {
    return 'claro'
  }
}

/** Aplica o tema na página (atributo data-tema, usado pelo CSS) e guarda a escolha neste navegador. */
export function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // armazenamento indisponível: vale só nesta visita
  }
}
