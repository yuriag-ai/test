import { jsPDF } from 'jspdf'
import { EMPRESA } from '../ambiente'
import { ROTULO_ORIGEM, ROTULO_STATUS } from '../rotulos'
import type { Input, Reuniao, Status } from '../types'
import { diasAte, formatarData, formatarDuracao, hojeISO, horaAgora, normalizar } from '../util'
import { MONTSERRAT_BLACK, MONTSERRAT_BOLD, MONTSERRAT_REGULAR } from './fontes'

/**
 * PDFs no padrão visual Arezzo&CO: A4, preto sobre branco, título em caixa alta com o final em aqua,
 * linhas numeradas ("01."), marca-texto e destaques. Texto vetorial (selecionável) com Montserrat embutida.
 * Carregado sob demanda (import dinâmico) para não pesar a abertura do app.
 */

type Cor = readonly [number, number, number]
type Peso = 'normal' | 'bold' | 'black'

const COR = {
  tinta: [0, 0, 0],
  grafite: [64, 64, 64],
  nevoa: [112, 112, 112],
  regua: [230, 230, 230],
  branco: [255, 255, 255],
  aqua: [115, 207, 207],
  aquaClaro: [228, 246, 246],
  aquaMedio: [198, 236, 236],
  rose: [222, 184, 167],
  roseClaro: [245, 234, 229],
  azul: [148, 217, 235],
  cinza: [217, 217, 217],
} as const satisfies Record<string, Cor>

const COR_STATUS: Record<Status, Cor> = {
  pendente: [232, 196, 82],
  em_andamento: COR.aqua,
  concluido: [107, 179, 138],
  bloqueado: [217, 103, 90],
}

// A4 em pontos
const LARGURA = 595.28
const ALTURA = 841.89
const MARGEM = 44
const CONTEUDO = LARGURA - 2 * MARGEM
const TOPO_CONTINUACAO = 62
const LIMITE_INFERIOR = ALTURA - 50
const COLUNA_NUMERO = 32
const ALTURA_SELO = 12

interface Estilo {
  peso: Peso
  tamanho: number
  cor: Cor
}
interface Segmento extends Estilo {
  texto: string
}
interface Pedaco extends Segmento {
  x: number
}
type Selo =
  | { tipo: 'status'; status: Status }
  | { tipo: 'marca'; texto: string; fundo: Cor; cor?: Cor }
  | { tipo: 'texto'; texto: string }
interface Linha {
  altura: number
  base: number
  pedacos: Pedaco[]
  selos?: Selo[]
  recuo?: number
  marcador?: boolean
}

const estilo = (peso: Peso, tamanho: number, cor: Cor = COR.tinta): Estilo => ({ peso, tamanho, cor })
const seg = (texto: string, e: Estilo): Segmento => ({ texto, ...e })
const espaco = (altura: number): Linha => ({ altura, base: 0, pedacos: [] })

const EST = {
  titulo: estilo('black', 24),
  subtitulo: estilo('normal', 8.5, COR.nevoa),
  subtituloRotulo: estilo('bold', 8.5),
  secao: estilo('black', 10),
  item: estilo('bold', 10.5),
  numero: estilo('black', 12.5),
  meta: estilo('normal', 8.5, COR.nevoa),
  metaDestaque: estilo('bold', 8.5),
  detalhe: estilo('normal', 8.5, COR.grafite),
  detalheRotulo: estilo('bold', 8.5),
  corpo: estilo('normal', 10),
  ponto: estilo('normal', 9, COR.grafite),
  caixaTitulo: estilo('black', 9.5),
  selo: estilo('bold', 7.5),
  seloTexto: estilo('normal', 7.5, COR.nevoa),
  marca: estilo('black', 6.8),
}

/** Troca o que a fonte embutida não desenha (emoji, símbolos raros) por equivalentes ou remove. */
export function limparTexto(texto: string): string {
  return texto
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[‐-‒―−]/g, '-')
    .replace(/[‚‛′]/g, "'")
    .replace(/[„‟″]/g, '"')
    .replace(/[★☆]/g, '*')
    .replace(/[^\n -~ -ÿ–—‘’“”•…€→]/gu, '')
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

