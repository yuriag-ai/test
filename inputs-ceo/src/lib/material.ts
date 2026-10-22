import { dividirItens, interpretarItem, type OpcoesImportacao } from './importador'
import type { AcaoProposta, TipoMaterial } from './types'
import { normalizar } from './util'

/**
 * Leitura de materiais vindos de outras ferramentas (gravadores, Teams, Zoom, Plaud, Otter,
 * resumos prontos, listas de tarefas) e interpretação local, sem IA.
 */

export const ROTULO_MATERIAL: Record<TipoMaterial, string> = {
  transcricao: 'Transcrição',
  resumo: 'Resumo / ata',
  lista: 'Lista de tarefas',
}

const RE_MARCADOR = /^\s*(?:\d{1,3}\s*[.)\-–]|[-•*▪●]|\[[ xX]\]|[☐☑✅✔✓])\s+/u
const RE_TEMPO = /(?:^|[\s[(])\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?(?=$|[\s\])])/
const RE_FALANTE = /^\s*(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?(?:[A-ZÀ-Ý][\wÀ-ÿ.]*(?:\s+[A-ZÀ-Ý\d][\wÀ-ÿ.]*){0,3}|(?:speaker|falante|orador|participante)\s*\d+)\s*(?:\(?\d{1,2}:\d{2}(?::\d{2})?\)?)?\s*:\s+\S/iu
const RE_TITULO_ACOES =
  /^(?:#+\s*)?(?:\*\*)?\s*(pr[oó]ximos passos|a[cç][oõ]es|itens de a[cç][aã]o|action items?|tarefas|to-?dos?|encaminhamentos|pend[eê]ncias|follow[- ]?ups?|next steps|plano de a[cç][aã]o|combinados|responsabilidades)\b/i
const RE_TITULO = /^(?:#+\s+.+|\*\*[^*]+\*\*:?|[A-ZÀ-Ýa-zà-ÿ][^.!?]{0,60}:)$/u

/** Converte legendas SRT/VTT (Teams, Zoom, Meet) em linhas "Nome: fala". */
export function limparLegenda(texto: string): string {
  const linhas = texto.replace(/\r/g, '').split('\n')
  const saida: { nome: string; fala: string }[] = []
  let pularBloco = false
  for (const bruta of linhas) {
    const linha = bruta.trim()
    if (!linha) {
      pularBloco = false
      continue
    }
    if (pularBloco || /^WEBVTT/i.test(linha) || /^\d+$/.test(linha) || linha.includes('-->')) continue
    if (/^(NOTE|STYLE|REGION)\b/.test(linha)) {
      pularBloco = true
      continue
    }
    let nome = ''
    let fala = linha
    const voz = fala.match(/^<v(?:\.[^\s>]+)?\s+([^>]+)>/)
    if (voz) {
      nome = voz[1].trim()
      fala = fala.slice(voz[0].length)
    }
    fala = fala.replace(/<[^>]+>/g, '').trim()
    if (!nome) {
      const prefixo = fala.match(/^([A-ZÀ-Ý][\wÀ-ÿ.]*(?:\s+[A-ZÀ-Ý][\wÀ-ÿ.]*){0,3}):\s+(.+)$/u)
      if (prefixo) {
        nome = prefixo[1]
        fala = prefixo[2]
      }
    }
    if (!fala) continue
    const ultimo = saida[saida.length - 1]
    if (ultimo && (ultimo.nome === nome || (!nome && ultimo.nome === ''))) {
      if (!ultimo.fala.endsWith(fala)) ultimo.fala += ` ${fala}`
    } else saida.push({ nome, fala })
  }
  return saida.map((s) => (s.nome ? `${s.nome}: ${s.fala}` : s.fala)).join('\n')
}

/** Identifica se o texto é transcrição, resumo/ata ou lista de tarefas. */
export function detectarTipo(texto: string): TipoMaterial {
  const linhas = texto
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (!linhas.length) return 'lista'
  if (/\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}\s*-->/.test(texto)) return 'transcricao'

  const palavras = texto.split(/\s+/).filter(Boolean).length
  const proporcao = (re: RegExp) => linhas.filter((l) => re.test(l)).length / linhas.length
  const marcadores = proporcao(RE_MARCADOR)
  const tempos = proporcao(RE_TEMPO)
  const falantes = proporcao(RE_FALANTE)
  const titulos = linhas.filter((l) => RE_TITULO.test(l) || RE_TITULO_ACOES.test(l)).length
  const mediaLinha = palavras / linhas.length

  if (tempos >= 0.2 && linhas.length >= 6) return 'transcricao'
  if (falantes >= 0.5 && marcadores < 0.3 && (palavras > 250 || mediaLinha > 14)) return 'transcricao'
  if (marcadores >= 0.6 && titulos <= 1) return 'lista'
  if (titulos >= 2 || /\b(resumo|summary|pauta|decis[oõ]es|participantes)\b/i.test(linhas.slice(0, 8).join(' '))) return 'resumo'
  if (palavras <= 400 && linhas.length <= 40 && mediaLinha < 30) return 'lista'
  return palavras > 600 && mediaLinha < 40 ? 'transcricao' : 'resumo'
}

/**
 * Extrai os itens das seções de ações de um resumo ("Próximos passos", "Action items",
 * "Encaminhamentos"…) e linhas de checklist em qualquer parte do texto.
 */
export function extrairItensDeResumo(texto: string): string[] {
  const linhas = texto.replace(/\r/g, '').split('\n')
  const itens: string[] = []
  let naSecao = false
  for (const bruta of linhas) {
    const linha = bruta.trim()
    if (!linha) continue
    const ehItem = RE_MARCADOR.test(linha)
    if (!ehItem && RE_TITULO_ACOES.test(linha)) {
      naSecao = true
      // título e itens na mesma linha: "Próximos passos: a; b"
      const resto = linha.replace(RE_TITULO_ACOES, '').replace(/^[\s*:–—-]+/, '').trim()
      if (resto) itens.push(...resto.split(/;\s*/).filter(Boolean))
      continue
    }
    if (!ehItem && (RE_TITULO.test(linha) || /^#+\s/.test(linha))) {
      naSecao = false
      continue
    }
    if (ehItem && (naSecao || /^\s*(?:[-*]\s+)?\[[ xX]\]/.test(linha) || /^[☐☑]/u.test(linha))) {
      itens.push(linha)
    } else if (naSecao && !ehItem && itens.length) {
      itens[itens.length - 1] += ` ${linha}` // continuação do item anterior
    }
  }
  return itens.flatMap((i) => dividirItens(i)).filter((i) => i.length > 2)
}

/** Interpretação sem IA. Para transcrições, só encontra itens se houver lista de ações no texto. */
export function interpretarLocalmente(texto: string, tipo: TipoMaterial, opcoes: OpcoesImportacao): AcaoProposta[] {
  const itens = tipo === 'lista' ? dividirItens(texto) : extrairItensDeResumo(texto)
  return itens.map((i) => interpretarItem(i, opcoes))
}

/** Quantas palavras tem o material (para avisos de tamanho). */
export function contarPalavras(texto: string): number {
  return normalizar(texto).split(/\s+/).filter(Boolean).length
}
