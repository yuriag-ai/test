import { EM_ARTIFACT } from './ambiente'
import { criarInputs, criarReuniao, db } from './db'
import { agoraISO, novoId, somarDiasISO } from './util'

/**
 * Dados fictícios para quem abre o link de teste pela primeira vez ver o app funcionando.
 * Ficam marcados em `config.exemplos` e saem com um toque ("Remover exemplos").
 */

interface RegistroExemplos {
  inputs: string[]
  reunioes: string[]
}

let semeando: Promise<void> | null = null

export function semearExemplos(): Promise<void> {
  if (!EM_ARTIFACT) return Promise.resolve()
  semeando ??= semear()
  return semeando
}

async function semear() {
  if (await db.config.get('exemplos-semeados')) return
  await db.config.put({ chave: 'exemplos-semeados', valor: true })
  if ((await db.inputs.count()) > 0) return

  const ontem = somarDiasISO(-1)
  const reuniao = await criarReuniao({
    titulo: 'Comitê de Varejo',
    data: ontem,
    hora: '09:30',
    local: 'Escritório SP',
    origem: 'reuniao',
    participantes: ['Marina Costa', 'Rafael Lima', 'Bia Souza'],
    estado: 'processada',
    modo: 'ata',
    transcricao: [
      'Marina Costa: O sell-out das lojas de rua ficou acima da meta em São Paulo e abaixo no Sul.',
      'CEO: Rafael, me traz o ranking de sell-out por região até sexta.',
      'Rafael Lima: Combinado, cruzo com o estoque disponível.',
      'CEO: E a loja de Curitiba está com a conversão caindo. Bia, vamos rever a vitrine antes da coleção de verão.',
      'Bia Souza: Faço a proposta nesta semana.',
    ].join('\n'),
    ata: {
      titulo: 'Comitê de Varejo',
      resumoExecutivo:
        'O comitê revisou o sell-out das lojas de rua e a preparação para a coleção de verão. O CEO pediu o ranking por região e a revisão da vitrine da loja de Curitiba, que ficou abaixo da meta.',
      participantes: ['CEO', 'Marina Costa', 'Rafael Lima', 'Bia Souza'],
      temas: [
        { tema: 'Performance das lojas', pontos: ['Sell-out acima da meta em São Paulo e abaixo no Sul', 'Loja de Curitiba com conversão em queda'] },
        { tema: 'Coleção de verão', pontos: ['Lançamento mantido para a primeira quinzena de novembro'] },
      ],
      decisoes: ['Antecipar a troca de vitrine da loja de Curitiba'],
      pontosDeAtencao: ['Atraso no recebimento de parte da coleção de verão'],
    },
  })

  const daReuniao = { reuniaoId: reuniao.id, origem: 'reuniao' as const, dataInput: ontem, local: 'Escritório SP' }
  const criados = await criarInputs([
    {
      ...daReuniao,
      titulo: 'Trazer o ranking de sell-out por região',
      descricao: 'Ranking de sell-out por região, cruzado com o estoque disponível.',
      responsaveis: ['Rafael Lima'],
      area: 'Comercial',
      prazo: somarDiasISO(2),
      status: 'em_andamento',
      citacao: 'Rafael, me traz o ranking de sell-out por região até sexta.',
    },
    {
      ...daReuniao,
      titulo: 'Rever a vitrine da loja de Curitiba',
      descricao: 'Proposta de nova vitrine antes da coleção de verão; a conversão da loja está caindo.',
      responsaveis: ['Bia Souza'],
      area: 'Varejo',
      prazo: somarDiasISO(5),
      prioridade: 'alta',
    },
    {
      titulo: 'Levantar a margem bruta das franquias abertas em 2026',
      descricao: 'Qual a margem bruta das franquias abertas este ano, comparada com as lojas próprias?',
      responsaveis: ['Carla Mendes'],
      area: 'Expansão & Franquias',
      prazo: somarDiasISO(9),
      dataInput: somarDiasISO(-3),
    },
    {
      titulo: 'Consolidar o orçamento da campanha de fim de ano',
      descricao: 'Orçamento consolidado da campanha de fim de ano.',
      responsaveis: ['Juliana Prado'],
      area: 'Marketing',
      status: 'concluido',
      dataInput: somarDiasISO(-6),
      atualizacoes: [
        { id: novoId(), data: agoraISO(), texto: 'Input registrado', tipo: 'sistema' },
        { id: novoId(), data: agoraISO(), texto: 'Enviado por e-mail para o CEO', tipo: 'nota' },
      ],
    },
    {
      titulo: 'Pesquisa de preço dos concorrentes do canal multimarca',
      descricao: 'Pesquisa de preço das principais marcas concorrentes no canal multimarca.',
      area: 'Inteligência de Mercado',
      dataInput: somarDiasISO(-3),
    },
    {
      titulo: 'Resolver o atraso no recebimento da coleção de verão',
      descricao: 'Parte da coleção de verão chegou atrasada na loja; entender a causa e o impacto no lançamento.',
      area: 'Supply & Logística',
      prioridade: 'alta',
      prazo: somarDiasISO(-1),
      origem: 'visita_loja',
      local: 'Loja Curitiba',
      dataInput: somarDiasISO(-4),
    },
    {
      titulo: 'Revisar o contrato de locação do novo centro de distribuição',
      descricao: 'Revisar contrato, regras do condomínio e licenças do novo centro de distribuição.',
      responsaveis: ['Renato Alves'],
      area: 'Jurídico',
      prazo: somarDiasISO(14),
      dataInput: somarDiasISO(-2),
    },
    {
      titulo: 'Estudo de franqueados por tempo de rede e LTV',
      descricao: 'Quem performa melhor por tempo de rede? Trazer em escala de anos, com LTV.',
      responsaveis: ['Carla Mendes'],
      area: 'Expansão & Franquias',
      dataInput: somarDiasISO(-3),
    },
  ])
  const registro: RegistroExemplos = { inputs: criados.map((i) => i.id), reunioes: [reuniao.id] }
  await db.config.put({ chave: 'exemplos', valor: registro })
}

export async function removerExemplos() {
  const registro = (await db.config.get('exemplos'))?.valor as RegistroExemplos | undefined
  if (!registro) return
  await db.transaction('rw', [db.inputs, db.anexos, db.reunioes, db.audio, db.pessoas, db.config], async () => {
    const exemplos = await db.inputs.bulkGet(registro.inputs)
    await db.anexos.where('inputId').anyOf(registro.inputs).delete()
    await db.inputs.bulkDelete(registro.inputs)
    await db.audio.where('reuniaoId').anyOf(registro.reunioes).delete()
    await db.reunioes.bulkDelete(registro.reunioes)
    await db.config.delete('exemplos')
    // Tira do cadastro só as pessoas que apareciam apenas nos exemplos
    const emUso = new Set((await db.inputs.toArray()).flatMap((i) => i.responsaveis))
    const soDosExemplos = new Set(exemplos.flatMap((i) => i?.responsaveis ?? []).filter((n) => !emUso.has(n)))
    await db.pessoas.filter((p) => soDosExemplos.has(p.nome)).delete()
  })
}
