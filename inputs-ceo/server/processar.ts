import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { BetaMessageStream } from '@anthropic-ai/sdk/lib/BetaMessageStream'
import { z } from 'zod'
import { ComAtaSchema, regrasSistema, SoAcoesSchema, textoDoPedido } from '../src/lib/prompt.js'
import type { PedidoProcessamento, ResultadoProcessamento } from '../src/lib/types.js'

const SYSTEM = regrasSistema({
  descricao: 'o escritório do CEO do Grupo Arezzo&CO (Alexandre Birman)',
  ceo: 'Alexandre',
})

const MODELO_PADRAO = 'claude-opus-5-5'
const LIMITE_TEXTO = 400_000 // ~100k tokens: cobre reuniões de várias horas
const LIMITE_ARQUIVOS = 10
const TIPOS_ARQUIVO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export function montarConteudo(pedido: PedidoProcessamento): Anthropic.Beta.BetaContentBlockParam[] {
  const blocos: Anthropic.Beta.BetaContentBlockParam[] = []
  for (const arquivo of pedido.arquivos ?? []) {
    if (arquivo.tipo === 'application/pdf') {
      blocos.push({ type: 'document', title: arquivo.nome, source: { type: 'base64', media_type: 'application/pdf', data: arquivo.dados } })
    } else {
      blocos.push({ type: 'image', source: { type: 'base64', media_type: arquivo.tipo, data: arquivo.dados } })
    }
  }
  blocos.push({ type: 'text', text: textoDoPedido(pedido) })
  return blocos
}


export class ErroProcessamento extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

export function validarPedido(corpo: unknown): PedidoProcessamento {
  const Pedido = z.object({
    modo: z.enum(['ata', 'plano', 'lista'], { error: 'Modo inválido.' }),
    texto: z.string().max(LIMITE_TEXTO, 'Texto longo demais.').default(''),
    arquivos: z
      .array(z.object({ nome: z.string(), tipo: z.enum(TIPOS_ARQUIVO, { error: 'Tipo de arquivo não suportado.' }), dados: z.string().min(1) }))
      .max(LIMITE_ARQUIVOS, `Envie no máximo ${LIMITE_ARQUIVOS} arquivos por vez.`)
      .optional(),
    tipoMaterial: z.enum(['transcricao', 'resumo', 'lista']).optional(),
    contexto: z
      .object({
        titulo: z.string().optional(),
        data: z.string().optional(),
        local: z.string().optional(),
        participantes: z.array(z.string()).optional(),
        areas: z.array(z.string()).optional(),
        marcas: z.array(z.string()).optional(),
        pessoas: z.array(z.object({ nome: z.string(), area: z.string() })).optional(),
      })
      .default({}),
  }).refine((p) => p.texto.trim() || p.arquivos?.length, { message: 'O texto está vazio.' })
  const r = Pedido.safeParse(corpo)
  if (!r.success) throw new ErroProcessamento(r.error.issues[0]?.message ?? 'Pedido inválido.', 400)
  return r.data
}

export async function processar(pedido: PedidoProcessamento, cliente?: Anthropic): Promise<ResultadoProcessamento> {
  if (!cliente && !iaConfigurada()) {
    throw new ErroProcessamento('IA não configurada: defina ANTHROPIC_API_KEY no servidor.', 503)
  }
  const client = cliente ?? new Anthropic()
  const comAta = pedido.modo === 'ata'

  const base = {
    model: process.env.CLAUDE_MODEL || MODELO_PADRAO,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
    thinking: { type: 'adaptive' as const },
    system: SYSTEM,
    messages: [{ role: 'user' as const, content: montarConteudo(pedido) }],
  }

  try {
    if (comAta) {
      return await concluir(
        client.beta.messages.stream({ ...base, output_config: { effort: 'medium', format: betaZodOutputFormat(ComAtaSchema) } }),
      )
    }
    const r = await concluir(
      client.beta.messages.stream({ ...base, output_config: { effort: 'medium', format: betaZodOutputFormat(SoAcoesSchema) } }),
    )
    return { ata: null, acoes: r.acoes, meta: r.meta }
  } catch (erro) {
    if (erro instanceof ErroProcessamento) throw erro
    if (erro instanceof Anthropic.AuthenticationError) {
      throw new ErroProcessamento('Chave da API inválida (ANTHROPIC_API_KEY).', 503)
    }
    if (erro instanceof Anthropic.RateLimitError) {
      throw new ErroProcessamento('Limite de uso da IA atingido. Tente novamente em instantes.', 429)
    }
    if (erro instanceof Anthropic.BadRequestError) {
      throw new ErroProcessamento(`Pedido recusado pela IA: ${erro.message}`, 400)
    }
    if (erro instanceof Anthropic.APIError) {
      throw new ErroProcessamento(`Falha na IA (${erro.status ?? 'rede'}). Tente novamente.`, 502)
    }
    throw erro
  }
}

/** Aguarda o fim do stream e devolve o JSON já validado, traduzindo recusas e cortes em erros claros. */
async function concluir<T>(stream: BetaMessageStream<T>): Promise<T> {
  let parada: string | null = null
  stream.on('streamEvent', (evento) => {
    if (evento.type === 'message_delta') parada = evento.delta.stop_reason ?? null
  })
  try {
    const msg = await stream.finalMessage()
    verificarParada(msg.stop_reason)
    if (msg.parsed_output) return msg.parsed_output
  } catch (erro) {
    if (erro instanceof Anthropic.APIError || erro instanceof ErroProcessamento) throw erro
    // Falha ao interpretar o JSON: normalmente porque a resposta foi recusada ou cortada.
    verificarParada(parada)
  }
  throw new ErroProcessamento('A IA não retornou um resultado válido. Tente novamente.', 502)
}

function verificarParada(stop: string | null) {
  if (stop === 'refusal') {
    throw new ErroProcessamento('A IA recusou processar este conteúdo.', 422)
  }
  if (stop === 'max_tokens') {
    throw new ErroProcessamento('O conteúdo é longo demais para uma única ata. Divida a transcrição.', 413)
  }
}
