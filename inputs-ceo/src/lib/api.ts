import { EM_ARTIFACT, usarRecurso } from './ambiente'
import { formatoJson, regrasSistema, RespostaTolerante, textoDoPedido } from './prompt'
import type { ArquivoIA, PedidoProcessamento, ResultadoProcessamento } from './types'

export async function statusIA(): Promise<boolean> {
  if (EM_ARTIFACT) return (await usarRecurso('sample')) !== null
  try {
    const r = await fetch('/api/status')
    if (!r.ok) return false
    const corpo = (await r.json()) as { ia?: boolean }
    return Boolean(corpo.ia)
  } catch {
    return false
  }
}

export async function processarComIA(pedido: PedidoProcessamento): Promise<ResultadoProcessamento> {
  if (EM_ARTIFACT) return processarNoClaudeAi(pedido)
  let r: Response
  try {
    r = await fetch('/api/processar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pedido),
    })
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.')
  }
  const corpo = (await r.json().catch(() => ({}))) as Partial<ResultadoProcessamento> & { erro?: string }
  if (!r.ok) throw new Error(corpo.erro || `Falha ao processar (${r.status}).`)
  return { ata: corpo.ata ?? null, acoes: corpo.acoes ?? [], meta: corpo.meta ?? null }
}

// ---------- Link de teste: IA pelo recurso `sample` do claude.ai ----------

interface Sample {
  json(entrada: string, opcoes?: { modelTier?: 'quick' | 'default' | 'complex'; images?: Blob[] }): Promise<unknown>
  limits(): Promise<{ maxPromptBytes: number; images?: { maxCount: number } }>
}

const MENSAGENS_SAMPLE: Record<string, string> = {
  not_granted: 'Para interpretar com IA, autorize o uso do Claude nesta página.',
  sampling_disabled: 'O Claude não está disponível para esta conta.',
  rate_limited: 'Limite de uso do Claude atingido. Tente de novo em alguns minutos.',
  session_expired: 'Sua sessão no claude.ai expirou. Entre de novo e tente outra vez.',
  prompt_too_large: 'O material é grande demais para uma vez só. Divida em partes.',
  images_unavailable: 'Esta visualização não envia fotos para a IA. Cole o texto ou envie um arquivo.',
  image_rejected: 'Uma das fotos não pôde ser lida. Tente outra imagem (JPG ou PNG).',
  refused: 'A IA recusou processar este conteúdo.',
  invalid_json: 'A IA respondeu num formato inesperado. Tente de novo.',
  empty_completion: 'A IA não devolveu nada. Tente de novo ou envie menos conteúdo.',
}

function paraBlob(arquivo: ArquivoIA): Blob {
  const binario = atob(arquivo.dados)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Blob([bytes], { type: arquivo.tipo })
}

async function processarNoClaudeAi(pedido: PedidoProcessamento): Promise<ResultadoProcessamento> {
  const sample = await usarRecurso<Sample>('sample')
  if (!sample) throw new Error('A IA não está disponível nesta visualização. Abra o link no claude.ai, com sua conta.')
  const imagens = (pedido.arquivos ?? []).filter((a) => a.tipo.startsWith('image/')).map(paraBlob)
  const comAta = pedido.modo === 'ata'
  const entrada = [
    regrasSistema({ descricao: 'o escritório do CEO de uma empresa de moda e varejo', ceo: 'CEO' }),
    textoDoPedido(pedido),
    formatoJson(comAta),
  ].join('\n\n')

  const limites = await sample.limits().catch(() => null)
  if (limites && new Blob([entrada]).size > limites.maxPromptBytes) throw new Error(MENSAGENS_SAMPLE.prompt_too_large)
  if (imagens.length && limites?.images && imagens.length > limites.images.maxCount) {
    throw new Error(`Envie no máximo ${limites.images.maxCount} fotos por vez.`)
  }

  let bruto: unknown
  try {
    bruto = await sample.json(entrada, { modelTier: 'default', ...(imagens.length ? { images: imagens } : {}) })
  } catch (erro) {
    const codigo = (erro as { code?: string }).code ?? ''
    throw new Error(MENSAGENS_SAMPLE[codigo] ?? 'Falha ao falar com a IA. Tente de novo.')
  }
  const r = RespostaTolerante.safeParse(bruto)
  if (!r.success) throw new Error(MENSAGENS_SAMPLE.invalid_json)
  return { ata: comAta ? r.data.ata : null, acoes: r.data.acoes, meta: r.data.meta }
}
