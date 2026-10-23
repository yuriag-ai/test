import { strFromU8, unzipSync } from 'fflate'
import { EM_ARTIFACT } from './ambiente'
import { limparLegenda } from './material'
import type { ArquivoIA, TipoMaterial } from './types'

/** Formatos aceitos no seletor de arquivos. */
export const ACEITOS = EM_ARTIFACT ? '.txt,.md,.markdown,.csv,.srt,.vtt,.docx,image/*' : '.txt,.md,.markdown,.csv,.srt,.vtt,.docx,.pdf,image/*'

/** Limite do corpo da requisição nas funções da Vercel é ~4,5 MB; deixamos folga para o JSON. */
export const LIMITE_ANEXOS_BYTES = 3_500_000

export interface ArquivoLido {
  nome: string
  texto?: string
  anexo?: ArquivoIA
  erro?: string
  /** quando o formato já diz o tipo (legendas são sempre transcrição) */
  tipo?: TipoMaterial
}

const TIPOS_IMAGEM: ArquivoIA['tipo'][] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function lerArquivo(arquivo: File): Promise<ArquivoLido> {
  const nome = arquivo.name
  const ext = nome.toLowerCase().split('.').pop() ?? ''
  try {
    if (ext === 'srt' || ext === 'vtt') return { nome, texto: limparLegenda(await arquivo.text()), tipo: 'transcricao' }
    if (['txt', 'md', 'markdown', 'csv'].includes(ext) || arquivo.type.startsWith('text/')) {
      return { nome, texto: (await arquivo.text()).trim() }
    }
    if (ext === 'docx') return { nome, texto: extrairTextoDocx(new Uint8Array(await arquivo.arrayBuffer())) }
    if (ext === 'pdf' || arquivo.type === 'application/pdf') {
      if (EM_ARTIFACT) return { nome, erro: 'No link de teste, PDFs não são lidos. Envie o texto (TXT ou DOCX) ou fotos das páginas.' }
      if (arquivo.size > LIMITE_ANEXOS_BYTES * 0.75) return { nome, erro: 'PDF grande demais (máx. ~2,5 MB). Exporte só as páginas necessárias.' }
      return { nome, anexo: { nome, tipo: 'application/pdf', dados: await paraBase64(arquivo) } }
    }
    if (arquivo.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'].includes(ext)) {
      return { nome, anexo: await comprimirImagem(arquivo) }
    }
    if (ext === 'doc' || ext === 'pages' || ext === 'rtf') {
      return { nome, erro: 'Formato antigo. Salve como .docx ou PDF e envie de novo.' }
    }
    return { nome, erro: 'Formato não suportado. Envie TXT, DOCX, PDF, SRT/VTT ou foto.' }
  } catch {
    return { nome, erro: 'Não foi possível ler este arquivo.' }
  }
}

function decodificarXml(texto: string): string {
  return texto
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
}

/** Extrai o texto de um .docx (parágrafos, quebras e itens de lista numerada/marcada). */
export function extrairTextoDocx(bytes: Uint8Array): string {
  const partes = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' })
  const xml = partes['word/document.xml']
  if (!xml) throw new Error('docx sem document.xml')
  const documento = strFromU8(xml)
  const paragrafos = documento.split(/<\/w:p>/)
  const linhas: string[] = []
  for (const p of paragrafos) {
    const pedacos = p.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:tab\/>|<w:br\/>/g) ?? []
    const texto = pedacos
      .map((t) => (t === '<w:tab/>' ? '\t' : t === '<w:br/>' ? '\n' : decodificarXml(t.replace(/<[^>]+>/g, ''))))
      .join('')
      .trim()
    if (!texto) continue
    linhas.push(/<w:numPr>/.test(p) ? `- ${texto}` : texto)
  }
  return linhas.join('\n')
}

function paraBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result).split(',')[1] ?? '')
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsDataURL(blob)
  })
}

/** Reduz fotos para no máximo 1800px em JPEG — suficiente para a IA ler anotações e prints. */
async function comprimirImagem(arquivo: File, max = 1800): Promise<ArquivoIA> {
  try {
    const bitmap = await createImageBitmap(arquivo)
    const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro()), 'image/jpeg', 0.82))
    return { nome: arquivo.name, tipo: 'image/jpeg', dados: await paraBase64(blob) }
  } catch {
    const tipo = TIPOS_IMAGEM.find((t) => t === arquivo.type)
    if (!tipo) throw new Error('imagem não suportada')
    return { nome: arquivo.name, tipo, dados: await paraBase64(arquivo) }
  }
}

export function tamanhoAnexos(anexos: ArquivoIA[]): number {
  return anexos.reduce((soma, a) => soma + Math.ceil((a.dados.length * 3) / 4), 0)
}