function carimbo(d = new Date()): string {
  return `${formatarData(hojeISO(d), true)}, ${horaAgora(d)}`
}

/** Nome de arquivo sem acentos: "Reunião no voo" → "reuniao-no-voo-2026-10-23.pdf". */
export function nomeArquivoPdf(base: string, data = hojeISO()): string {
  const slug = normalizar(base)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${slug || 'documento'}-${data}.pdf`
}

class Relatorio {
  readonly pdf: jsPDF
  y = MARGEM

  constructor(private readonly corrido: string) {
    this.pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
    const fontes: [string, string, Peso][] = [
      ['Montserrat-Regular.ttf', MONTSERRAT_REGULAR, 'normal'],
      ['Montserrat-Bold.ttf', MONTSERRAT_BOLD, 'bold'],
      ['Montserrat-Black.ttf', MONTSERRAT_BLACK, 'black'],
    ]
    for (const [arquivo, dados, peso] of fontes) {
      this.pdf.addFileToVFS(arquivo, dados)
      this.pdf.addFont(arquivo, 'Montserrat', peso)
    }
    this.pdf.setLanguage('pt-BR')
  }

  // ---------- texto ----------

  aplicar(e: Estilo) {
    this.pdf.setFont('Montserrat', e.peso)
    this.pdf.setFontSize(e.tamanho)
    this.pdf.setTextColor(e.cor[0], e.cor[1], e.cor[2])
  }

  medir(texto: string, e: Estilo): number {
    this.aplicar(e)
    return this.pdf.getTextWidth(texto)
  }

  /** Distribui texto com estilos mistos em linhas de até `largura` pontos, quebrando entre palavras. */
  fluir(segmentos: Segmento[], largura: number, entrelinha = 1.32, recuo = 0): Linha[] {
    const disponivel = largura - recuo
    const linhas: Linha[] = []
    let pedacos: Pedaco[] = []
    let x = 0
    let maior = 0
    let pendente = 0
    const fechar = (tamanhoMinimo: number) => {
      const t = maior || tamanhoMinimo
      // linha de base: meia entrelinha + ascendente da Montserrat (0,968 em)
      linhas.push({ altura: t * entrelinha, base: t * ((entrelinha - 1.219) / 2 + 0.968), pedacos, recuo })
      pedacos = []
      x = 0
      maior = 0
      pendente = 0
    }
    const colocar = (texto: string, e: Segmento, largura: number, comEspaco: boolean) => {
      const ultimo = pedacos[pedacos.length - 1]
      const mesmoEstilo = ultimo && ultimo.peso === e.peso && ultimo.tamanho === e.tamanho && ultimo.cor === e.cor
      if (mesmoEstilo && comEspaco) ultimo.texto += ' ' + texto
      else if (mesmoEstilo && !comEspaco && x === ultimo.x + this.medir(ultimo.texto, ultimo)) ultimo.texto += texto
      else pedacos.push({ ...e, texto, x: comEspaco ? x + pendente : x })
      x += (comEspaco ? pendente : 0) + largura
      maior = Math.max(maior, e.tamanho)
      pendente = 0
    }
    for (const s of segmentos) {
      limparTexto(s.texto)
        .split('\n')
        .forEach((paragrafo, indice) => {
          if (indice > 0) fechar(s.tamanho)
          for (const token of paragrafo.split(/( +)/)) {
            if (!token) continue
            if (token.trim() === '') {
              if (x > 0) pendente = this.medir(' ', s)
              continue
            }
            let palavra = token
            let w = this.medir(palavra, s)
            const comEspaco = x > 0 && pendente > 0
            if (x > 0 && (comEspaco ? x + pendente : x) + w > disponivel) fechar(s.tamanho)
            // palavra maior que a linha inteira: quebra por caracteres
            while (w > disponivel && palavra.length > 1) {
              let corte = palavra.length - 1
              while (corte > 1 && this.medir(palavra.slice(0, corte), s) > disponivel) corte--
              colocar(palavra.slice(0, corte), s, this.medir(palavra.slice(0, corte), s), false)
              fechar(s.tamanho)
              palavra = palavra.slice(corte)
              w = this.medir(palavra, s)
            }
            colocar(palavra, s, w, x > 0 && pendente > 0)
          }
        })
    }
    if (pedacos.length || !linhas.length) fechar(segmentos[0]?.tamanho ?? 10)
    return linhas
  }

  /** Lista com marcadores (bolinha preta), um item por entrada. */
  lista(itens: string[], largura: number, e: Estilo): Linha[] {
    return itens.flatMap((texto, i) => {
      const linhas = this.fluir([seg(texto, e)], largura, 1.32, 12)
      linhas[0].marcador = true
      return i < itens.length - 1 ? [...linhas, espaco(2)] : linhas
    })
  }

  desenharLinha(l: Linha, x: number, y: number) {
    const x0 = x + (l.recuo ?? 0)
    if (l.marcador && l.pedacos[0]) {
      this.pdf.setFillColor(...COR.tinta)
      this.pdf.circle(x0 - 8, y + l.base - l.pedacos[0].tamanho * 0.27, 1.3, 'F')
    }
    if (l.selos) this.desenharSelos(l.selos, x0, y + (l.altura - ALTURA_SELO) / 2)
    for (const p of l.pedacos) {
      this.aplicar(p)
      this.pdf.text(p.texto, x0 + p.x, y + l.base)
    }
  }

  // ---------- selos (status, marca-texto, prazo) ----------

  private larguraSelo(s: Selo): number {
    if (s.tipo === 'status') return 9 + this.medir(ROTULO_STATUS[s.status], EST.selo)
    if (s.tipo === 'marca') return this.medir(limparTexto(s.texto).toUpperCase(), EST.marca) + 7
    return this.medir(limparTexto(s.texto), EST.seloTexto)
  }

  desenharSelos(selos: Selo[], x: number, y: number) {
    let cx = x
    for (const s of selos) {
      const w = this.larguraSelo(s)
      if (s.tipo === 'status') {
        this.pdf.setFillColor(...COR_STATUS[s.status])
        this.pdf.circle(cx + 2.6, y + ALTURA_SELO / 2, 2.6, 'F')
        this.aplicar(EST.selo)
        this.pdf.text(ROTULO_STATUS[s.status], cx + 9, y + 8.7)
      } else if (s.tipo === 'marca') {
        this.pdf.setFillColor(...s.fundo)
        this.pdf.rect(cx, y, w, ALTURA_SELO, 'F')
        this.aplicar({ ...EST.marca, cor: s.cor ?? COR.tinta })
        this.pdf.text(limparTexto(s.texto).toUpperCase(), cx + 3.5, y + 8.5)
      } else {
        this.aplicar(EST.seloTexto)
        this.pdf.text(limparTexto(s.texto), cx, y + 8.7)
      }
      cx += w + 9
    }
  }

  // ---------- páginas ----------

  get espacoLivre() {
    return LIMITE_INFERIOR - this.y
  }

  novaPagina() {
    this.pdf.addPage()
    this.y = TOPO_CONTINUACAO
    this.sobrelinha(this.corrido, MARGEM, 34, 7)
    if (EMPRESA) this.logo(LARGURA - MARGEM, 30, 8.5)
  }

  /** Começa outra página se `altura` não couber no espaço que resta. */
  garantir(altura: number) {
    if (altura > this.espacoLivre && this.y > TOPO_CONTINUACAO + 1) this.novaPagina()
  }

  private sobrelinha(texto: string, x: number, y: number, tamanho = 8) {
    this.aplicar(estilo('black', tamanho))
    this.pdf.text(limparTexto(texto).toUpperCase(), x, y, { charSpace: 0.5 })
  }

  /** Logo em texto, alinhado à direita: AREZZO / &CO, com o "&" em azul-claro. */
  private logo(xDireita: number, yBase: number, tamanho: number) {
    const e = estilo('black', tamanho)
    const segunda = yBase + tamanho * 0.95
    this.aplicar(e)
    this.pdf.text('AREZZO', xDireita - this.medir('AREZZO', e), yBase)
    const wCO = this.medir('CO', e)
    const wE = this.medir('&', e)
    this.pdf.text('CO', xDireita - wCO, segunda)
    this.aplicar({ ...e, cor: COR.azul })
    this.pdf.text('&', xDireita - wCO - wE, segunda)
  }

  // ---------- blocos do documento ----------

  /** Topo da primeira página: sobrelinha, logo, título com acento aqua e linhas de apoio. */
  cabecalho(sobrelinha: string, titulo: string, acento: string, apoio: Segmento[][]) {
    this.sobrelinha(sobrelinha, MARGEM, 46)
    if (EMPRESA) this.logo(LARGURA - MARGEM, 42, 12)
    this.y = 66
    const segmentos = [seg(titulo.toUpperCase(), EST.titulo)]
    if (acento) segmentos.push(seg(' ' + acento.toUpperCase(), { ...EST.titulo, cor: COR.aqua }))
    for (const l of this.fluir(segmentos, CONTEUDO, 1.08)) {
      this.desenharLinha(l, MARGEM, this.y)
      this.y += l.altura
    }
    this.y += 6
    for (const linha of apoio) {
      for (const l of this.fluir(linha, CONTEUDO)) {
        this.desenharLinha(l, MARGEM, this.y)
        this.y += l.altura
      }
    }
  }

  selos(selos: Selo[]) {
    if (!selos.length) return
    this.y += 10
    this.desenharSelos(selos, MARGEM, this.y)
    this.y += ALTURA_SELO
  }

  /** Seção: fio preto e título em caixa alta; só começa se houver espaço para algum conteúdo junto. */
  secao(titulo: string, espacoSeguinte = 70) {
    this.garantir(34 + espacoSeguinte)
    this.y += 16
    this.pdf.setDrawColor(...COR.tinta)
    this.pdf.setLineWidth(0.8)
    this.pdf.line(MARGEM, this.y, LARGURA - MARGEM, this.y)
    this.y += 9
    this.aplicar(EST.secao)
    this.pdf.text(limparTexto(titulo).toUpperCase(), MARGEM, this.y + 9)
    this.y += 16
  }

  /** Título de grupo em marca-texto aqua leve, com a contagem ao lado. */
  grupo(nome: string, quantidade: number) {
    this.garantir(30 + 60)
    this.y += 16
    this.desenharSelos([{ tipo: 'marca', texto: nome, fundo: COR.aquaMedio }, { tipo: 'texto', texto: String(quantidade) }], MARGEM, this.y)
    this.y += ALTURA_SELO + 2
  }

  /** Linha numerada: número em destaque à esquerda; título, metadados, selos e detalhes à direita. */
  item(it: { numero: string; titulo: string; meta?: Segmento[]; selos?: Selo[]; detalhes?: Segmento[][]; pontos?: string[] }) {
    const largura = CONTEUDO - COLUNA_NUMERO
    const titulo = this.fluir([seg(it.titulo, EST.item)], largura, 1.28)
    const linhas: Linha[] = [...titulo]
    if (it.meta?.length) linhas.push(espaco(2), ...this.fluir(it.meta, largura))
    if (it.selos?.length) linhas.push(espaco(3), { altura: ALTURA_SELO, base: 0, pedacos: [], selos: it.selos })
    if (it.detalhes?.length) {
      linhas.push(espaco(4))
      it.detalhes.forEach((d, i) => linhas.push(...(i ? [espaco(2)] : []), ...this.fluir(d, largura)))
    }
    if (it.pontos?.length) linhas.push(espaco(3), ...this.lista(it.pontos, largura, EST.ponto))

    const folga = 9
    const total = folga * 2 + linhas.reduce((s, l) => s + l.altura, 0)
    this.garantir(total)
    let y = this.y + folga
    this.aplicar(EST.numero)
    this.pdf.text(limparTexto(it.numero), MARGEM, y + titulo[0].base)
    for (const l of linhas) {
      if (l.altura > LIMITE_INFERIOR - y) {
        this.novaPagina()
        y = this.y
      }
      this.desenharLinha(l, MARGEM + COLUNA_NUMERO, y)
      y += l.altura
    }
    this.y = y + folga
    this.pdf.setDrawColor(...COR.regua)
    this.pdf.setLineWidth(0.6)
    this.pdf.line(MARGEM, this.y, LARGURA - MARGEM, this.y)
  }

  /** Destaque do padrão: fundo leve (mensagem principal, atenção) ou contorno aqua (decisões). */
  destaque(montar: (largura: number) => Linha[], { fundo, contorno }: { fundo?: Cor; contorno?: Cor }) {
    const folga = 12
    const linhas = montar(CONTEUDO - folga * 2)
    const total = linhas.reduce((s, l) => s + l.altura, 0) + folga * 2
    this.y += 14
    if (total > this.espacoLivre && total <= LIMITE_INFERIOR - TOPO_CONTINUACAO) this.novaPagina()
    // Se ainda assim não couber, a caixa continua na página seguinte.
    let bloco: Linha[] = []
    let altura = folga * 2
    for (const l of linhas) {
      if (bloco.length && altura + l.altura > this.espacoLivre) {
        this.caixa(bloco, altura, folga, fundo, contorno)
        this.novaPagina()
        bloco = []
        altura = folga * 2
      }
      bloco.push(l)
      altura += l.altura
    }
    if (bloco.length) this.caixa(bloco, altura, folga, fundo, contorno)
  }

  private caixa(linhas: Linha[], altura: number, folga: number, fundo?: Cor, contorno?: Cor) {
    if (fundo) {
      this.pdf.setFillColor(...fundo)
      this.pdf.roundedRect(MARGEM, this.y, CONTEUDO, altura, 3, 3, 'F')
    }
    if (contorno) {
      this.pdf.setDrawColor(...contorno)
      this.pdf.setLineWidth(1.6)
      this.pdf.roundedRect(MARGEM + 0.8, this.y + 0.8, CONTEUDO - 1.6, altura - 1.6, 3, 3, 'S')
    }
    let y = this.y + folga
    for (const l of linhas) {
      this.desenharLinha(l, MARGEM + folga, y)
      y += l.altura
    }
    this.y += altura
  }

  paragrafo(segmentos: Segmento[]) {
    for (const l of this.fluir(segmentos, CONTEUDO)) {
      this.garantir(l.altura)
      this.desenharLinha(l, MARGEM, this.y)
      this.y += l.altura
    }
  }

  /** Rodapé em todas as páginas e o arquivo final. */
  finalizar(titulo: string, geradoEm: string): Blob {
    const total = this.pdf.getNumberOfPages()
    const rodape = [EMPRESA, 'Inputs do CEO', `gerado em ${geradoEm}`].filter(Boolean).join(' · ')
    for (let p = 1; p <= total; p++) {
      this.pdf.setPage(p)
      this.aplicar(estilo('normal', 7, COR.nevoa))
      this.pdf.text(rodape, MARGEM, ALTURA - 26)
      const pagina = `${doisDigitos(p)} / ${doisDigitos(total)}`
      this.aplicar(estilo('bold', 7))
      this.pdf.text(pagina, LARGURA - MARGEM - this.pdf.getTextWidth(pagina), ALTURA - 26)
    }
    this.pdf.setProperties({ title: limparTexto(titulo), creator: 'Inputs do CEO' })
    return this.pdf.output('blob')
  }
}

// ---------- conteúdo dos inputs ----------

function selosDoInput(i: Input): Selo[] {
  const selos: Selo[] = [{ tipo: 'status', status: i.status }]
  if (i.prazo) {
    const dias = diasAte(i.prazo)
    if (i.status === 'concluido' || dias > 3) selos.push({ tipo: 'texto', texto: `Prazo ${formatarData(i.prazo, true)}` })
    else if (dias < 0) selos.push({ tipo: 'marca', texto: `Atrasado · ${formatarData(i.prazo)}`, fundo: COR.tinta, cor: COR.branco })
    else selos.push({ tipo: 'marca', texto: dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : formatarData(i.prazo), fundo: COR.rose })
  }
  if (i.prioridade === 'alta') selos.push({ tipo: 'marca', texto: 'Alta', fundo: COR.aqua })
  return selos
}

function responsaveis(i: Input): Segmento {
  return i.responsaveis.length ? seg(i.responsaveis.join(', '), EST.metaDestaque) : seg('Sem responsável', EST.meta)
}

function detalhesDoInput(i: Input): Segmento[][] {
  const detalhes: Segmento[][] = []
  if (i.descricao && normalizar(i.descricao) !== normalizar(i.titulo)) detalhes.push([seg(i.descricao, EST.detalhe)])
  if (i.contexto) detalhes.push([seg('Contexto: ', EST.detalheRotulo), seg(i.contexto, EST.detalhe)])
  if (i.observacoes) detalhes.push([seg('Observações: ', EST.detalheRotulo), seg(i.observacoes, EST.detalhe)])
  const nota = [...i.atualizacoes].reverse().find((a) => a.tipo === 'nota')
  if (nota) detalhes.push([seg(`Atualização em ${formatarData(nota.data.slice(0, 10))}: `, EST.detalheRotulo), seg(nota.texto, EST.detalhe)])
  return detalhes
}

export interface PdfInputs {
  sobrelinha: string
  titulo: string
  acento: string
  /** Filtros e agrupamento usados, mostrados abaixo do título. */
  descricao?: string
  grupos: [string, Input[]][]
}

/** Lista de inputs (plano de ação) com resumo, grupos e uma linha numerada por input. */
export function gerarPdfInputs({ sobrelinha, titulo, acento, descricao, grupos }: PdfInputs): Blob {
  const geradoEm = carimbo()
  const r = new Relatorio(`${titulo} ${acento}`.trim())
  r.cabecalho(sobrelinha, titulo, acento, [[seg([descricao, `Gerado em ${geradoEm}`].filter(Boolean).join(' · '), EST.subtitulo)]])

  const todos = [...new Map(grupos.flatMap(([, itens]) => itens).map((i) => [i.id, i])).values()]
  const abertos = todos.filter((i) => i.status !== 'concluido')
  const atrasados = abertos.filter((i) => i.prazo && diasAte(i.prazo) < 0).length
  const semResponsavel = abertos.filter((i) => !i.responsaveis.length).length
  const realizados = todos.length - abertos.length
  const resumo: Selo[] = [{ tipo: 'marca', texto: `${todos.length} ${todos.length === 1 ? 'item' : 'itens'}`, fundo: COR.tinta, cor: COR.branco }]
  if (atrasados) resumo.push({ tipo: 'marca', texto: `${atrasados} ${atrasados === 1 ? 'atrasado' : 'atrasados'}`, fundo: COR.rose })
  if (semResponsavel) resumo.push({ tipo: 'marca', texto: `${semResponsavel} sem responsável`, fundo: COR.aquaMedio })
  if (realizados) resumo.push({ tipo: 'marca', texto: `${realizados} ${realizados === 1 ? 'realizado' : 'realizados'}`, fundo: COR.cinza })
  r.selos(resumo)
  r.secao('Plano de ação', 40)

  if (!todos.length) r.paragrafo([seg('Nenhum input com esses filtros.', EST.meta)])
  for (const [nome, itens] of grupos) {
    if (nome) r.grupo(nome, itens.length)
    for (const i of itens) {
      const resto = [i.area, i.marca, [ROTULO_ORIGEM[i.origem], i.local].filter(Boolean).join(', '), formatarData(i.dataInput, true)]
      r.item({
        numero: `${doisDigitos(i.numero)}.`,
        titulo: i.titulo,
        meta: [responsaveis(i), seg(` · ${resto.filter(Boolean).join(' · ')}`, EST.meta)],
        selos: selosDoInput(i),
        detalhes: detalhesDoInput(i),
      })
    }
  }
  return r.finalizar(`${titulo} ${acento}`, geradoEm)
}

// ---------- reunião: ata executiva e plano de ação ----------

/** Ata executiva (se houver) e plano de ação da reunião, com os inputs criados ou retomados nela. */
export function gerarPdfReuniao(reuniao: Reuniao, inputs: Input[]): Blob {
  const geradoEm = carimbo()
  const ata = reuniao.ata
  const tipo = ata ? 'Ata executiva' : 'Plano de ação'
  const nome = (ata?.titulo || reuniao.titulo || 'Reunião').trim()
  const corte = nome.lastIndexOf(' ')
  const r = new Relatorio(`${tipo} · ${nome}`)

  const meta = [
    formatarData(reuniao.data, true),
    reuniao.hora,
    ROTULO_ORIGEM[reuniao.origem],
    reuniao.local,
    reuniao.duracaoSeg ? formatarDuracao(reuniao.duracaoSeg) : '',
  ]
  const participantes = ata?.participantes.length ? ata.participantes : reuniao.participantes
  const apoio: Segmento[][] = [[seg(meta.filter(Boolean).join(' · '), EST.subtitulo)]]
  if (participantes.length) apoio.push([seg('Participantes: ', EST.subtituloRotulo), seg(participantes.join(', '), EST.subtitulo)])
  r.cabecalho(tipo, corte > 0 ? nome.slice(0, corte) : nome, corte > 0 ? nome.slice(corte + 1) : '', apoio)

  if (ata) {
    if (ata.resumoExecutivo) {
      r.destaque(
        (largura) => [
          { altura: ALTURA_SELO, base: 0, pedacos: [], selos: [{ tipo: 'marca', texto: 'Resumo executivo', fundo: COR.aqua }] },
          espaco(7),
          ...r.fluir([seg(ata.resumoExecutivo, EST.corpo)], largura, 1.4),
        ],
        { fundo: COR.aquaClaro },
      )
    }
    if (ata.temas.length) {
      r.secao('Temas discutidos')
      ata.temas.forEach((t, k) => r.item({ numero: `${doisDigitos(k + 1)}.`, titulo: t.tema, pontos: t.pontos }))
    }
    const caixaLista = (titulo: string, itens: string[]) => (largura: number) => [
      ...r.fluir([seg(titulo.toUpperCase(), EST.caixaTitulo)], largura),
      espaco(5),
      ...r.lista(itens, largura, estilo('normal', 9.5)),
    ]
    if (ata.decisoes.length) r.destaque(caixaLista('Decisões', ata.decisoes), { contorno: COR.aqua })
    if (ata.pontosDeAtencao.length) r.destaque(caixaLista('Pontos de atenção', ata.pontosDeAtencao), { fundo: COR.roseClaro })
  }

  r.secao(ata ? 'Plano de ação' : 'Ações')
  if (!inputs.length) r.paragrafo([seg('Nenhum input criado a partir desta reunião.', EST.meta)])
  inputs.forEach((i, k) => {
    const selos = selosDoInput(i)
    if (i.reuniaoId !== reuniao.id) selos.push({ tipo: 'marca', texto: 'Retomado', fundo: COR.aquaMedio })
    r.item({
      numero: `${doisDigitos(k + 1)}.`,
      titulo: i.titulo,
      meta: [responsaveis(i), seg(` · ${[`Input #${i.numero}`, i.area, i.marca].filter(Boolean).join(' · ')}`, EST.meta)],
      selos,
      detalhes: detalhesDoInput(i),
    })
  })
  return r.finalizar(`${tipo} · ${nome}`, geradoEm)
}
