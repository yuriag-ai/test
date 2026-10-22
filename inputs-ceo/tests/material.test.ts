import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { extrairTextoDocx } from '../src/lib/arquivos'
import { interpretarItem } from '../src/lib/importador'
import { detectarTipo, extrairItensDeResumo, interpretarLocalmente, limparLegenda } from '../src/lib/material'
import { AREAS_PADRAO, MARCAS_PADRAO } from '../src/lib/rotulos'
import { maisParecido, similaridade, sugerirPessoa } from '../src/lib/similaridade'

const opcoes = { dataReferencia: '2026-10-22', areas: AREAS_PADRAO, marcas: MARCAS_PADRAO } // quinta-feira

const TRANSCRICAO = `Alexandre Birman 00:00:05
Bom dia a todos. Vamos começar pelo resultado das lojas de rua.
Marina Costa 00:00:21
O sell-out ficou acima da meta em São Paulo, mas abaixo no Rio.
Alexandre Birman 00:01:02
Marina, me traz até sexta o ranking das lojas por região.
Rafael Lima 00:01:40
Posso cruzar com o estoque disponível.
Alexandre Birman 00:02:10
Ótimo, Rafael. E vamos rever a vitrine da loja de Curitiba.`

const RESUMO = `# Reunião de produto — 20/10

## Resumo
Discutimos a coleção de verão e o calendário de lançamentos.

## Decisões
- Antecipar o lançamento da linha casual

## Próximos passos
- [ ] Marina vai enviar o calendário revisado até sexta
- [x] Responsável: Rafael — validar custos com fornecedores
- Levantar referências de vitrine @bia.souza
`

const LISTA = `1. Carla: levantar o investimento das novas franquias
2. Revisar o layout da vitrine | Renato
3. Relatório semanal. Enviado.`

describe('detectarTipo', () => {
  it('reconhece transcrição, resumo e lista', () => {
    expect(detectarTipo(TRANSCRICAO)).toBe('transcricao')
    expect(detectarTipo(RESUMO)).toBe('resumo')
    expect(detectarTipo(LISTA)).toBe('lista')
  })

  it('reconhece legendas SRT/VTT como transcrição', () => {
    expect(detectarTipo('1\n00:00:01,000 --> 00:00:04,000\nBom dia\n')).toBe('transcricao')
  })
})

describe('limparLegenda', () => {
  it('converte VTT do Teams em linhas "Nome: fala", juntando falas seguidas', () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
<v Marina Costa>Bom dia.</v>

2
00:00:03.500 --> 00:00:06.000
<v Marina Costa>O ranking sai até sexta.</v>

3
00:00:06.500 --> 00:00:08.000
<v Rafael Lima>Combinado.</v>`
    expect(limparLegenda(vtt)).toBe('Marina Costa: Bom dia. O ranking sai até sexta.\nRafael Lima: Combinado.')
  })

  it('remove numeração e tempos de SRT', () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,000\nPrimeira fala\n\n2\n00:00:02,500 --> 00:00:04,000\nSegunda fala'
    expect(limparLegenda(srt)).toBe('Primeira fala Segunda fala')
  })
})

describe('extrairItensDeResumo / interpretarLocalmente', () => {
  it('lê só a seção de próximos passos de um resumo', () => {
    const itens = extrairItensDeResumo(RESUMO)
    expect(itens).toHaveLength(3)
    expect(itens[0]).toContain('Marina vai enviar')
  })

  it('entende checklist, "Responsável:", "@menção", "Fulano vai…" e "até sexta"', () => {
    const [a, b, c] = interpretarLocalmente(RESUMO, 'resumo', opcoes)
    expect(a.responsaveis).toEqual(['Marina'])
    expect(a.prazo).toBe('2026-10-23')
    expect(a.status).toBe('pendente')
    expect(b.responsaveis).toEqual(['Rafael'])
    expect(b.status).toBe('concluido')
    expect(b.titulo).toBe('Validar custos com fornecedores')
    expect(c.responsaveis).toEqual(['Bia Souza'])
  })

  it('transcrição sem lista de ações não gera itens localmente', () => {
    expect(interpretarLocalmente(TRANSCRICAO, 'transcricao', opcoes)).toEqual([])
  })
})

describe('prazos relativos', () => {
  it('converte dias da semana, amanhã e "até dia N"', () => {
    expect(interpretarItem('Enviar até segunda', opcoes).prazo).toBe('2026-10-26')
    expect(interpretarItem('Trazer amanhã', opcoes).prazo).toBe('2026-10-23')
    expect(interpretarItem('Fechar até dia 5', opcoes).prazo).toBe('2026-11-05')
    expect(interpretarItem('Fechar até dia 30', opcoes).prazo).toBe('2026-10-30')
  })

  it('ignora e-mails ao procurar @menções', () => {
    expect(interpretarItem('Mandar para joao@empresa.com', opcoes).responsaveis).toEqual([])
  })
})

describe('similaridade', () => {
  it('aproxima itens do mesmo assunto escritos de jeitos diferentes', () => {
    const existente = { titulo: 'Estudo de franqueados por tempo de rede', descricao: 'Quem performa melhor por anos na rede?' }
    const novo = { titulo: 'Levantar estudo dos franqueados e tempo de rede', descricao: '' }
    const outro = { titulo: 'Pesquisa de preço dos concorrentes', descricao: '' }
    expect(similaridade(novo, existente)).toBeGreaterThanOrEqual(0.5)
    expect(similaridade(outro, existente)).toBeLessThan(0.3)
    expect(maisParecido(novo, [{ ...outro, id: 1 }, { ...existente, id: 2 }])?.item.id).toBe(2)
  })
})

describe('sugerirPessoa', () => {
  const conhecidos = ['Priscila Souza', 'Antônio Lima', 'Daniela Reis']
  it('sugere o cadastro para apelidos e variações', () => {
    expect(sugerirPessoa('Pri', conhecidos)).toBe('Priscila Souza')
    expect(sugerirPessoa('Dani', conhecidos)).toBe('Daniela Reis')
    expect(sugerirPessoa('Antonio', conhecidos)).toBe('Antônio Lima')
  })
  it('não sugere para nomes já cadastrados ou sem parecido', () => {
    expect(sugerirPessoa('antônio lima', conhecidos)).toBeNull()
    expect(sugerirPessoa('Gustavo', conhecidos)).toBeNull()
  })
})

describe('extrairTextoDocx', () => {
  it('lê parágrafos e marca itens de lista', () => {
    const xml = `<?xml version="1.0"?><w:document><w:body>
      <w:p><w:r><w:t>Reunião de produto</w:t></w:r></w:p>
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">Enviar calendário </w:t></w:r><w:r><w:t>&amp; custos</w:t></w:r></w:p>
      <w:p><w:r><w:t>Fim</w:t></w:r></w:p>
    </w:body></w:document>`
    const docx = zipSync({ 'word/document.xml': strToU8(xml), '[Content_Types].xml': strToU8('<Types/>') })
    expect(extrairTextoDocx(docx)).toBe('Reunião de produto\n- Enviar calendário & custos\nFim')
  })
})
