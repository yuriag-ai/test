import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { ClipboardList, Download, FileDown, FileUp, Mic, MoreHorizontal, Paperclip, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Cabecalho, Folha, SeletorStatus, SeloPrazo, SeloPrioridade, Vazio, useAviso } from '../components/ui'
import { useListas } from '../hooks/useDados'
import { CEO, EM_ARTIFACT } from '../lib/ambiente'
import { db, mudarStatus } from '../lib/db'
import { exportarCSV, salvarArquivo } from '../lib/exportar'
import { ORIGENS, ROTULO_ORIGEM, ROTULO_STATUS, STATUS } from '../lib/rotulos'
import type { Input, Origem, Status } from '../lib/types'
import { diasAte, formatarData, normalizar } from '../lib/util'

type Rapido = 'abertos' | 'atrasados' | 'sem_responsavel' | 'em_andamento' | 'concluidos' | 'todos'
type Agrupar = 'nenhum' | 'area' | 'responsavel' | 'status' | 'data' | 'marca'
type Ordem = 'numero' | 'prazo' | 'atualizacao'

interface Filtros {
  rapido: Rapido
  areas: string[]
  marcas: string[]
  responsaveis: string[]
  origens: Origem[]
  agrupar: Agrupar
  ordem: Ordem
}

const FILTROS_PADRAO: Filtros = {
  rapido: 'abertos',
  areas: [],
  marcas: [],
  responsaveis: [],
  origens: [],
  agrupar: 'nenhum',
  ordem: 'numero',
}

function lerFiltros(): Filtros {
  try {
    return { ...FILTROS_PADRAO, ...JSON.parse(localStorage.getItem('filtros-inputs') ?? '{}') }
  } catch {
    return FILTROS_PADRAO
  }
}

const ROTULO_AGRUPAR: Record<Agrupar, string> = {
  nenhum: 'Nada',
  area: 'Área',
  responsavel: 'Responsável',
  status: 'Status',
  marca: 'Marca',
  data: 'Data do input',
}

const aberto = (i: Input) => i.status !== 'concluido'
const atrasado = (i: Input) => aberto(i) && Boolean(i.prazo) && diasAte(i.prazo) < 0

const RAPIDOS: { valor: Rapido; rotulo: string; teste: (i: Input) => boolean }[] = [
  { valor: 'abertos', rotulo: 'Abertos', teste: aberto },
  { valor: 'atrasados', rotulo: 'Atrasados', teste: atrasado },
  { valor: 'sem_responsavel', rotulo: 'Sem responsável', teste: (i) => aberto(i) && i.responsaveis.length === 0 },
  { valor: 'em_andamento', rotulo: 'Em andamento', teste: (i) => i.status === 'em_andamento' },
  { valor: 'concluidos', rotulo: 'Realizados', teste: (i) => i.status === 'concluido' },
  { valor: 'todos', rotulo: 'Todos', teste: () => true },
]

