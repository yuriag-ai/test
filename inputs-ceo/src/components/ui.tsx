import clsx from 'clsx'
import { ChevronLeft, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { EM_ARTIFACT, EMPRESA } from '../lib/ambiente'
import { ROTULO_PRIORIDADE, ROTULO_STATUS, STATUS } from '../lib/rotulos'
import type { Prioridade, Status } from '../lib/types'
import { diasAte, formatarData } from '../lib/util'

// ---------- Marca ----------

/** Logo Arezzo&CO em texto (AREZZO / &CO), como no canto superior direito das páginas do padrão. */
export function LogoArezzoCo({ tamanho = 13 }: { tamanho?: number }) {
  return (
    <div
      role="img"
      aria-label="Arezzo&CO"
      className="shrink-0 select-none text-right font-black leading-[0.92] tracking-[-0.01em] text-tinta"
      style={{ fontSize: tamanho }}
    >
      <div>AREZZO</div>
      <div>
        <span className="text-azul">&amp;</span>CO
      </div>
    </div>
  )
}

/** Cores do padrão em rodízio por posição (nunca duas da mesma família lado a lado). */
export const CORES_RODIZIO = ['bg-aqua', 'bg-rose', 'bg-oliva', 'bg-azul', 'bg-cinza']

// ---------- Cabeçalho de página ----------

/** Anatomia do padrão: sobrelinha em caixa alta, título em caixa alta com o trecho final em aqua, logo à direita. */
export function Cabecalho({
  titulo,
  acento,
  sobrelinha,
  subtitulo,
  voltar,
  acoes,
  logo,
}: {
  titulo?: ReactNode
  acento?: string
  sobrelinha?: ReactNode
  subtitulo?: ReactNode
  voltar?: boolean | string
  acoes?: ReactNode
  logo?: boolean
}) {
  const navigate = useNavigate()
  return (
    <header className="nao-imprimir sticky top-[env(safe-area-inset-top,0px)] z-20 bg-papel/95 px-4 pb-3 pt-3 backdrop-blur">
      <div className="flex min-h-9 items-center gap-2">
        {voltar && (
          <button
            aria-label="Voltar"
            className="-ml-2 rounded-full p-2 text-tinta hover:bg-linho"
            onClick={() => (typeof voltar === 'string' ? navigate(voltar) : navigate(-1))}
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="min-w-0 flex-1">{sobrelinha && <div className="sobrelinha truncate">{sobrelinha}</div>}</div>
        {acoes && <div className="flex items-center gap-1">{acoes}</div>}
        {logo && EMPRESA && <LogoArezzoCo />}
      </div>
      {titulo && (
        <h1 className="titulo-pagina mt-1.5">
          {titulo}
          {acento && <span className="titulo-acento"> {acento}</span>}
        </h1>
      )}
      {subtitulo && <div className="mt-1.5 text-[13px] leading-snug text-nevoa">{subtitulo}</div>}
    </header>
  )
}

/** Seção de página: fio preto no topo e título em caixa alta, opcionalmente numerado ("01."). */
export function Secao({
  titulo,
  numero,
  acoes,
  children,
  className,
}: {
  titulo: ReactNode
  numero?: number
  acoes?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx('border-t border-tinta pt-3', className)}>
      <div className="mb-3 flex min-h-7 items-center gap-2">
        {numero !== undefined && <span className="text-[14px] font-black">{String(numero).padStart(2, '0')}.</span>}
        <h2 className="titulo-secao flex-1">{titulo}</h2>
        {acoes}
      </div>
      {children}
    </section>
  )
}

// ---------- Status / prioridade / prazo ----------

const FUNDO_STATUS: Record<Status, string> = {
  pendente: 'bg-pendente-claro',
  em_andamento: 'bg-andamento-claro',
  concluido: 'bg-concluido-claro',
  bloqueado: 'bg-bloqueado-claro',
}

const PONTO_STATUS: Record<Status, string> = {
  pendente: 'bg-pendente',
  em_andamento: 'bg-andamento',
  concluido: 'bg-concluido',
  bloqueado: 'bg-bloqueado',
}

/** Status com ponto colorido e texto preto; toque abre o seletor nativo do celular. */
export function SeletorStatus({
  status,
  aoMudar,
  grande,
}: {
  status: Status
  aoMudar: (s: Status) => void
  grande?: boolean
}) {
  return (
    <label
      className={clsx('chip relative cursor-pointer text-tinta', FUNDO_STATUS[status], grande && 'px-3 py-2 text-sm')}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={clsx('h-2 w-2 rounded-full', PONTO_STATUS[status])} />
      {ROTULO_STATUS[status]}
      <select
        aria-label="Alterar status"
        className="absolute inset-0 cursor-pointer opacity-0"
        value={status}
        onChange={(e) => aoMudar(e.target.value as Status)}
      >
        {STATUS.map((s) => (
          <option key={s.valor} value={s.valor}>
            {s.rotulo}
          </option>
        ))}
      </select>
    </label>
  )
}

export function PontoStatus({ status }: { status: Status }) {
  return <span className={clsx('inline-block h-2 w-2 shrink-0 rounded-full', PONTO_STATUS[status])} />
}

/** Prioridade alta em marca-texto aqua (palavra-chave). */
export function SeloPrioridade({ prioridade }: { prioridade: Prioridade }) {
  if (prioridade !== 'alta') return null
  return <span className="mt-chave">{ROTULO_PRIORIDADE[prioridade]}</span>
}

/** Prazo: atrasado em marca-texto preto, próximos dias em rosé, demais em cinza. */
export function SeloPrazo({ prazo, concluido }: { prazo: string; concluido?: boolean }) {
  if (!prazo) return null
  const dias = diasAte(prazo)
  if (concluido) return <span className="text-[12px] text-nevoa">{formatarData(prazo)}</span>
  if (dias < 0) return <span className="mt-valor">Atrasado · {formatarData(prazo)}</span>
  if (dias <= 3) return <span className="mt-numero">{dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : formatarData(prazo)}</span>
  return <span className="text-[12px] font-semibold text-grafite">{formatarData(prazo)}</span>
}

// ---------- Campo de pessoas (chips + autocompletar) ----------

export function CampoPessoas({
  valor,
  aoMudar,
  sugestoes,
  placeholder = 'Adicionar responsável',
}: {
  valor: string[]
  aoMudar: (v: string[]) => void
  sugestoes: string[]
  placeholder?: string
}) {
  const [texto, setTexto] = useState('')
  const idLista = `pessoas-${placeholder.length}`
  const adicionar = (nome: string) => {
    const limpo = nome.trim().replace(/,$/, '')
    if (!limpo) return
    if (!valor.some((v) => v.toLowerCase() === limpo.toLowerCase())) aoMudar([...valor, limpo])
    setTexto('')
  }
  return (
    <div className="campo flex flex-wrap items-center gap-1.5 py-2">
      {valor.map((nome) => (
        <span key={nome} className="chip bg-linho text-tinta">
          {nome}
          <button aria-label={`Remover ${nome}`} onClick={() => aoMudar(valor.filter((v) => v !== nome))}>
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        list={idLista}
        value={texto}
        placeholder={valor.length ? '' : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent py-1 outline-none placeholder:text-nevoa"
        onChange={(e) => {
          const v = e.target.value
          if (v.endsWith(',')) adicionar(v)
          else if (sugestoes.includes(v)) adicionar(v)
          else setTexto(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            adicionar(texto)
          } else if (e.key === 'Backspace' && !texto && valor.length) {
            aoMudar(valor.slice(0, -1))
          }
        }}
        onBlur={() => adicionar(texto)}
      />
      <datalist id={idLista}>
        {sugestoes
          .filter((s) => !valor.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  )
}

export function CampoLista({
  valor,
  aoMudar,
  opcoes,
  placeholder,
}: {
  valor: string
  aoMudar: (v: string) => void
  opcoes: string[]
  placeholder?: string
}) {
  return (
    <select className={clsx('campo appearance-none', !valor && 'text-nevoa')} value={valor} onChange={(e) => aoMudar(e.target.value)}>
      <option value="">{placeholder ?? 'Não definido'}</option>
      {valor && !opcoes.includes(valor) && <option value={valor}>{valor}</option>}
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

/** Textarea que cresce conforme o conteúdo. */
export function AreaTexto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [props.value])
  return <textarea ref={ref} rows={1} {...props} />
}

// ---------- Folha (bottom sheet) ----------

export function Folha({
  aberta,
  aoFechar,
  titulo,
  children,
}: {
  aberta: boolean
  aoFechar: () => void
  titulo: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!aberta) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberta, aoFechar])
  if (!aberta) return null
  return (
    <div className="nao-imprimir fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]" onClick={aoFechar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-xl bg-papel px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-3 shadow-flutuante"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-borda" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-black uppercase leading-tight">{titulo}</h2>
          <button aria-label="Fechar" className="rounded-full p-2 hover:bg-linho" onClick={aoFechar}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------- Estado vazio ----------

export function Vazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-aqua text-black">{icone}</div>
      <h3 className="text-[18px] font-black uppercase leading-tight">{titulo}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-grafite">{texto}</p>
      {acao && <div className="mt-6">{acao}</div>}
    </div>
  )
}

// ---------- Avisos rápidos, confirmações e compartilhamento ----------

interface PedidoConfirmacao {
  titulo: string
  texto?: string
  botao: string
  perigo?: boolean
}

const ContextoAviso = createContext<(msg: string) => void>(() => undefined)
const ContextoConfirmar = createContext<(p: PedidoConfirmacao) => Promise<boolean>>(async () => false)
const ContextoCompartilhar = createContext<(titulo: string, texto: string) => Promise<void>>(async () => undefined)

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmacao, setConfirmacao] = useState<(PedidoConfirmacao & { responder: (ok: boolean) => void }) | null>(null)
  const [paraCopiar, setParaCopiar] = useState<{ titulo: string; texto: string } | null>(null)
  const avisar = useCallback((m: string) => setMsg(m), [])

  const confirmar = useCallback(
    (p: PedidoConfirmacao) =>
      new Promise<boolean>((resolver) => {
        setConfirmacao({ ...p, responder: resolver })
      }),
    [],
  )
  const responder = (ok: boolean) => {
    confirmacao?.responder(ok)
    setConfirmacao(null)
  }

  const compartilhar = useCallback(
    async (titulo: string, texto: string) => {
      if (!EM_ARTIFACT && navigator.share) {
        try {
          await navigator.share({ title: titulo, text: texto })
          return
        } catch (erro) {
          if ((erro as DOMException).name === 'AbortError') return
        }
      }
      try {
        await navigator.clipboard.writeText(texto)
        avisar('Texto copiado. É só colar no WhatsApp ou e-mail.')
      } catch {
        setParaCopiar({ titulo, texto })
      }
    },
    [avisar],
  )

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2800)
    return () => clearTimeout(t)
  }, [msg])

  return (
    <ContextoAviso.Provider value={avisar}>
      <ContextoConfirmar.Provider value={confirmar}>
        <ContextoCompartilhar.Provider value={compartilhar}>
          {children}
          {msg && (
            <div className="nao-imprimir pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] z-[60] flex justify-center px-4">
              <div className="rounded-md bg-tinta px-4 py-2.5 text-sm font-semibold text-papel shadow-flutuante">{msg}</div>
            </div>
          )}
          <Folha aberta={Boolean(confirmacao)} aoFechar={() => responder(false)} titulo={confirmacao?.titulo ?? ''}>
            {confirmacao?.texto && <p className="-mt-2 text-sm leading-relaxed text-grafite">{confirmacao.texto}</p>}
            <div className="mt-5 flex gap-2">
              <button className="botao-secundario flex-1" onClick={() => responder(false)}>
                Cancelar
              </button>
              <button
                autoFocus
                className={clsx('botao flex-1', confirmacao?.perigo ? 'bg-perigo text-papel' : 'bg-tinta text-papel')}
                onClick={() => responder(true)}
              >
                {confirmacao?.botao}
              </button>
            </div>
          </Folha>
          <Folha aberta={Boolean(paraCopiar)} aoFechar={() => setParaCopiar(null)} titulo="Copiar texto">
            <p className="-mt-2 mb-3 text-[13px] text-grafite">Selecione o texto abaixo e copie para enviar.</p>
            <textarea
              id="texto-para-copiar"
              readOnly
              rows={10}
              value={paraCopiar?.texto ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              className="campo text-[13px] leading-relaxed"
            />
            <button
              className="botao-primario mt-3 w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(paraCopiar?.texto ?? '')
                  avisar('Texto copiado')
                  setParaCopiar(null)
                } catch {
                  ;(document.getElementById('texto-para-copiar') as HTMLTextAreaElement | null)?.select()
                }
              }}
            >
              Copiar
            </button>
          </Folha>
        </ContextoCompartilhar.Provider>
      </ContextoConfirmar.Provider>
    </ContextoAviso.Provider>
  )
}

export function useAviso() {
  return useContext(ContextoAviso)
}

/** Pede confirmação dentro do app (o claude.ai e alguns celulares bloqueiam o confirm() do navegador). */
export function useConfirmar() {
  return useContext(ContextoConfirmar)
}

/** Compartilha (celular) ou copia um texto; se nada disso for possível, mostra o texto para copiar. */
export function useCompartilhar() {
  return useContext(ContextoCompartilhar)
}
