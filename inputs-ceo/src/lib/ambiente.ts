/**
 * Versão publicada como página do claude.ai (link de teste): sem servidor e sem microfone;
 * a IA usa o recurso `sample` (conta de quem abre) e os arquivos saem pelo recurso `downloads`.
 */
export const EM_ARTIFACT = import.meta.env.VITE_ALVO === 'artifact'

/** O link de teste usa rótulos neutros; a versão instalada mostra os nomes reais. */
export const EMPRESA = EM_ARTIFACT ? '' : 'Arezzo&CO'
export const CEO = EM_ARTIFACT ? { nome: 'o CEO', de: 'do CEO' } : { nome: 'o Alexandre', de: 'do Alexandre' }

export const MSG_SEM_IA = EM_ARTIFACT
  ? 'A IA não está disponível nesta visualização. Abra o link no claude.ai, com sua conta.'
  : 'A IA não está configurada no servidor (ANTHROPIC_API_KEY).'

interface RuntimeClaude {
  use(nome: string): Promise<unknown>
}

/** Recurso da página do claude.ai, ou null quando esta visualização não oferece. */
export async function usarRecurso<T>(nome: string): Promise<T | null> {
  const runtime = (window as unknown as { claude?: RuntimeClaude }).claude
  if (!runtime?.use) return null
  try {
    return ((await runtime.use(nome)) as T | null) ?? null
  } catch {
    return null
  }
}
