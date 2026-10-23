import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { gerarPdfInputs, gerarPdfReuniao, limparTexto, nomeArquivoPdf } from '../src/lib/pdf'
import type { Input, Reuniao } from '../src/lib/types'

function input(n: number, extra: Partial<Input> = {}): Input {
  return {
    id: `i${n}`,
    numero: n,
    titulo: `Levantar a margem bruta de franquia de entrada para 2027 (${n})`,
    descricao: 'Simone: qual MB de franquia de entrada para 2027? Comparar com o modelo atual e com a rede de multimarcas.',
    contexto: n % 3 === 0 ? 'Conversa de agenda sobre expansão.' : '',
    origem: 'agenda',
    local: n % 2 ? 'Voo SP-POA' : '',
    dataInput: '2026-10-23',
    area: n % 2 ? 'Expansão & Franquias' : '',
    marca: n % 4 === 0 ? 'Schutz' : '',
    responsaveis: n % 5 === 0 ? [] : ['Simone'],
    prazo: n % 3 === 0 ? '2026-11-04' : '',
    status: n % 7 === 0 ? 'concluido' : 'pendente',
    prioridade: n % 6 === 0 ? 'alta' : 'media',
    observacoes: n % 4 === 1 ? 'Resposta: chegou a ter entre 2.500 e 3.000 pessoas; hoje são cerca de 200. 👏' : '',
    atualizacoes: [{ id: `a${n}`, data: '2026-10-23T12:00:00.000Z', texto: 'Enviado pela Ana.', tipo: 'nota' }],
    criadoEm: '2026-10-23T12:00:00.000Z',
    atualizadoEm: '2026-10-23T12:00:00.000Z',
    ...extra,
  }
}

const reuniao: Reuniao = {
  id: 'r1',
  titulo: 'Reunião no voo SP-POA',
  data: '2026-10-23',
  hora: '',
  local: 'Voo SP-POA',
  origem: 'reuniao',
  participantes: [],
  transcricao: '',
  duracaoSeg: 0,
  estado: 'processada',
  criadoEm: '',
  atualizadoEm: '',
}

const paginas = (pdf: string) => (pdf.match(/\/Type \/Page\b/g) ?? []).length

async function texto(blob: Blob) {
  return Buffer.from(await blob.arrayBuffer()).toString('latin1')
}

describe('PDF', () => {
  it('remove o que a fonte embutida não desenha', () => {
    expect(limparTexto('Ação ★ 👏 — “ok”…\tfim')).toBe('Ação *  — “ok”… fim')
  })

  it('gera nome de arquivo sem acentos', () => {
    expect(nomeArquivoPdf('Plano de ação · Reunião no voo SP-POA', '2026-10-23')).toBe('plano-de-acao-reuniao-no-voo-sp-poa-2026-10-23.pdf')
  })

  it('gera a lista de inputs em várias páginas, com a fonte embutida', async () => {
    const itens = Array.from({ length: 40 }, (_, k) => input(k + 1))
    const blob = gerarPdfInputs({
      sobrelinha: 'Escritório do CEO',
      titulo: 'Inputs',
      acento: 'do CEO',
      descricao: 'Abertos · agrupado por área',
      grupos: [
        ['Expansão & Franquias', itens.filter((i) => i.area)],
        ['Sem área', itens.filter((i) => !i.area)],
      ],
    })
    const pdf = await texto(blob)
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(paginas(pdf)).toBeGreaterThan(2)
    expect(pdf).toContain('Montserrat')
    if (process.env.PDF_SAIDA) fs.writeFileSync(`${process.env.PDF_SAIDA}/teste-inputs.pdf`, Buffer.from(await blob.arrayBuffer()))
  })

  it('gera a ata com plano de ação e o plano sem ata', async () => {
    const comAta: Reuniao = {
      ...reuniao,
      titulo: 'Comitê de expansão',
      participantes: ['Simone', 'Dani'],
      ata: {
        titulo: 'Comitê de expansão',
        resumoExecutivo: 'O CEO retomou o estudo de franqueados com LTV e pediu o plano da loja nova até o fim do mês.',
        participantes: ['CEO', 'Simone', 'Dani'],
        temas: [{ tema: 'Franquias', pontos: ['Estudo com LTV por tempo de rede', 'Ranking por região'] }],
        decisoes: ['Priorizar a loja Schutz no Center Norte.'],
        pontosDeAtencao: ['Prazo curto para a convenção de 08/11.'],
      },
    }
    const itens = [input(21, { reuniaoId: 'r1' }), input(5, { reuniaoId: 'outra' })]
    for (const [r, nome] of [
      [comAta, 'teste-ata'],
      [reuniao, 'teste-plano'],
    ] as const) {
      const blob = gerarPdfReuniao(r, itens)
      const pdf = await texto(blob)
      expect(pdf.startsWith('%PDF-')).toBe(true)
      expect(paginas(pdf)).toBe(1)
      if (process.env.PDF_SAIDA) fs.writeFileSync(`${process.env.PDF_SAIDA}/${nome}.pdf`, Buffer.from(await blob.arrayBuffer()))
    }
  })
})