export default function Inputs() {
  const navigate = useNavigate()
  const avisar = useAviso()
  const { areas, marcas, nomes } = useListas()
  const inputs = useLiveQuery(() => db.inputs.toArray(), [])
  const comAnexo = useLiveQuery(async () => {
    const chaves = (await db.anexos.orderBy('inputId').keys()) as string[]
    const contagem = new Map<string, number>()
    for (const k of chaves) contagem.set(k, (contagem.get(k) ?? 0) + 1)
    return contagem
  }, [])

  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<Filtros>(lerFiltros)
  const [folhaFiltros, setFolhaFiltros] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('filtros-inputs', JSON.stringify(filtros))
    } catch {
      // armazenamento indisponível
    }
  }, [filtros])

  const lista = inputs ?? []
  const contagens = useMemo(
    () => Object.fromEntries(RAPIDOS.map((r) => [r.valor, lista.filter(r.teste).length])) as Record<Rapido, number>,
    [lista],
  )

  const filtrados = useMemo(() => {
    const termo = normalizar(busca)
    const teste = RAPIDOS.find((r) => r.valor === filtros.rapido)!.teste
    const res = lista.filter((i) => {
      if (!teste(i)) return false
      if (filtros.areas.length && !filtros.areas.includes(i.area)) return false
      if (filtros.marcas.length && !filtros.marcas.includes(i.marca)) return false
      if (filtros.origens.length && !filtros.origens.includes(i.origem)) return false
      if (filtros.responsaveis.length && !i.responsaveis.some((r) => filtros.responsaveis.includes(r))) return false
      if (termo) {
        const alvo = normalizar(
          [i.numero, i.titulo, i.descricao, i.contexto, i.area, i.marca, i.local, i.observacoes, ...i.responsaveis].join(' '),
        )
        if (!termo.split(/\s+/).every((t) => alvo.includes(t))) return false
      }
      return true
    })
    const ordenar: Record<Ordem, (a: Input, b: Input) => number> = {
      numero: (a, b) => b.numero - a.numero,
      prazo: (a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999') || b.numero - a.numero,
      atualizacao: (a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm),
    }
    return res.sort(ordenar[filtros.ordem])
  }, [lista, busca, filtros])

  const grupos = useMemo(() => agrupar(filtrados, filtros.agrupar), [filtrados, filtros.agrupar])
  const filtrosAtivos = filtros.areas.length + filtros.marcas.length + filtros.responsaveis.length + filtros.origens.length

  /** PDF do que está na tela (filtros, busca e agrupamento); sem resultados, de todos os inputs. */
  const baixarPdf = async () => {
    setMenu(false)
    const comFiltro = filtrados.length > 0
    const descricao = [
      comFiltro ? RAPIDOS.find((r) => r.valor === filtros.rapido)!.rotulo : 'Todos os inputs',
      ...(comFiltro ? [...filtros.responsaveis, ...filtros.areas, ...filtros.marcas, ...filtros.origens.map((o) => ROTULO_ORIGEM[o])] : []),
      comFiltro && busca.trim() && `busca “${busca.trim()}”`,
      filtros.agrupar !== 'nenhum' && `agrupado por ${ROTULO_AGRUPAR[filtros.agrupar].toLowerCase()}`,
    ]
      .filter(Boolean)
      .join(' · ')
    try {
      const { gerarPdfInputs, nomeArquivoPdf } = await import('../lib/pdf')
      const blob = gerarPdfInputs({
        sobrelinha: 'Escritório do CEO',
        titulo: 'Inputs',
        acento: 'do CEO',
        descricao,
        grupos: comFiltro ? grupos : agrupar([...lista].sort((a, b) => b.numero - a.numero), filtros.agrupar),
      })
      await salvarArquivo(blob, nomeArquivoPdf('inputs-ceo'))
    } catch (erro) {
      avisar((erro as Error).message)
    }
  }

  if (inputs && inputs.length === 0) {
    return (
      <>
        <Cabecalho sobrelinha="Escritório do CEO" titulo="Inputs" acento="do CEO" logo />
        <Vazio
          icone={<ClipboardList size={28} />}
          titulo="Nenhum input ainda"
          texto={`Envie a transcrição, o resumo ou a lista de inputs ${CEO.de}, ou registre um ponto manualmente.`}
          acao={
            <div className="flex flex-col gap-2.5">
              <Link to="/importar" className="botao-primario">
                <FileUp size={18} /> Importar transcrição, resumo ou lista
              </Link>
              <Link to="/inputs/novo" className="botao-secundario">
                <Plus size={18} /> Novo input manual
              </Link>
              {!EM_ARTIFACT && (
                <Link to="/captura" className="botao-fantasma">
                  <Mic size={18} /> Gravar no celular
                </Link>
              )}
            </div>
          }
        />
      </>
    )
  }

  return (
    <>
      <Cabecalho
        sobrelinha="Escritório do CEO"
        titulo="Inputs"
        acento="do CEO"
        logo
        acoes={
          <button aria-label="Mais opções" className="rounded-full p-2 hover:bg-linho" onClick={() => setMenu(true)}>
            <MoreHorizontal size={22} />
          </button>
        }
      />

      <div className="nao-imprimir space-y-3 px-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nevoa" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por assunto, pessoa, nº…"
              className="campo pl-10"
            />
          </div>
          <button
            aria-label="Filtros"
            onClick={() => setFolhaFiltros(true)}
            className={clsx('relative rounded-md border px-3.5', filtrosAtivos ? 'border-tinta bg-tinta text-papel' : 'border-borda bg-superficie')}
          >
            <SlidersHorizontal size={18} />
            {filtrosAtivos > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-aqua text-[10px] font-black text-black">
                {filtrosAtivos}
              </span>
            )}
          </button>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {RAPIDOS.map((r) => (
            <button
              key={r.valor}
              onClick={() => setFiltros((f) => ({ ...f, rapido: r.valor }))}
              className={clsx(
                'flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-bold transition',
                filtros.rapido === r.valor ? 'border-tinta bg-tinta text-papel' : 'border-borda bg-superficie text-tinta',
              )}
            >
              {r.rotulo}
              {r.valor === 'atrasados' && contagens.atrasados > 0 && filtros.rapido !== r.valor ? (
                <span className="mt-valor">{contagens[r.valor]}</span>
              ) : (
                <span className="font-semibold opacity-60">{contagens[r.valor]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1 space-y-6 px-4">
        {grupos.map(([grupo, itens]) => (
          <section key={grupo}>
            {filtros.agrupar !== 'nenhum' && (
              <h2 className="mb-1 flex items-center justify-between pt-2">
                <span className="mt-bloco">{grupo}</span>
                <span className="text-[12px] font-semibold text-nevoa">{itens.length}</span>
              </h2>
            )}
            <ul>
              {itens.map((i) => (
                <li key={i.id}>
                  <CartaoInput
                    input={i}
                    anexos={comAnexo?.get(i.id) ?? 0}
                    aoMudarStatus={(s) => {
                      void mudarStatus(i.id, s)
                      if (s === 'concluido') avisar(`#${i.numero} marcado como realizado`)
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {inputs && filtrados.length === 0 && (
          <p className="py-12 text-center text-sm text-nevoa">Nenhum input com esses filtros.</p>
        )}
      </div>

      <button
        aria-label="Novo input"
        onClick={() => navigate('/inputs/novo')}
        className="nao-imprimir fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-[max(1rem,calc(50%-17rem))] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-borda bg-superficie text-tinta shadow-flutuante"
      >
        <Plus size={22} />
      </button>

      <Folha aberta={menu} aoFechar={() => setMenu(false)} titulo="Opções">
        <div className="space-y-2">
          <Link to="/importar" className="botao-secundario w-full justify-start">
            <FileUp size={18} /> Importar transcrição, resumo ou lista
          </Link>
          <button className="botao-secundario w-full justify-start" onClick={() => void baixarPdf()}>
            <FileDown size={18} /> Baixar PDF ({filtrados.length || lista.length} itens)
          </button>
          <button
            className="botao-secundario w-full justify-start"
            onClick={() => {
              exportarCSV(filtrados.length ? filtrados : lista).catch((e: Error) => avisar(e.message))
              setMenu(false)
            }}
          >
            <Download size={18} /> Exportar para Excel ({filtrados.length || lista.length} itens)
          </button>
        </div>
      </Folha>

      <Folha aberta={folhaFiltros} aoFechar={() => setFolhaFiltros(false)} titulo="Filtros">
        <div className="space-y-5">
          <GrupoOpcoes
            rotulo="Agrupar por"
            opcoes={Object.entries(ROTULO_AGRUPAR)}
            selecionados={[filtros.agrupar]}
            aoTocar={(v) => setFiltros((f) => ({ ...f, agrupar: v as Agrupar }))}
          />
          <GrupoOpcoes
            rotulo="Ordenar por"
            opcoes={[
              ['numero', 'Mais recentes'],
              ['prazo', 'Prazo'],
              ['atualizacao', 'Última atualização'],
            ]}
            selecionados={[filtros.ordem]}
            aoTocar={(v) => setFiltros((f) => ({ ...f, ordem: v as Ordem }))}
          />
          <GrupoOpcoes
            rotulo="Responsável"
            opcoes={nomes.map((n) => [n, n])}
            selecionados={filtros.responsaveis}
            aoTocar={(v) => setFiltros((f) => ({ ...f, responsaveis: alternar(f.responsaveis, v) }))}
          />
          <GrupoOpcoes
            rotulo="Área"
            opcoes={areas.map((a) => [a, a])}
            selecionados={filtros.areas}
            aoTocar={(v) => setFiltros((f) => ({ ...f, areas: alternar(f.areas, v) }))}
          />
          <GrupoOpcoes
            rotulo="Marca"
            opcoes={marcas.map((m) => [m, m])}
            selecionados={filtros.marcas}
            aoTocar={(v) => setFiltros((f) => ({ ...f, marcas: alternar(f.marcas, v) }))}
          />
          <GrupoOpcoes
            rotulo="Onde foi falado"
            opcoes={ORIGENS.map((o) => [o.valor, o.rotulo])}
            selecionados={filtros.origens}
            aoTocar={(v) => setFiltros((f) => ({ ...f, origens: alternar(f.origens, v as Origem) }))}
          />
          <div className="flex gap-2 pt-2">
            <button
              className="botao-secundario flex-1"
              onClick={() => setFiltros((f) => ({ ...FILTROS_PADRAO, rapido: f.rapido }))}
            >
              <X size={16} /> Limpar
            </button>
            <button className="botao-primario flex-1" onClick={() => setFolhaFiltros(false)}>
              Ver {filtrados.length} inputs
            </button>
          </div>
        </div>
      </Folha>
    </>
  )
}

function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]
}

function GrupoOpcoes({
  rotulo,
  opcoes,
  selecionados,
  aoTocar,
}: {
  rotulo: string
  opcoes: [string, string][]
  selecionados: string[]
  aoTocar: (v: string) => void
}) {
  if (!opcoes.length) return null
  return (
    <div>
      <div className="rotulo">{rotulo}</div>
      <div className="flex flex-wrap gap-2">
        {opcoes.map(([valor, texto]) => (
          <button
            key={valor}
            onClick={() => aoTocar(valor)}
            className={clsx(
              'rounded-md border px-3 py-1.5 text-[13px] font-semibold',
              selecionados.includes(valor) ? 'border-tinta bg-tinta text-papel' : 'border-borda bg-superficie text-tinta',
            )}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  )
}

function agrupar(itens: Input[], modo: Agrupar): [string, Input[]][] {
  if (modo === 'nenhum') return [['', itens]]
  const mapa = new Map<string, Input[]>()
  const por = (chave: string, i: Input) => mapa.set(chave, [...(mapa.get(chave) ?? []), i])
  for (const i of itens) {
    if (modo === 'responsavel') {
      if (!i.responsaveis.length) por('Sem responsável', i)
      else i.responsaveis.forEach((r) => por(r, i))
    } else if (modo === 'area') por(i.area || 'Sem área', i)
    else if (modo === 'marca') por(i.marca || 'Sem marca', i)
    else if (modo === 'status') por(ROTULO_STATUS[i.status], i)
    else por(formatarData(i.dataInput, true), i)
  }
  const entradas = [...mapa.entries()]
  if (modo === 'status') {
    const ordem = STATUS.map((s) => s.rotulo)
    return entradas.sort((a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]))
  }
  if (modo === 'data') return entradas.sort((a, b) => b[1][0].dataInput.localeCompare(a[1][0].dataInput))
  return entradas.sort((a, b) => {
    if (a[0].startsWith('Sem ')) return 1
    if (b[0].startsWith('Sem ')) return -1
    return a[0].localeCompare(b[0], 'pt-BR')
  })
}

/** Linha numerada do padrão: número em destaque, título, metadados e status, separadas por régua fina. */
export function CartaoInput({
  input: i,
  anexos = 0,
  aoMudarStatus,
}: {
  input: Input
  anexos?: number
  aoMudarStatus: (s: Status) => void
}) {
  const navigate = useNavigate()
  const concluido = i.status === 'concluido'
  return (
    <article onClick={() => navigate(`/inputs/${i.id}`)} className="linha flex cursor-pointer gap-3 py-4 transition active:bg-linho">
      <div className={clsx('w-11 shrink-0 text-[20px] font-black leading-none tabular-nums', concluido && 'text-nevoa')}>
        {String(i.numero).padStart(2, '0')}.
      </div>
      <div className="min-w-0 flex-1">
        <h3 className={clsx('text-[15px] font-bold leading-snug', concluido && 'text-nevoa line-through decoration-borda')}>
          {i.titulo}
        </h3>
        <div className="mt-1 truncate text-[12px] text-nevoa">
          {[ROTULO_ORIGEM[i.origem], formatarData(i.dataInput), i.local].filter(Boolean).join(' · ')}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {i.responsaveis.length ? (
            i.responsaveis.map((r) => (
              <span key={r} className="chip bg-linho text-tinta">
                {r}
              </span>
            ))
          ) : (
            <span className="chip bg-pendente-claro text-tinta">Sem responsável</span>
          )}
          {i.area && <span className="px-1 text-[12px] font-semibold text-grafite">{i.area}</span>}
          {i.marca && <span className="chip border border-borda text-[11px] uppercase tracking-wide text-tinta">{i.marca}</span>}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <SeletorStatus status={i.status} aoMudar={aoMudarStatus} />
          <SeloPrioridade prioridade={i.prioridade} />
          <SeloPrazo prazo={i.prazo} concluido={concluido} />
          <span className="flex-1" />
          {anexos > 0 && (
            <span className="flex items-center gap-0.5 text-[12px] text-nevoa">
              <Paperclip size={13} /> {anexos}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
