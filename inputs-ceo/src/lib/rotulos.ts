import type { Origem, Prioridade, Status } from './types'

export const STATUS: { valor: Status; rotulo: string }[] = [
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'bloqueado', rotulo: 'Bloqueado' },
  { valor: 'concluido', rotulo: 'Realizado' },
]

export const ROTULO_STATUS: Record<Status, string> = Object.fromEntries(
  STATUS.map((s) => [s.valor, s.rotulo]),
) as Record<Status, string>

export const PRIORIDADES: { valor: Prioridade; rotulo: string }[] = [
  { valor: 'alta', rotulo: 'Alta' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'baixa', rotulo: 'Baixa' },
]

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

export const ORIGENS: { valor: Origem; rotulo: string }[] = [
  { valor: 'agenda', rotulo: 'Agenda' },
  { valor: 'reuniao', rotulo: 'Reunião' },
  { valor: 'visita_loja', rotulo: 'Visita à loja' },
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
  { valor: 'email', rotulo: 'E-mail' },
  { valor: 'evento', rotulo: 'Evento' },
  { valor: 'outro', rotulo: 'Outro' },
]

export const ROTULO_ORIGEM: Record<Origem, string> = Object.fromEntries(
  ORIGENS.map((o) => [o.valor, o.rotulo]),
) as Record<Origem, string>

export const AREAS_PADRAO = [
  'Expansão & Franquias',
  'Comercial',
  'Varejo',
  'Produto',
  'Marketing',
  'Digital & Omnicanal',
  'Supply & Logística',
  'Qualidade',
  'Estratégia',
  'Inteligência de Mercado',
  'Financeiro',
  'Gente & Cultura',
  'Comunicação Interna',
  'Jurídico',
  'Tecnologia',
]

export const MARCAS_PADRAO = ['Arezzo', 'Schutz', 'Anacapri', 'Alexandre Birman', 'Fiever', 'Alme', 'Reserva', 'Vans']
