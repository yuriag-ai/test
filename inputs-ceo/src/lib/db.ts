import Dexie, { type EntityTable } from 'dexie'
import type { AcaoProposta, Anexo, AudioChunk, Config, Input, Origem, Pessoa, Reuniao, Status } from './types'
import { AREAS_PADRAO, MARCAS_PADRAO, ROTULO_STATUS } from './rotulos'
import { agoraISO, hojeISO, normalizar, novoId, unicos } from './util'

class BancoInputs extends Dexie {
  inputs!: EntityTable<Input, 'id'>
  anexos!: EntityTable<Anexo, 'id'>
  reunioes!: EntityTable<Reuniao, 'id'>
  audio!: EntityTable<AudioChunk, 'id'>
  pessoas!: EntityTable<Pessoa, 'id'>
  config!: EntityTable<Config, 'chave'>

  constructor() {
    super('inputs-ceo')
    this.version(1).stores({
      inputs: 'id, numero, status, area, marca, prazo, dataInput, reuniaoId, *responsaveis, atualizadoEm',
      anexos: 'id, inputId',
      reunioes: 'id, data, estado, atualizadoEm',
      audio: '++id, reuniaoId, [reuniaoId+ordem]',
      pessoas: 'id, nome',
      config: 'chave',
    })
  }
}

export const db = new BancoInputs()

// ---------- Configurações (listas editáveis) ----------

export async function lerLista(chave: 'areas' | 'marcas'): Promise<string[]> {
  const item = await db.config.get(chave)
  if (Array.isArray(item?.valor)) return item.valor as string[]
  return chave === 'areas' ? AREAS_PADRAO : MARCAS_PADRAO
}

export async function salvarLista(chave: 'areas' | 'marcas', valores: string[]) {
  await db.config.put({ chave, valor: unicos(valores) })
}

// ---------- Pessoas ----------

/** Garante que cada nome exista no cadastro de pessoas (para autocompletar). */
export async function registrarPessoas(nomes: string[], area = '') {
  if (!nomes.length) return
  const existentes = await db.pessoas.toArray()
  const chaves = new Set(existentes.map((p) => normalizar(p.nome)))
  const novas = unicos(nomes)
    .filter((n) => !chaves.has(normalizar(n)))
    .map((nome) => ({ id: novoId(), nome, area }))
  if (novas.length) await db.pessoas.bulkAdd(novas)
}

// ---------- Inputs ----------

async function proximoNumero(): Promise<number> {
  const ultimo = await db.inputs.orderBy('numero').last()
  return (ultimo?.numero ?? 0) + 1
}

export type NovoInput = Partial<Omit<Input, 'id' | 'numero' | 'criadoEm' | 'atualizadoEm'>> & {
  descricao: string
}

function montarInput(dados: NovoInput, numero: number): Input {
  const agora = agoraISO()
  const descricao = dados.descricao.trim()
  return {
    id: novoId(),
    numero,
    titulo: (dados.titulo ?? '').trim() || descricao.split('\n')[0].slice(0, 120),
    descricao,
    contexto: dados.contexto ?? '',
    origem: dados.origem ?? 'agenda',
    local: dados.local ?? '',
    dataInput: dados.dataInput || hojeISO(),
    area: dados.area ?? '',
    marca: dados.marca ?? '',
    responsaveis: unicos(dados.responsaveis ?? []),
    prazo: dados.prazo ?? '',
    status: dados.status ?? 'pendente',
    prioridade: dados.prioridade ?? 'media',
    observacoes: dados.observacoes ?? '',
    atualizacoes: dados.atualizacoes ?? [{ id: novoId(), data: agora, texto: 'Input registrado', tipo: 'sistema' }],
    reuniaoId: dados.reuniaoId,
    citacao: dados.citacao,
    criadoEm: agora,
    atualizadoEm: agora,
  }
}

export async function criarInputs(lista: NovoInput[]): Promise<Input[]> {
  return db.transaction('rw', db.inputs, db.pessoas, async () => {
    let numero = await proximoNumero()
    const novos = lista.map((dados) => montarInput(dados, numero++))
    await db.inputs.bulkAdd(novos)
    await registrarPessoas(novos.flatMap((i) => i.responsaveis))
    return novos
  })
}

export async function criarInput(dados: NovoInput): Promise<Input> {
  const [novo] = await criarInputs([dados])
  return novo
}

