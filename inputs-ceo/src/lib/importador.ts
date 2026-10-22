import type { AcaoProposta, Prioridade } from './types'
import { normalizar, unicos } from './util'

/**
 * Importador local de listas de inputs no formato usado pelo escritório do CEO, ex.:
 *
 *   1. Nome: pergunta ou pedido
 *   2. Pedido | Responsável
 *   3. Pedido para 03.11. Enviado pela Ana.
 *
 * Funciona offline e sem IA; o resultado pode ser refinado depois pela IA (modo "lista").
 */

export interface OpcoesImportacao {
  dataReferencia: string // YYYY-MM-DD
  areas: string[]
  marcas: string[]
}

const PALAVRAS_AREA: [string, RegExp][] = [
  ['Qualidade', /\b(mofo|qualidade|defeito|avaria)/],
  ['Jurídico', /\b(contrato|condominio|licencas?|juridico)\b/],
  ['Comunicação Interna', /\b(comunicacao interna|mural|endomarketing)\b/],
  ['Inteligência de Mercado', /\b(pesquisa de preco|concorrent|mkt share|market share|share de marcas?)/],
  ['Digital & Omnicanal', /\b(store shipping|ship from store|retire|retirada|entrega|omni|e-?commerce|digital|app)\b/],
  ['Expansão & Franquias', /\b(franquia|franqueado|expansao|abrir (uma )?loja|metro quadrado|viabilidade)/],
  ['Gente & Cultura', /\b(incentivo|criterios de avaliacao|squads?|treinamento|contratacao|cultura)\b/],
  ['Comercial', /\b(sell ?in|sell ?out|selout|vendedor|ranking|convencao|multimarca|meta de venda)/],
  ['Supply & Logística', /\b(estoque|recebimento|aging|logistica|abastecimento|cd)\b/],
  ['Produto', /\b(produto|silhueta|sandalia|bolsa|colecao|calcado|tenis|item\/tipo)/],
  ['Estratégia', /\bestrategi/],
  ['Marketing', /\b(marketing|campanha|influenciador|branding)\b/],
  ['Varejo', /\b(loja|experiencia|vm|visual merchandising|vitrine)\b/],
]

const STATUS_FRASE: [AcaoProposta['status'], RegExp][] = [
  ['concluido', /^(enviad[oa]s?|feito|conclu[ií]d[oa]|realizad[oa]|entregue|resolvid[oa])\b/i],
  ['em_andamento', /^(em andamento|andamento|iniciad[oa]|em curso)\b/i],
]

const VERBOS_COM = ['puxar', 'avaliar', 'alinhar', 'falar', 'ver', 'validar', 'conversar', 'checar', 'revisar', 'entender', 'discutir', 'combinar']
const NOME = '[A-ZÀ-Ý][a-zà-ÿ]+(?:\\s+[A-ZÀ-Ý][a-zà-ÿ]+)?'
const RE_VERBO_COM = new RegExp(
  `(?:^|[^\\p{L}])(?:${VERBOS_COM.map((v) => `[${v[0]}${v[0].toUpperCase()}]${v.slice(1)}`).join('|')})\\s+com\\s+(?:o\\s+|a\\s+)?(${NOME})`,
  'u',
)
const RE_PREFIXO_NOME = new RegExp(`^(${NOME}(?:\\s*(?:&|,|\\se\\s)\\s*${NOME})*)\\s*:\\s+(.+)$`, 's')
const RE_PARA_TIME = /^(?:para|com)\s+(?:o\s+|a\s+)?((?:time|equipe)\b.+)$/i
const RE_ENVIADO_POR = new RegExp(`[Ee]nviad[oa]s?\\s+pel[oa]\\s+(${NOME})`, 'u')
const RE_DATA = /(?<![\d./])(\d{2})[./](\d{2})(?:[./](\d{2}|\d{4}))?(?![\d./])/
const RE_ALTA = /\b(problema|urgente|critico|risco|reclamacao|mofo)\b/
const RE_CAIXA = /^(?:\[( |x|X)\]|([☐☑✅✔✓]))\s*/u
const RE_ROTULO_RESP = new RegExp(`\\(?\\b(?:[Rr]espons[áa]ve(?:l|is)|[Rr]esp\\.?|[Dd]ono|[Oo]wner|[Qq]uem)\\s*:\\s*(${NOME}(?:\\s*(?:&|,|\\se\\s)\\s*${NOME})*)\\)?`, 'u')
const RE_MENCAO = /(?:^|\s)@([A-Za-zÀ-ÿ][\wÀ-ÿ]+(?:\.[A-Za-zÀ-ÿ][\wÀ-ÿ]+)?)/gu
const RE_NOME_VAI = new RegExp(
  `^(${NOME})\\s+(?:vai|ir[áa]|deve|dever[áa]|precisa|fica de|ficou de|ficaram de|se comprometeu a|vai fazer|vai trazer)\\b`,
  'u',
)
const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

