import { normalizar } from './util'

const PALAVRAS_VAZIAS = new Set(
  'de da do das dos a o as os e em para pra por com um uma uns umas no na nos nas que se ao aos sobre ate como mais ser ter ver qual quais isso isto esse essa este esta'.split(' '),
)

function radical(p: string): string {
  if (p.length > 5 && p.endsWith('oes')) return `${p.slice(0, -3)}ao`
  if (p.length > 4 && p.endsWith('s')) return p.slice(0, -1)
  return p
}

export function palavrasChave(texto: string): Set<string> {
  return new Set(
    normalizar(texto)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p))
      .map(radical),
  )
}

function dice(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let comum = 0
  for (const p of a) if (b.has(p)) comum++
  return (2 * comum) / (a.size + b.size)
}

interface ComTexto {
  titulo: string
  descricao: string
}

/** 0 a 1: quanto dois itens parecem tratar do mesmo assunto. */
export function similaridade(x: ComTexto, y: ComTexto): number {
  const titulos = dice(palavrasChave(x.titulo), palavrasChave(y.titulo))
  const tudo = dice(palavrasChave(`${x.titulo} ${x.descricao}`), palavrasChave(`${y.titulo} ${y.descricao}`))
  return Math.max(titulos, tudo * 0.9)
}

export const LIMIAR_PARECIDO = 0.5

export function maisParecido<T extends ComTexto>(alvo: ComTexto, candidatos: T[]): { item: T; nota: number } | null {
  let melhor: { item: T; nota: number } | null = null
  for (const c of candidatos) {
    const nota = similaridade(alvo, c)
    if (nota >= LIMIAR_PARECIDO && (!melhor || nota > melhor.nota)) melhor = { item: c, nota }
  }
  return melhor
}

function distancia(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0]
    linha[0] = i
    for (let j = 1; j <= b.length; j++) {
      const atual = linha[j]
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1))
      anterior = atual
    }
  }
  return linha[b.length]
}

/**
 * Para um nome que não está no cadastro, sugere uma pessoa conhecida parecida
 * ("Pri" → "Priscila Souza", "Antonio" → "Antônio"). Retorna null se o nome já é conhecido.
 */
export function sugerirPessoa(nome: string, conhecidos: string[]): string | null {
  const alvo = normalizar(nome)
  if (!alvo || conhecidos.some((c) => normalizar(c) === alvo)) return null
  const [primeiro] = alvo.split(/\s+/)
  let melhor: { nome: string; nota: number } | null = null
  for (const c of conhecidos) {
    const cn = normalizar(c)
    const [cPrimeiro] = cn.split(/\s+/)
    let nota = 0
    if (cn.startsWith(alvo) || alvo.startsWith(cn)) nota = 3
    else if (primeiro.length >= 3 && (cPrimeiro.startsWith(primeiro) || primeiro.startsWith(cPrimeiro))) nota = 2
    else if (distancia(primeiro, cPrimeiro) <= 1 && primeiro.length >= 4) nota = 1
    if (nota && (!melhor || nota > melhor.nota)) melhor = { nome: c, nota }
  }
  return melhor?.nome ?? null
}

export function pessoaConhecida(nome: string, conhecidos: string[]): boolean {
  const alvo = normalizar(nome)
  return conhecidos.some((c) => normalizar(c) === alvo)
}
