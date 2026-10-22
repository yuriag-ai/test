import { describe, expect, it } from 'vitest'
import { dividirItens, importarLista, interpretarItem } from '../src/lib/importador'
import { AREAS_PADRAO, MARCAS_PADRAO } from '../src/lib/rotulos'

const opcoes = { dataReferencia: '2026-10-22', areas: AREAS_PADRAO, marcas: MARCAS_PADRAO }
const item = (texto: string) => interpretarItem(texto, opcoes)

describe('dividirItens', () => {
  it('separa itens numerados e junta linhas de continuação', () => {
    const texto = '1. Primeiro item\ncontinua aqui\n\n 2) Segundo item\n3 - Terceiro'
    expect(dividirItens(texto)).toEqual(['Primeiro item continua aqui', 'Segundo item', 'Terceiro'])
  })

  it('sem numeração, cada linha vira um item', () => {
    expect(dividirItens('Item A\nItem B\n\nItem C')).toEqual(['Item A', 'Item B', 'Item C'])
  })
})

describe('interpretarItem', () => {
  it('reconhece "Nome: pedido"', () => {
    const r = item('Carla: Qual o investimento inicial de uma franquia em 2027?')
    expect(r.responsaveis).toEqual(['Carla'])
    expect(r.titulo).toBe('Qual o investimento inicial de uma franquia em 2027?')
    expect(r.area).toBe('Expansão & Franquias')
  })

  it('reconhece responsáveis depois de "|", inclusive múltiplos', () => {
    expect(item('Revisar o contrato de locação do galpão | Júlia & Marcos').responsaveis).toEqual(['Júlia', 'Marcos'])
    expect(item('Estudar abertura de loja no shopping | Bia Souza').responsaveis).toEqual(['Bia Souza'])
  })

  it('ignora segmentos após "|" que não são nomes', () => {
    const r = item('Squads de loja | Time vitrine, Time eventos e etc. Criar um nome para isso.')
    expect(r.responsaveis).toEqual([])
  })

  it('reconhece "para o time de ..." como responsável', () => {
    expect(item('Enviar fotos da coleção | Para o time de produto Schutz').responsaveis).toEqual([
      'Time de produto Schutz',
    ])
  })

  it('reconhece "puxar com" / "avaliar com o"', () => {
    expect(item('Vitrine nova | Puxar com Renato. Trazer referências.').responsaveis).toEqual(['Renato'])
    expect(item('Avaliar com o Paulo o novo layout da vitrine').responsaveis).toEqual(['Paulo'])
  })

  it('não confunde marca com responsável', () => {
    const r = item('Levantar a conversão do e-commerce | Arezzo')
    expect(r.responsaveis).toEqual([])
    expect(r.marca).toBe('Arezzo')
  })

  it('detecta status ao final do texto', () => {
    expect(item('Material da reunião. Enviado.').status).toBe('concluido')
    expect(item('Rever critérios de incentivo. Em andamento.').status).toBe('em_andamento')
    expect(item('Enviar o material para a diretoria').status).toBe('pendente')
  })

  it('usa "enviado pela X" como responsável quando não há outro', () => {
    const r = item('Relatório de vendas da semana. Enviado pela Lia.')
    expect(r.status).toBe('concluido')
    expect(r.responsaveis).toEqual(['Lia'])
  })

  it('converte dd.mm e dd/mm na próxima data a partir da referência', () => {
    expect(item('Entregar estudo em 05.11').prazo).toBe('2026-11-05')
    expect(item('Levar na reunião de 12/11').prazo).toBe('2026-11-12')
    expect(item('Revisar até 15/02').prazo).toBe('2027-02-15')
    expect(item('Campanha de 2012 como referência').prazo).toBeNull()
  })

  it('marca prioridade alta para problemas de qualidade', () => {
    const r = item('Problema de defeito no recebimento da coleção')
    expect(r.prioridade).toBe('alta')
    expect(r.area).toBe('Qualidade')
  })

  it('encurta títulos longos', () => {
    const r = item('Solicitar e revisar integralmente o contrato de aluguel, as regras do shopping e os horários de carga, incluindo licenças.')
    expect(r.titulo).toBe('Solicitar e revisar integralmente o contrato de aluguel…')
    expect(r.descricao).toContain('incluindo licenças')
  })
})

describe('importarLista', () => {
  it('gera uma ação por item, na ordem', () => {
    const r = importarLista('1. Ana: Item um\n2. Item dois | Bruno\n3. Item três. Enviado.', opcoes)
    expect(r.map((a) => a.responsaveis)).toEqual([['Ana'], ['Bruno'], []])
    expect(r[2].status).toBe('concluido')
  })
})