/** Divide o texto colado em itens, respeitando numeração ("1.", "2)", "3 -") ou marcadores. */
export function dividirItens(texto: string): string[] {
  const linhas = texto.replace(/\r/g, '').split('\n')
  const reInicio = /^\s*(?:\d{1,3}\s*[.)\-–]|[-•*▪●]|[☐☑✅✔✓](?=\s))\s+/u
  const temMarcadores = linhas.some((l) => reInicio.test(l))
  const itens: string[] = []
  for (const linha of linhas) {
    const limpa = linha.trim()
    if (!limpa) continue
    if (!temMarcadores || reInicio.test(linha)) itens.push(limpa.replace(reInicio, '').trim())
    else if (itens.length) itens[itens.length - 1] += ` ${limpa}`
    else itens.push(limpa)
  }
  return itens.filter(Boolean)
}

function frases(texto: string): string[] {
  return texto
    .split(/(?<=[.!?])\s+/)
    .map((f) => f.trim())
    .filter(Boolean)
}

function pareceNomes(trecho: string, marcas: string[]): string[] | null {
  const limpo = trecho.trim().replace(/[.;:]+$/, '')
  if (!limpo || limpo.length > 50) return null
  const partes = limpo.split(/\s*(?:&|,|\/|\se\s)\s*/).filter(Boolean)
  if (!partes.length || partes.length > 4) return null
  const marcasNorm = new Set(marcas.map(normalizar))
  const reParte = /^[A-ZÀ-Ý][a-zà-ÿ]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ý][a-zà-ÿ]+){0,2}$/u
  for (const parte of partes) {
    if (!reParte.test(parte) || marcasNorm.has(normalizar(parte))) return null
  }
  return partes
}

