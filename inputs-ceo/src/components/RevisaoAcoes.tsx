import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronDown, Copy, Link2, ListChecks, Merge, Plus, Quote, Trash2, Undo2, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useListas } from '../hooks/useDados'
import { db } from '../lib/db'
import { PRIORIDADES, ROTULO_STATUS } from '../lib/rotulos'
import { maisParecido, pessoaConhecida, sugerirPessoa } from '../lib/similaridade'
import type { AcaoProposta, AcaoRevisavel, Input, Prioridade } from '../lib/types'
import { formatarData, novoId, unicos } from '../lib/util'
import { AreaTexto, CampoLista, CampoPessoas, Folha, useConfirmar } from './ui'

export type { AcaoRevisavel }

export function paraRevisao(acoes: AcaoProposta[]): AcaoRevisavel[] {
  return acoes.map((a) => ({ ...a, chave: novoId(), incluir: true }))
}

function acaoVazia(): AcaoRevisavel {
  return {
    chave: novoId(),
    incluir: true,
    titulo: '',
    descricao: '',
    contexto: '',
    responsaveis: [],
    area: null,
    marca: null,
    prazo: null,
    prioridade: 'media',
    status: 'pendente',
    citacao: null,
  }
}

interface Analise {
  existente: { item: Input; nota: number } | null
  naLista: { item: AcaoRevisavel; nota: number; posicao: number } | null
  vinculado: Input | null
  nomesNovos: { nome: string; sugestao: string | null }[]
  semResponsavel: boolean
  semPrazo: boolean
  atencao: boolean
}

type Filtro = 'todos' | 'atencao' | 'sem_responsavel' | 'sem_prazo' | 'repetidos'

function useAnalise(acoes: AcaoRevisavel[]): Analise[] {
  const inputs = useLiveQuery(() => db.inputs.toArray(), []) ?? []
  const { nomes } = useListas()
  return useMemo(() => {
    const porId = new Map(inputs.map((i) => [i.id, i]))
    return acoes.map((a, i) => {
      const texto = { titulo: a.titulo, descricao: a.descricao }
      const existente = a.vinculo || a.manterSeparado ? null : maisParecido(texto, inputs)
      const anteriores = acoes.slice(0, i).filter((x) => x.incluir)
      const naListaBruto = a.manterSeparado ? null : maisParecido(texto, anteriores)
      const naLista = naListaBruto ? { ...naListaBruto, posicao: acoes.indexOf(naListaBruto.item) + 1 } : null
      const nomesNovos = a.responsaveis
        .filter((n) => !pessoaConhecida(n, nomes))
        .map((nome) => ({ nome, sugestao: sugerirPessoa(nome, nomes) }))
      const semResponsavel = a.responsaveis.length === 0
      const semPrazo = !a.prazo
      return {
        existente,
        naLista,
        vinculado: a.vinculo ? (porId.get(a.vinculo) ?? null) : null,
        nomesNovos,
        semResponsavel,
        semPrazo,
        atencao: a.incluir && (semResponsavel || Boolean(existente) || Boolean(naLista) || nomesNovos.some((n) => n.sugestao)),
      }
    })
  }, [acoes, inputs, nomes])
}

/**
 * Revisor de ações propostas (pela IA ou pelo importador) antes de virarem inputs:
 * filtros do que precisa de atenção, edição em lote, repetidos e nomes novos.
 */
