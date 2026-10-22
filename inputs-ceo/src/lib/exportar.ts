import { db } from './db'
import { ROTULO_ORIGEM, ROTULO_PRIORIDADE, ROTULO_STATUS } from './rotulos'
import type { AtaExecutiva, Input, Reuniao } from './types'
import { formatarData, hojeISO } from './util'

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function celula(valor: string | number): string {
  const s = String(valor ?? '')
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV com ";" e BOM — abre direto no Excel em português. */
export function exportarCSV(inputs: Input[]) {
  const cabecalho = [
    'Nº', 'Título', 'Descrição', 'Contexto', 'Origem', 'Local', 'Data do input', 'Área', 'Marca',
    'Responsáveis', 'Prazo', 'Status', 'Prioridade', 'Observações', 'Última atualização',
  ]
  const linhas = inputs.map((i) => [
    i.numero, i.titulo, i.descricao, i.contexto, ROTULO_ORIGEM[i.origem], i.local, i.dataInput, i.area, i.marca,
    i.responsaveis.join(', '), i.prazo, ROTULO_STATUS[i.status], ROTULO_PRIORIDADE[i.prioridade],
    [i.observacoes, ...i.atualizacoes.filter((a) => a.tipo === 'nota').map((a) => a.texto)].filter(Boolean).join(' | '),
    i.atualizadoEm.slice(0, 10),
  ])
  const csv = [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n')
  baixar(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `inputs-ceo-${hojeISO()}.csv`)
}

async function blobParaDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsDataURL(blob)
  })
}

/** Backup completo (inclui anexos; não inclui áudio bruto das gravações). */
export async function exportarBackup() {
  const [inputs, reunioes, pessoas, config, anexos] = await Promise.all([
    db.inputs.toArray(),
    db.reunioes.toArray(),
    db.pessoas.toArray(),
    db.config.toArray(),
    db.anexos.toArray(),
  ])
  const anexosSerializados = await Promise.all(
    anexos.map(async ({ blob, ...resto }) => ({ ...resto, dados: await blobParaDataURL(blob) })),
  )
  const conteudo = JSON.stringify({ versao: 1, geradoEm: new Date().toISOString(), inputs, reunioes, pessoas, config, anexos: anexosSerializados })
  baixar(new Blob([conteudo], { type: 'application/json' }), `backup-inputs-ceo-${hojeISO()}.json`)
}

export async function restaurarBackup(arquivo: File) {
  const dados = JSON.parse(await arquivo.text())
  if (dados?.versao !== 1) throw new Error('Arquivo de backup não reconhecido.')
  const anexos = await Promise.all(
    (dados.anexos ?? []).map(async ({ dados: url, ...resto }: { dados: string }) => ({
      ...resto,
      blob: await (await fetch(url)).blob(),
    })),
  )
  await db.transaction('rw', [db.inputs, db.reunioes, db.pessoas, db.config, db.anexos], async () => {
    await db.inputs.bulkPut(dados.inputs ?? [])
    await db.reunioes.bulkPut(dados.reunioes ?? [])
    await db.pessoas.bulkPut(dados.pessoas ?? [])
    await db.config.bulkPut(dados.config ?? [])
    await db.anexos.bulkPut(anexos)
  })
}

/** Texto pronto para WhatsApp/e-mail com as pendências de uma pessoa. */
export function textoPendencias(nome: string, inputs: Input[]): string {
  const abertos = inputs.filter((i) => i.status !== 'concluido')
  const linhas = abertos.map((i) => {
    const prazo = i.prazo ? ` (prazo ${formatarData(i.prazo)})` : ''
    return `• #${i.numero} ${i.titulo}${prazo} — ${ROTULO_STATUS[i.status]}`
  })
  return `Olá, ${nome.split(' ')[0]}! Seguem os pontos do Alexandre com você:\n\n${linhas.join('\n')}\n\nConsegue me atualizar o status?`
}

export function textoAta(reuniao: Reuniao, ata: AtaExecutiva, acoes: Input[]): string {
  const partes: string[] = []
  partes.push(`ATA EXECUTIVA — ${ata.titulo}`)
  partes.push(`${formatarData(reuniao.data, true)}${reuniao.local ? ` · ${reuniao.local}` : ''}`)
  if (ata.participantes.length) partes.push(`Participantes: ${ata.participantes.join(', ')}`)
  partes.push('', 'RESUMO', ata.resumoExecutivo)
  for (const tema of ata.temas) {
    partes.push('', tema.tema.toUpperCase(), ...tema.pontos.map((p) => `• ${p}`))
  }
  if (ata.decisoes.length) partes.push('', 'DECISÕES', ...ata.decisoes.map((d) => `• ${d}`))
  if (ata.pontosDeAtencao.length) partes.push('', 'PONTOS DE ATENÇÃO', ...ata.pontosDeAtencao.map((d) => `• ${d}`))
  if (acoes.length) {
    partes.push('', 'PLANO DE AÇÃO')
    for (const a of acoes) {
      const resp = a.responsaveis.length ? a.responsaveis.join(', ') : 'a definir'
      partes.push(`• ${a.titulo} — ${resp}${a.prazo ? ` — até ${formatarData(a.prazo)}` : ''}`)
    }
  }
  return partes.join('\n')
}

export async function compartilharTexto(titulo: string, texto: string): Promise<'compartilhado' | 'copiado'> {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto })
      return 'compartilhado'
    } catch (erro) {
      if ((erro as DOMException).name === 'AbortError') return 'compartilhado'
    }
  }
  await navigator.clipboard.writeText(texto)
  return 'copiado'
}
