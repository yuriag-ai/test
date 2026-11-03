import { EM_ARTIFACT } from './ambiente'
import { adicionarNota, criarInputs, criarReuniao, db, excluirInput, type NovoInput } from './db'
import type { Reuniao } from './types'
import { normalizar } from './util'

/**
 * Carga inicial do link de teste. Os inputs vêm embutidos só na página publicada
 * (<script type="application/json" id="carga-inicial">), nunca no código-fonte:
 * o repositório é público e os inputs são do usuário.
 */

interface ItemCarga extends NovoInput {
  nota?: string
}

/** Um lote é aplicado uma única vez por navegador; se tiver `reuniao`, os inputs ficam vinculados a ela. */
interface Lote {
  id: string
  reuniao?: Partial<Reuniao>
  inputs: ItemCarga[]
  /** Correções de texto nos inputs já carregados (ex.: nome escrito errado), aplicadas uma vez. */
  correcoes?: { de: string; para: string }[]
  /** Inputs a excluir, identificados pelo título ou pela descrição, aplicado uma vez. */
  remover?: string[]
}

/** Formato antigo (um lote só) ou vários lotes, para acrescentar inputs sem repetir os já carregados. */
type Carga = Lote | { lotes: Lote[] }

interface RegistroExemplos {
  inputs: string[]
  reunioes: string[]
}

let preparando: Promise<void> | null = null

export function prepararDadosIniciais(): Promise<void> {
  if (!EM_ARTIFACT) return Promise.resolve()
  preparando ??= preparar()
  return preparando
}

function lerLotes(): Lote[] {
  const el = document.getElementById('carga-inicial')
  if (!el?.textContent) return []
  try {
    const carga = JSON.parse(el.textContent) as Carga
    const lotes = 'lotes' in carga ? carga.lotes : [carga]
    return lotes.filter((l) => l?.id && Array.isArray(l.inputs))
  } catch {
    return []
  }
}

async function preparar() {
  await removerExemplosAntigos()
  for (const lote of lerLotes()) await aplicarLote(lote)
}

async function aplicarLote(lote: Lote) {
  const chave = `carga:${lote.id}`
  if (await db.config.get(chave)) return
  await db.config.put({ chave, valor: true })
  if (lote.correcoes?.length) await corrigirTextos(lote.correcoes)
  if (lote.remover?.length) await removerInputs(lote.remover)

  // Não duplica o que a pessoa já tenha importado por conta própria
  const existentes = new Set((await db.inputs.toArray()).map((i) => normalizar(i.descricao)))
  const novos = lote.inputs.filter((i) => !existentes.has(normalizar(i.descricao)))
  if (!novos.length) return
  const reuniao = lote.reuniao ? await criarReuniao({ ...lote.reuniao, estado: 'processada' }) : null
  const criados = await criarInputs(novos.map(({ nota: _nota, ...input }) => ({ ...input, reuniaoId: reuniao?.id })))
  for (const [i, input] of criados.entries()) {
    const nota = novos[i].nota
    if (nota) await adicionarNota(input.id, nota)
  }
}

async function corrigirTextos(correcoes: { de: string; para: string }[]) {
  const trocar = (texto: string) => correcoes.reduce((t, c) => t.split(c.de).join(c.para), texto)
  await db.inputs.toCollection().modify((i) => {
    i.titulo = trocar(i.titulo)
    i.descricao = trocar(i.descricao)
    i.contexto = trocar(i.contexto)
    i.observacoes = trocar(i.observacoes)
  })
}

async function removerInputs(textos: string[]) {
  const alvos = new Set(textos.map(normalizar))
  const inputs = await db.inputs.toArray()
  for (const i of inputs) {
    if (alvos.has(normalizar(i.titulo)) || alvos.has(normalizar(i.descricao))) await excluirInput(i.id)
  }
}

/** Remove os exemplos fictícios da primeira versão do link de teste, se ainda estiverem no navegador. */
async function removerExemplosAntigos() {
  const registro = (await db.config.get('exemplos'))?.valor as RegistroExemplos | undefined
  if (!registro) return
  await db.transaction('rw', [db.inputs, db.anexos, db.reunioes, db.audio, db.pessoas, db.config], async () => {
    const exemplos = await db.inputs.bulkGet(registro.inputs)
    await db.anexos.where('inputId').anyOf(registro.inputs).delete()
    await db.inputs.bulkDelete(registro.inputs)
    await db.audio.where('reuniaoId').anyOf(registro.reunioes).delete()
    await db.reunioes.bulkDelete(registro.reunioes)
    await db.config.delete('exemplos')
    const emUso = new Set((await db.inputs.toArray()).flatMap((i) => i.responsaveis))
    const soDosExemplos = new Set(exemplos.flatMap((i) => i?.responsaveis ?? []).filter((n) => !emUso.has(n)))
    await db.pessoas.filter((p) => soDosExemplos.has(p.nome)).delete()
  })
}
