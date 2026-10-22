import type { PedidoProcessamento, ResultadoProcessamento } from './types'

export async function statusIA(): Promise<boolean> {
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
  return { ata: corpo.ata ?? null, acoes: corpo.acoes ?? [] }
}