export function RevisaoAcoes({ acoes, aoMudar }: { acoes: AcaoRevisavel[]; aoMudar: (acoes: AcaoRevisavel[]) => void }) {
  const analise = useAnalise(acoes)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [selecionando, setSelecionando] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [folhaLote, setFolhaLote] = useState(false)
  const confirmar = useConfirmar()

  const atualizar = (chave: string, mudancas: Partial<AcaoRevisavel>) =>
    aoMudar(acoes.map((a) => (a.chave === chave ? { ...a, ...mudancas } : a)))
  const remover = (chaves: Set<string>) => aoMudar(acoes.filter((a) => !chaves.has(a.chave)))
  const duplicar = (chave: string) => {
    const i = acoes.findIndex((a) => a.chave === chave)
    const copia = { ...acoes[i], chave: novoId(), vinculo: undefined, manterSeparado: true }
    aoMudar([...acoes.slice(0, i + 1), copia, ...acoes.slice(i + 1)])
  }
  const juntar = (origem: AcaoRevisavel, destino: AcaoRevisavel) => {
    const descricao = destino.descricao.includes(origem.descricao) ? destino.descricao : `${destino.descricao}\n${origem.descricao}`
    aoMudar(
      acoes
        .filter((a) => a.chave !== origem.chave)
        .map((a) =>
          a.chave === destino.chave
            ? {
                ...a,
                descricao,
                responsaveis: unicos([...a.responsaveis, ...origem.responsaveis]),
                prazo: a.prazo ?? origem.prazo,
                prioridade: a.prioridade === 'alta' || origem.prioridade === 'alta' ? 'alta' : a.prioridade,
              }
            : a,
        ),
    )
  }

  const contagem: Record<Filtro, number> = {
    todos: acoes.length,
    atencao: analise.filter((x) => x.atencao).length,
    sem_responsavel: analise.filter((x, i) => acoes[i].incluir && x.semResponsavel).length,
    sem_prazo: analise.filter((x, i) => acoes[i].incluir && x.semPrazo).length,
    repetidos: analise.filter((x, i) => acoes[i].incluir && (x.existente || x.naLista || x.vinculado)).length,
  }
  const visiveis = acoes
    .map((acao, i) => ({ acao, analise: analise[i], posicao: i + 1 }))
    .filter(({ acao, analise: an }) => {
      if (filtro === 'atencao') return an.atencao
      if (filtro === 'sem_responsavel') return acao.incluir && an.semResponsavel
      if (filtro === 'sem_prazo') return acao.incluir && an.semPrazo
      if (filtro === 'repetidos') return acao.incluir && (an.existente || an.naLista || an.vinculado)
      return true
    })

  const marcadas = acoes.filter((a) => a.incluir).length
  const alternarSelecao = (chave: string) =>
    setSelecionados((s) => {
      const novo = new Set(s)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })
  const sairSelecao = () => {
    setSelecionando(false)
    setSelecionados(new Set())
  }

  return (
    <div>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {(
          [
            ['todos', 'Todos'],
            ['atencao', 'Precisam de atenção'],
            ['sem_responsavel', 'Sem responsável'],
            ['sem_prazo', 'Sem prazo'],
            ['repetidos', 'Repetidos'],
          ] as [Filtro, string][]
        ).map(([valor, rotulo]) =>
          valor !== 'todos' && contagem[valor] === 0 && filtro !== valor ? null : (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={clsx(
                'shrink-0 rounded-md border px-3 py-1.5 text-[13px] font-bold',
                filtro === valor
                  ? 'border-tinta bg-tinta text-papel'
                  : valor === 'atencao'
                    ? 'border-rose bg-rose-claro text-tinta'
                    : 'border-borda bg-superficie text-grafite',
              )}
            >
              {rotulo} <span className="opacity-60">{contagem[valor]}</span>
            </button>
          ),
        )}
      </div>

      <div className="mb-2 flex items-center gap-1">
        <span className="flex-1 whitespace-nowrap text-[13px] text-grafite">
          {marcadas} de {acoes.length} marcadas
        </span>
        <button
          className="rounded-md px-2.5 py-1.5 text-[13px] font-bold text-tinta hover:bg-linho"
          onClick={() => aoMudar(acoes.map((a) => ({ ...a, incluir: marcadas < acoes.length })))}
        >
          {marcadas < acoes.length ? 'Marcar todas' : 'Desmarcar'}
        </button>
        <button
          className={clsx('flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] font-bold', selecionando ? 'bg-tinta text-papel' : 'text-tinta hover:bg-linho')}
          onClick={() => (selecionando ? sairSelecao() : setSelecionando(true))}
        >
          <ListChecks size={15} /> {selecionando ? 'Concluir' : 'Editar várias'}
        </button>
      </div>

      <ol className="border-t border-regua">
        {visiveis.map(({ acao, analise: an, posicao }) => (
          <ItemRevisao
            key={acao.chave}
            posicao={posicao}
            acao={acao}
            analise={an}
            selecionando={selecionando}
            selecionado={selecionados.has(acao.chave)}
            aoSelecionar={() => alternarSelecao(acao.chave)}
            aoMudar={(m) => atualizar(acao.chave, m)}
            aoRemover={() => remover(new Set([acao.chave]))}
            aoDuplicar={() => duplicar(acao.chave)}
            aoJuntar={() => an.naLista && juntar(acao, an.naLista.item)}
          />
        ))}
      </ol>
      {visiveis.length === 0 && <p className="py-8 text-center text-sm text-nevoa">Nada neste filtro.</p>}

      <button
        onClick={() => {
          setFiltro('todos')
          aoMudar([...acoes, acaoVazia()])
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-borda py-3.5 text-sm font-bold text-grafite"
      >
        <Plus size={17} /> Adicionar item
      </button>

      {selecionando && (
        <div className="nao-imprimir fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[25] mx-auto max-w-xl px-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-tinta p-2 text-papel shadow-flutuante">
            <button
              className="px-2 text-[13px] font-bold underline-offset-2 hover:underline"
              onClick={() =>
                setSelecionados(selecionados.size === visiveis.length ? new Set() : new Set(visiveis.map((v) => v.acao.chave)))
              }
            >
              {selecionados.size === visiveis.length && visiveis.length ? 'Nenhum' : 'Todos'}
            </button>
            <span className="flex-1 text-center text-[13px]">{selecionados.size} selecionados</span>
            <button
              disabled={!selecionados.size}
              className="rounded-md bg-aqua px-3 py-2 text-[13px] font-bold text-black disabled:opacity-40"
              onClick={() => setFolhaLote(true)}
            >
              Editar
            </button>
            <button
              aria-label="Remover selecionados"
              disabled={!selecionados.size}
              className="rounded-md p-2 text-papel disabled:opacity-40"
              onClick={async () => {
                const ok = await confirmar({ titulo: `Remover ${selecionados.size} itens da revisão?`, botao: 'Remover', perigo: true })
                if (!ok) return
                remover(selecionados)
                sairSelecao()
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      <EdicaoEmLote
        aberta={folhaLote}
        quantidade={selecionados.size}
        aoFechar={() => setFolhaLote(false)}
        aoAplicar={(mudancas) => {
          aoMudar(
            acoes.map((a) => {
              if (!selecionados.has(a.chave)) return a
              const { adicionarResponsaveis, ...resto } = mudancas
              return {
                ...a,
                ...resto,
                responsaveis: adicionarResponsaveis.length ? unicos([...a.responsaveis, ...adicionarResponsaveis]) : a.responsaveis,
              }
            }),
          )
          setFolhaLote(false)
          sairSelecao()
        }}
      />
    </div>
  )
}

function ItemRevisao({
  acao: a,
  analise: an,
  posicao,
  selecionando,
  selecionado,
  aoSelecionar,
  aoMudar,
  aoRemover,
  aoDuplicar,
  aoJuntar,
}: {
  acao: AcaoRevisavel
  analise: Analise
  posicao: number
  selecionando: boolean
  selecionado: boolean
  aoSelecionar: () => void
  aoMudar: (m: Partial<AcaoRevisavel>) => void
  aoRemover: () => void
  aoDuplicar: () => void
  aoJuntar: () => void
}) {
  const [aberto, setAberto] = useState(!a.titulo)
  const [verTrecho, setVerTrecho] = useState(false)
  const { areas, marcas, nomes } = useListas()
  const novos = new Set(an.nomesNovos.map((n) => n.nome))
  const sugestao = an.nomesNovos.find((n) => n.sugestao)

  return (
    <li
      onClick={selecionando ? aoSelecionar : undefined}
      className={clsx(
        'linha py-3.5 transition',
        !a.incluir && !selecionando && 'opacity-50',
        selecionando && 'cursor-pointer',
        selecionado && '-mx-4 bg-aqua-claro px-4',
      )}
    >
      <div className="flex gap-3">
        {selecionando ? (
          <span
            className={clsx(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
              selecionado ? 'border-tinta bg-tinta text-papel' : 'border-borda bg-superficie',
            )}
          >
            {selecionado && <Check size={14} strokeWidth={3} />}
          </span>
        ) : (
          <button
            aria-label={a.incluir ? 'Não salvar esta ação' : 'Salvar esta ação'}
            onClick={() => aoMudar({ incluir: !a.incluir })}
            className={clsx(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2',
              a.incluir ? 'border-tinta bg-tinta text-papel' : 'border-borda bg-superficie',
            )}
          >
            {a.incluir && <Check size={15} strokeWidth={3} />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black leading-none">{String(posicao).padStart(2, '0')}.</span>
            {an.vinculado && (
              <span className="mt-bloco inline-flex items-center gap-1">
                <Link2 size={11} /> Atualiza o #{an.vinculado.numero}
              </span>
            )}
          </div>
          <AreaTexto
            value={a.titulo}
            readOnly={selecionando}
            placeholder="Título da ação"
            onChange={(e) => aoMudar({ titulo: e.target.value })}
            className="-mx-1 mt-1 w-full resize-none rounded-md bg-transparent px-1 text-[15px] font-bold leading-snug outline-none placeholder:text-nevoa focus:bg-linho"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {a.responsaveis.length ? (
              a.responsaveis.map((r) => (
                <span key={r} className={clsx('chip text-tinta', novos.has(r) ? 'border border-dashed border-tinta/40 bg-superficie' : 'bg-linho')}>
                  {r}
                  {novos.has(r) && <span className="bg-rose px-1 text-[9px] font-black uppercase leading-[14px] text-black">novo</span>}
                </span>
              ))
            ) : (
              <span className="chip bg-pendente-claro text-tinta">Sem responsável</span>
            )}
            {a.area && <span className="chip text-grafite">{a.area}</span>}
            {a.marca && <span className="chip border border-borda text-[11px] uppercase tracking-wide text-tinta">{a.marca}</span>}
            {a.prazo && <span className="chip text-grafite">até {formatarData(a.prazo)}</span>}
            {a.status !== 'pendente' && (
              <span className={clsx('chip text-tinta', a.status === 'concluido' ? 'bg-concluido-claro' : 'bg-andamento-claro')}>
                {ROTULO_STATUS[a.status]}
              </span>
            )}
            {a.prioridade === 'alta' && <span className="mt-chave">Alta</span>}
          </div>

          {!selecionando && a.incluir && (
            <div className="mt-2 space-y-2">
              {an.vinculado && (
                <Alerta
                  tom="info"
                  texto={
                    <>
                      Em vez de criar um novo, adiciona uma atualização ao <strong>#{an.vinculado.numero}</strong> ·{' '}
                      {an.vinculado.titulo}
                    </>
                  }
                  acoes={[{ rotulo: 'Desfazer', icone: <Undo2 size={13} />, onClick: () => aoMudar({ vinculo: undefined }) }]}
                />
              )}
              {an.existente && (
                <Alerta
                  tom="atencao"
                  texto={
                    <>
                      Parece o <strong>#{an.existente.item.numero}</strong> · {an.existente.item.titulo}{' '}
                      <span className="text-nevoa">({ROTULO_STATUS[an.existente.item.status].toLowerCase()})</span>
                    </>
                  }
                  acoes={[
                    { rotulo: `Atualizar o #${an.existente.item.numero}`, icone: <Link2 size={13} />, onClick: () => aoMudar({ vinculo: an.existente!.item.id }) },
                    { rotulo: 'É novo', onClick: () => aoMudar({ manterSeparado: true }) },
                  ]}
                />
              )}
              {an.naLista && (
                <Alerta
                  tom="atencao"
                  texto={
                    <>
                      Parece o item <strong>{an.naLista.posicao}</strong> desta lista · {an.naLista.item.titulo}
                    </>
                  }
                  acoes={[
                    { rotulo: `Juntar ao ${an.naLista.posicao}`, icone: <Merge size={13} />, onClick: aoJuntar },
                    { rotulo: 'Manter os dois', onClick: () => aoMudar({ manterSeparado: true }) },
                  ]}
                />
              )}
              {sugestao && (
                <Alerta
                  tom="info"
                  texto={
                    <>
                      “{sugestao.nome}” não está no cadastro. É <strong>{sugestao.sugestao}</strong>?
                    </>
                  }
                  acoes={[
                    {
                      rotulo: `Usar ${sugestao.sugestao}`,
                      icone: <UserPlus size={13} />,
                      onClick: () =>
                        aoMudar({ responsaveis: unicos(a.responsaveis.map((r) => (r === sugestao.nome ? sugestao.sugestao! : r))) }),
                    },
                  ]}
                />
              )}
            </div>
          )}

          {!selecionando && (
            <div className="mt-2 flex items-center gap-4">
              <button onClick={() => setAberto(!aberto)} className="flex items-center gap-1 text-[13px] font-bold text-tinta">
                {aberto ? 'Fechar' : 'Ajustar detalhes'}
                <ChevronDown size={15} className={clsx('transition', aberto && 'rotate-180')} />
              </button>
              {a.citacao && (
                <button onClick={() => setVerTrecho(!verTrecho)} className="flex items-center gap-1 text-[13px] font-semibold text-grafite">
                  <Quote size={13} /> {verTrecho ? 'Ocultar trecho' : 'Trecho de origem'}
                </button>
              )}
            </div>
          )}

          {verTrecho && a.citacao && (
            <blockquote className="destaque-fino mt-2 block text-[13px] italic leading-relaxed text-grafite">{a.citacao}</blockquote>
          )}

          {aberto && !selecionando && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="rotulo">Responsáveis</label>
                <CampoPessoas valor={a.responsaveis} aoMudar={(responsaveis) => aoMudar({ responsaveis })} sugestoes={nomes} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="rotulo">Área</label>
                  <CampoLista valor={a.area ?? ''} opcoes={areas} aoMudar={(v) => aoMudar({ area: v || null })} />
                </div>
                <div>
                  <label className="rotulo">Marca</label>
                  <CampoLista valor={a.marca ?? ''} opcoes={marcas} aoMudar={(v) => aoMudar({ marca: v || null })} />
                </div>
                <div>
                  <label className="rotulo">Prazo</label>
                  <input type="date" className="campo" value={a.prazo ?? ''} onChange={(e) => aoMudar({ prazo: e.target.value || null })} />
                </div>
                <div>
                  <label className="rotulo">Prioridade</label>
                  <select className="campo" value={a.prioridade} onChange={(e) => aoMudar({ prioridade: e.target.value as Prioridade })}>
                    {PRIORIDADES.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="rotulo">Status</label>
                  <SeletorStatusProposta valor={a.status} aoMudar={(status) => aoMudar({ status })} />
                </div>
              </div>
              <div>
                <label className="rotulo">O que foi pedido</label>
                <AreaTexto className="campo leading-relaxed" value={a.descricao} onChange={(e) => aoMudar({ descricao: e.target.value })} />
              </div>
              <div>
                <label className="rotulo">Contexto</label>
                <AreaTexto
                  className="campo leading-relaxed"
                  value={a.contexto}
                  placeholder="Em que conversa surgiu, por que é importante…"
                  onChange={(e) => aoMudar({ contexto: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button className="botao-secundario flex-1 py-2.5 text-sm" onClick={aoDuplicar}>
                  <Copy size={15} /> Duplicar
                </button>
                <button className="botao-perigo flex-1 py-2.5 text-sm" onClick={aoRemover}>
                  <Trash2 size={15} /> Remover
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function SeletorStatusProposta({ valor, aoMudar }: { valor: AcaoProposta['status']; aoMudar: (v: AcaoProposta['status']) => void }) {
  return (
    <select className="campo" value={valor} onChange={(e) => aoMudar(e.target.value as AcaoProposta['status'])}>
      <option value="pendente">Pendente</option>
      <option value="em_andamento">Em andamento</option>
      <option value="concluido">Realizado</option>
    </select>
  )
}

function Alerta({
  tom,
  texto,
  acoes,
}: {
  tom: 'atencao' | 'info'
  texto: React.ReactNode
  acoes: { rotulo: string; icone?: React.ReactNode; onClick: () => void }[]
}) {
  return (
    <div className={clsx('rounded-md px-3 py-2.5 text-[13px] leading-snug text-tinta', tom === 'atencao' ? 'bg-rose-claro' : 'bg-aqua-claro')}>
      <div>{texto}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {acoes.map((a) => (
          <button
            key={a.rotulo}
            onClick={a.onClick}
            className="flex items-center gap-1 rounded-md border border-tinta/15 bg-superficie px-2.5 py-1.5 text-[12px] font-bold"
          >
            {a.icone}
            {a.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MudancasLote {
  adicionarResponsaveis: string[]
  area?: string | null
  marca?: string | null
  prazo?: string | null
  prioridade?: Prioridade
  status?: AcaoProposta['status']
  incluir?: boolean
}

function EdicaoEmLote({
  aberta,
  quantidade,
  aoFechar,
  aoAplicar,
}: {
  aberta: boolean
  quantidade: number
  aoFechar: () => void
  aoAplicar: (m: MudancasLote) => void
}) {
  const { areas, marcas, nomes } = useListas()
  const [responsaveis, setResponsaveis] = useState<string[]>([])
  const [area, setArea] = useState('')
  const [marca, setMarca] = useState('')
  const [prazo, setPrazo] = useState('')
  const [prioridade, setPrioridade] = useState('')
  const [status, setStatus] = useState('')
  const [incluir, setIncluir] = useState('')

  const aplicar = () => {
    const m: MudancasLote = { adicionarResponsaveis: responsaveis }
    if (area) m.area = area === '__limpar' ? null : area
    if (marca) m.marca = marca === '__limpar' ? null : marca
    if (prazo) m.prazo = prazo
    if (prioridade) m.prioridade = prioridade as Prioridade
    if (status) m.status = status as AcaoProposta['status']
    if (incluir) m.incluir = incluir === 'sim'
    aoAplicar(m)
    setResponsaveis([])
    setArea('')
    setMarca('')
    setPrazo('')
    setPrioridade('')
    setStatus('')
    setIncluir('')
  }

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo={`Editar ${quantidade} ${quantidade === 1 ? 'item' : 'itens'}`}>
      <p className="-mt-2 mb-4 text-[13px] text-grafite">Só os campos preenchidos serão alterados.</p>
      <div className="space-y-3">
        <div>
          <label className="rotulo">Adicionar responsáveis</label>
          <CampoPessoas valor={responsaveis} aoMudar={setResponsaveis} sugestoes={nomes} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="rotulo">Área</label>
            <select className="campo" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Não alterar</option>
              <option value="__limpar">Sem área</option>
              {areas.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo">Marca</label>
            <select className="campo" value={marca} onChange={(e) => setMarca(e.target.value)}>
              <option value="">Não alterar</option>
              <option value="__limpar">Sem marca</option>
              {marcas.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo">Prazo</label>
            <input type="date" className="campo" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div>
            <label className="rotulo">Prioridade</label>
            <select className="campo" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
              <option value="">Não alterar</option>
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo">Status</label>
            <select className="campo" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Não alterar</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Realizado</option>
            </select>
          </div>
          <div>
            <label className="rotulo">Salvar?</label>
            <select className="campo" value={incluir} onChange={(e) => setIncluir(e.target.value)}>
              <option value="">Não alterar</option>
              <option value="sim">Salvar</option>
              <option value="nao">Não salvar</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button className="botao-secundario flex-1" onClick={aoFechar}>
            <X size={16} /> Cancelar
          </button>
          <button className="botao-primario flex-1" onClick={aplicar}>
            Aplicar
          </button>
        </div>
      </div>
    </Folha>
  )
}