export async function atualizarInput(id: string, mudancas: Partial<Input>) {
  await db.transaction('rw', db.inputs, db.pessoas, async () => {
    const atual = await db.inputs.get(id)
    if (!atual) return
    const agora = agoraISO()
    const atualizacoes = [...atual.atualizacoes]
    if (mudancas.status && mudancas.status !== atual.status) {
      atualizacoes.push({
        id: novoId(),
        data: agora,
        texto: `Status: ${ROTULO_STATUS[atual.status]} → ${ROTULO_STATUS[mudancas.status]}`,
        tipo: 'status',
      })
    }
    await db.inputs.update(id, { ...mudancas, atualizacoes, atualizadoEm: agora })
    if (mudancas.responsaveis) await registrarPessoas(mudancas.responsaveis)
  })
}

export async function mudarStatus(id: string, status: Status) {
  await atualizarInput(id, { status })
}

export async function adicionarNota(id: string, texto: string) {
  const atual = await db.inputs.get(id)
  if (!atual || !texto.trim()) return
  const agora = agoraISO()
  await db.inputs.update(id, {
    atualizacoes: [...atual.atualizacoes, { id: novoId(), data: agora, texto: texto.trim(), tipo: 'nota' }],
    atualizadoEm: agora,
  })
}

export async function excluirInput(id: string) {
  await db.transaction('rw', db.inputs, db.anexos, async () => {
    await db.anexos.where('inputId').equals(id).delete()
    await db.inputs.delete(id)
  })
}

// ---------- Anexos ----------

export async function adicionarAnexos(inputId: string, arquivos: File[]) {
  const agora = agoraISO()
  await db.anexos.bulkAdd(
    arquivos.map((f) => ({
      id: novoId(),
      inputId,
      nome: f.name,
      tipo: f.type || 'application/octet-stream',
      tamanho: f.size,
      blob: f,
      criadoEm: agora,
    })),
  )
  await db.inputs.update(inputId, { atualizadoEm: agora })
}

// ---------- Reuniões / captura ----------

export async function criarReuniao(dados: Partial<Reuniao>): Promise<Reuniao> {
  const agora = agoraISO()
  const reuniao: Reuniao = {
    id: novoId(),
    titulo: '',
    data: hojeISO(),
    hora: '',
    local: '',
    origem: 'reuniao',
    participantes: [],
    transcricao: '',
    duracaoSeg: 0,
    estado: 'rascunho',
    criadoEm: agora,
    atualizadoEm: agora,
    ...dados,
  }
  await db.reunioes.add(reuniao)
  return reuniao
}

export async function atualizarReuniao(id: string, mudancas: Partial<Reuniao>) {
  await db.reunioes.update(id, { ...mudancas, atualizadoEm: agoraISO() })
}

export async function salvarTrechoAudio(reuniaoId: string, ordem: number, blob: Blob) {
  await db.audio.add({ reuniaoId, ordem, blob })
}

export async function montarAudio(reuniaoId: string, tipo?: string): Promise<Blob | null> {
  const partes = await db.audio.where('[reuniaoId+ordem]').between([reuniaoId, Dexie.minKey], [reuniaoId, Dexie.maxKey]).toArray()
  if (!partes.length) return null
  return new Blob(
    partes.map((p) => p.blob),
    { type: tipo || partes[0].blob.type || 'audio/webm' },
  )
}

export async function excluirReuniao(id: string, manterTarefas = true) {
  await db.transaction('rw', db.reunioes, db.audio, db.inputs, async () => {
    await db.audio.where('reuniaoId').equals(id).delete()
    if (manterTarefas) {
      await db.inputs
        .where('reuniaoId')
        .equals(id)
        .modify((i) => {
          delete i.reuniaoId
        })
    }
    await db.reunioes.delete(id)
  })
}

/** Converte ações aprovadas na revisão em Inputs ligados à reunião. */
export async function criarInputsDeAcoes(
  acoes: AcaoProposta[],
  origem: { reuniaoId?: string; data: string; local: string; origem: Origem },
) {
  return criarInputs(
    acoes.map((a) => ({
      titulo: a.titulo,
      descricao: a.descricao,
      contexto: a.contexto,
      responsaveis: a.responsaveis,
      area: a.area ?? '',
      marca: a.marca ?? '',
      prazo: a.prazo ?? '',
      prioridade: a.prioridade,
      status: a.status,
      citacao: a.citacao ?? undefined,
      reuniaoId: origem.reuniaoId,
      dataInput: origem.data,
      local: origem.local,
      origem: origem.origem,
    })),
  )
}

export async function apagarTudo() {
  await Promise.all([
    db.inputs.clear(),
    db.anexos.clear(),
    db.reunioes.clear(),
    db.audio.clear(),
    db.pessoas.clear(),
  ])
}