function proximaData(dia: number, mes: number, ano: number | null, ref: string): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  const [anoRef] = ref.split('-').map(Number)
  const montar = (a: number) => `${a}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  if (ano) return montar(ano < 100 ? 2000 + ano : ano)
  const candidata = montar(anoRef)
  return candidata >= ref ? candidata : montar(anoRef + 1)
}

function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** Prazos relativos comuns em resumos: "até sexta", "amanhã", "hoje", "até dia 15". */
function prazoRelativo(textoNormalizado: string, ref: string): string | null {
  if (/\bate amanha\b|\bamanha\b/.test(textoNormalizado)) return somarDias(ref, 1)
  if (/\bate hoje\b|\bpara hoje\b/.test(textoNormalizado)) return ref
  const dia = textoNormalizado.match(/\bate (?:o )?dia (\d{1,2})\b/)
  if (dia) {
    const [a, m] = ref.split('-').map(Number)
    const n = Number(dia[1])
    if (n >= 1 && n <= 31) {
      const candidata = `${a}-${String(m).padStart(2, '0')}-${String(n).padStart(2, '0')}`
      return candidata >= ref ? candidata : proximaData(n, m === 12 ? 1 : m + 1, m === 12 ? a + 1 : a, ref)
    }
  }
  const semana = textoNormalizado.match(/\b(?:ate|para|na|nesta|essa|esta|proxima) (?:a )?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:-feira)?\b/)
  if (semana) {
    const alvo = DIAS_SEMANA.indexOf(semana[1])
    const [a, m, d] = ref.split('-').map(Number)
    const hoje = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
    const delta = (alvo - hoje + 7) % 7 || 7
    return somarDias(ref, delta)
  }
  return null
}

function encurtarTitulo(texto: string): string {
  let t = texto.trim().replace(/[.;:]+$/, '')
  if (t.length > 70 && t.includes('(')) t = t.replace(/\s*\(.*$/s, '').trim() || t
  if (t.length > 80) {
    const virgula = t.indexOf(', ', 25)
    if (virgula > 0 && virgula < 80) t = `${t.slice(0, virgula)}…`
    else t = `${t.slice(0, t.lastIndexOf(' ', 80))}…`
  }
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function interpretarItem(original: string, opcoes: OpcoesImportacao): AcaoProposta {
  const responsaveis: string[] = []
  let status: AcaoProposta['status'] = 'pendente'
  // Remove marcação de checklist ("[ ]", "[x]", "☑") e negrito de Markdown
  let limpo = original.trim().replace(/\*\*|__/g, '')
  const caixa = limpo.match(RE_CAIXA)
  if (caixa) {
    if ((caixa[1] && caixa[1] !== ' ') || (caixa[2] && caixa[2] !== '☐')) status = 'concluido'
    limpo = limpo.slice(caixa[0].length).trim()
  }
  // "Responsável: Fulano", "@Fulano"
  const rotulo = limpo.match(RE_ROTULO_RESP)
  if (rotulo) {
    const nomes = pareceNomes(rotulo[1], opcoes.marcas)
    if (nomes) {
      responsaveis.push(...nomes)
      limpo = limpo.replace(rotulo[0], '').replace(/\s+([.,;|])/g, '$1').replace(/^[\s,;|–—-]+|[\s,;|–—-]+$/g, '').trim()
    }
  }
  for (const m of limpo.matchAll(RE_MENCAO)) {
    responsaveis.push(m[1].split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' '))
  }
  let corpo = limpo

  // "Nome: pedido"
  const prefixo = corpo.match(RE_PREFIXO_NOME)
  if (prefixo) {
    const nomes = pareceNomes(prefixo[1], opcoes.marcas)
    if (nomes) {
      responsaveis.push(...nomes)
      corpo = prefixo[2].trim()
    }
  }

  // Segmentos separados por "|": identifica quais são responsáveis
  const segmentos = corpo.split('|').map((s) => s.trim()).filter(Boolean)
  const conteudo: string[] = []
  segmentos.forEach((seg, i) => {
    if (i === 0) return conteudo.push(seg)
    const time = seg.match(RE_PARA_TIME)
    if (time) {
      const nome = time[1].replace(/[.;]+$/, '')
      return responsaveis.push(nome.charAt(0).toUpperCase() + nome.slice(1))
    }
    const [primeira, ...resto] = frases(seg)
    const nomes = pareceNomes(primeira ?? '', opcoes.marcas)
    if (nomes) {
      responsaveis.push(...nomes)
      if (resto.length) conteudo.push(resto.join(' '))
      return
    }
    conteudo.push(seg)
  })

  // "puxar com Fulano", "avaliar com o Fulano", "Fulano vai trazer…"
  if (!responsaveis.length) {
    const com = corpo.match(RE_VERBO_COM) ?? corpo.match(RE_NOME_VAI)
    if (com && pareceNomes(com[1], opcoes.marcas)) responsaveis.push(com[1])
  }

  // Status ao final ("Enviado.", "Em andamento.")
  const todasFrases = frases(corpo)
  for (const frase of todasFrases.slice(1)) {
    const achado = STATUS_FRASE.find(([, re]) => re.test(frase))
    if (achado) status = achado[0]
  }
  if (status === 'concluido' && !responsaveis.length) {
    const por = corpo.match(RE_ENVIADO_POR)
    if (por) responsaveis.push(por[1])
  }

  // Título: primeira frase do conteúdo principal, sem a marcação de status
  const principal = frases(conteudo[0] ?? corpo).filter((f) => !STATUS_FRASE.some(([, re]) => re.test(f)))
  const titulo = encurtarTitulo(principal[0] ?? corpo)

  const texto = normalizar(limpo)
  const area = PALAVRAS_AREA.find(([nome, re]) => opcoes.areas.includes(nome) && re.test(texto))?.[0] ?? null
  const marca =
    opcoes.marcas.find((m) => new RegExp(`(^|[^\\p{L}])${normalizar(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u').test(texto)) ??
    null

  const data = limpo.match(RE_DATA)
  const prazo = data
    ? proximaData(Number(data[1]), Number(data[2]), data[3] ? Number(data[3]) : null, opcoes.dataReferencia)
    : prazoRelativo(texto, opcoes.dataReferencia)

  const prioridade: Prioridade = RE_ALTA.test(texto) ? 'alta' : 'media'

  return {
    titulo,
    descricao: limpo,
    contexto: '',
    responsaveis: unicos(responsaveis),
    area,
    marca,
    prazo,
    prioridade,
    status,
    citacao: null,
  }
}

export function importarLista(texto: string, opcoes: OpcoesImportacao): AcaoProposta[] {
  return dividirItens(texto).map((item) => interpretarItem(item, opcoes))
}
