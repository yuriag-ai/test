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

export function resumoSalvamento(criados: number, atualizados: number): string {
  const partes: string[] = []
  if (criados) partes.push(`${criados} ${criados === 1 ? 'input criado' : 'inputs criados'}`)
  if (atualizados) partes.push(`${atualizados} ${atualizados === 1 ? 'atualizado' : 'atualizados'}`)
  return partes.join(' · ')
}

export function textoBotaoSalvar(novos: number, vinculados: number): string {
  if (!novos && !vinculados) return 'Salvar sem criar inputs'
  const partes: string[] = []
  if (novos) partes.push(`criar ${novos} ${novos === 1 ? 'input' : 'inputs'}`)
  if (vinculados) partes.push(`atualizar ${vinculados}`)
  return `Salvar: ${partes.join(' e ')}`
}
