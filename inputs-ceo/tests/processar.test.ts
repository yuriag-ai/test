import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { ErroProcessamento, processar, validarPedido } from '../server/processar'

/** Monta uma resposta SSE no formato da API de Messages com o texto informado. */
function respostaSSE(texto: string, stopReason = 'end_turn'): Response {
  const eventos: [string, unknown][] = [
    ['message_start', { type: 'message_start', message: { id: 'msg_teste', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } }],
    ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
    ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: texto } }],
    ['content_block_stop', { type: 'content_block_stop', index: 0 }],
    ['message_delta', { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 50 } }],
    ['message_stop', { type: 'message_stop' }],
  ]
  const corpo = eventos.map(([nome, dados]) => `event: ${nome}\ndata: ${JSON.stringify(dados)}\n\n`).join('')
  return new Response(corpo, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

function clienteFalso(resposta: () => Response) {
  const chamadas: { url: string; headers: Headers; corpo: Record<string, any> }[] = []
  const fetchFalso = async (url: RequestInfo | URL, init?: RequestInit) => {
    chamadas.push({ url: String(url), headers: new Headers(init?.headers), corpo: JSON.parse(String(init?.body)) })
    return resposta()
  }
  const cliente = new Anthropic({ apiKey: 'teste', fetch: fetchFalso as typeof fetch, maxRetries: 0 })
  return { cliente, chamadas }
}

const acao = {
  titulo: 'Levantar o giro de estoque da coleção de verão',
  descricao: 'Marina: qual o giro de estoque da coleção de verão?',
  contexto: '',
  responsaveis: ['Marina'],
  area: 'Supply & Logística',
  marca: null,
  prazo: null,
  prioridade: 'media',
  status: 'pendente',
  citacao: null,
}

describe('processar (contrato com a API do Claude)', () => {
  it('envia o pedido no formato esperado e devolve ata + ações', async () => {
    const ata = { titulo: 'Comitê', resumoExecutivo: 'Resumo.', participantes: ['Marina'], temas: [{ tema: 'Estoque', pontos: ['Giro da coleção'] }], decisoes: [], pontosDeAtencao: [] }
    const { cliente, chamadas } = clienteFalso(() => respostaSSE(JSON.stringify({ ata, acoes: [acao] })))

    const r = await processar(
      { modo: 'ata', texto: 'Marina, me traz o giro de estoque da coleção.', contexto: { data: '2026-10-22', areas: ['Supply & Logística'] } },
      cliente,
    )

    expect(r.ata?.titulo).toBe('Comitê')
    expect(r.acoes[0].responsaveis).toEqual(['Marina'])

    const { url, headers, corpo } = chamadas[0]
    expect(url).toContain('/v1/messages')
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01')
    expect(corpo.model).toBe('claude-opus-5-5')
    expect(corpo.fallbacks).toBe('default')
    expect(corpo.stream).toBe(true)
    expect(corpo.thinking).toEqual({ type: 'adaptive' })
    expect(corpo.output_config.effort).toBe('medium')
    expect(corpo.output_config.format.type).toBe('json_schema')
    const schema = corpo.output_config.format.schema
    expect(schema.required).toEqual(expect.arrayContaining(['ata', 'acoes']))
    expect(schema.additionalProperties).toBe(false)
    expect(corpo.messages[0].content).toContain('Data de referência: 2026-10-22')
    expect(corpo.messages[0].content).toContain('<material>')
  })

  it('no modo "plano" não pede ata', async () => {
    const { cliente, chamadas } = clienteFalso(() => respostaSSE(JSON.stringify({ acoes: [acao] })))
    const r = await processar({ modo: 'plano', texto: 'texto', contexto: {} }, cliente)
    expect(r.ata).toBeNull()
    expect(r.acoes).toHaveLength(1)
    expect(chamadas[0].corpo.output_config.format.schema.properties.ata).toBeUndefined()
  })

  it('traduz recusa e corte por tamanho em erros claros', async () => {
    const recusa = clienteFalso(() => respostaSSE('', 'refusal'))
    await expect(processar({ modo: 'plano', texto: 'x', contexto: {} }, recusa.cliente)).rejects.toMatchObject({ status: 422 })
    const corte = clienteFalso(() => respostaSSE('{"acoes": [', 'max_tokens'))
    await expect(processar({ modo: 'plano', texto: 'x', contexto: {} }, corte.cliente)).rejects.toBeInstanceOf(ErroProcessamento)
  })
})

describe('validarPedido', () => {
  it('rejeita texto vazio e modo desconhecido', () => {
    expect(() => validarPedido({ modo: 'ata', texto: '   ' })).toThrow('O texto está vazio.')
    expect(() => validarPedido({ modo: 'outro', texto: 'a' })).toThrow('Modo inválido.')
  })
})
