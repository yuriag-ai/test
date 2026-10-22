export type Status = 'pendente' | 'em_andamento' | 'concluido' | 'bloqueado'
export type Prioridade = 'alta' | 'media' | 'baixa'
export type Origem = 'agenda' | 'reuniao' | 'visita_loja' | 'whatsapp' | 'email' | 'evento' | 'outro'

export interface Atualizacao {
  id: string
  data: string // ISO datetime
  texto: string
  tipo: 'nota' | 'status' | 'sistema'
}

/** Um input do CEO, tratado como tarefa (To-Do). */
export interface Input {
  id: string
  numero: number
  titulo: string
  descricao: string
  contexto: string
  origem: Origem
  local: string
  dataInput: string // YYYY-MM-DD — quando foi falado
  area: string
  marca: string
  responsaveis: string[]
  prazo: string // YYYY-MM-DD ou ''
  status: Status
  prioridade: Prioridade
  observacoes: string
  atualizacoes: Atualizacao[]
  reuniaoId?: string
  citacao?: string
  criadoEm: string
  atualizadoEm: string
}

export interface Anexo {
  id: string
  inputId: string
  nome: string
  tipo: string
  tamanho: number
  blob: Blob
  criadoEm: string
}

export interface TemaAta {
  tema: string
  pontos: string[]
}

export interface AtaExecutiva {
  titulo: string
  resumoExecutivo: string
  participantes: string[]
  temas: TemaAta[]
  decisoes: string[]
  pontosDeAtencao: string[]
}

/** Uma sessão de captura (reunião, agenda, visita) — origem de Atas e Planos de Ação. */
export interface Reuniao {
  id: string
  titulo: string
  data: string // YYYY-MM-DD
  hora: string // HH:mm
  local: string
  origem: Origem
  participantes: string[]
  transcricao: string
  duracaoSeg: number
  audioTipo?: string
  ata?: AtaExecutiva
  modo?: ModoProcessamento
  /** Ações sugeridas pela IA aguardando revisão. */
  propostas?: AcaoProposta[]
  /** Inputs já existentes que foram retomados nesta reunião. */
  retomados?: string[]
  estado: 'gravando' | 'rascunho' | 'processada'
  criadoEm: string
  atualizadoEm: string
}

export interface AudioChunk {
  id?: number
  reuniaoId: string
  ordem: number
  blob: Blob
}

export interface Pessoa {
  id: string
  nome: string
  area: string
}

export interface Config {
  chave: string
  valor: unknown
}

export type ModoProcessamento = 'ata' | 'plano' | 'lista'

/** Ação proposta pela IA (ou pelo importador), antes de virar Input. */
export interface AcaoProposta {
  titulo: string
  descricao: string
  contexto: string
  responsaveis: string[]
  area: string | null
  marca: string | null
  prazo: string | null
  prioridade: Prioridade
  status: 'pendente' | 'em_andamento' | 'concluido'
  citacao: string | null
}

export type TipoMaterial = 'transcricao' | 'resumo' | 'lista'

/** O que a IA identificou sobre o material enviado. */
export interface MetaMaterial {
  tipoMaterial: TipoMaterial
  titulo: string | null
  data: string | null
  local: string | null
  participantes: string[]
}

/** Ação em revisão: pode virar um input novo ou uma atualização de um input existente. */
export interface AcaoRevisavel extends AcaoProposta {
  chave: string
  incluir: boolean
  /** id de um input existente que será atualizado em vez de criar um novo */
  vinculo?: string
  /** o usuário confirmou que não é repetido */
  manterSeparado?: boolean
}

export interface ResultadoProcessamento {
  ata: AtaExecutiva | null
  acoes: AcaoProposta[]
  meta: MetaMaterial | null
}

/** Arquivo enviado para a IA ler diretamente (PDF ou imagem), em base64 sem o prefixo data:. */
export interface ArquivoIA {
  nome: string
  tipo: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  dados: string
}

export interface ContextoProcessamento {
  titulo?: string
  data?: string
  local?: string
  participantes?: string[]
  areas?: string[]
  marcas?: string[]
  pessoas?: { nome: string; area: string }[]
}

export interface PedidoProcessamento {
  modo: ModoProcessamento
  texto: string
  arquivos?: ArquivoIA[]
  tipoMaterial?: TipoMaterial
  contexto: ContextoProcessamento
}
