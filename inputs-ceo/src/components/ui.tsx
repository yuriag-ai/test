import clsx from 'clsx'
import { ChevronLeft, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROTULO_PRIORIDADE, ROTULO_STATUS, STATUS } from '../lib/rotulos'
import type { Prioridade, Status } from '../lib/types'
import { diasAte, formatarData } from '../lib/util'

// ---------- Cabeçalho de página ----------

export function Cabecalho({
  titulo,
  subtitulo,
  voltar,
  acoes,
}: {
  titulo: ReactNode
  subtitulo?: ReactNode
  voltar?: boolean | string
  acoes?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="nao-imprimir sticky top-0 z-20 bg-papel/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur">
      <div className="flex min-h-10 items-center gap-2">
        {voltar && (
          <button
            aria-label="Voltar"
            className="-ml-2 rounded-full p-2 text-grafite hover:bg-linho"
            onClick={() => (typeof voltar === 'string' ? navigate(voltar) : navigate(-1))}
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {typeof titulo === 'string' ? <h1 className="titulo-pagina truncate">{titulo}</h1> : titulo}
        </div>
        {acoes && <div className="flex items-center gap-1">{acoes}</div>}
      </div>
      {subtitulo && <div className="mt-1 text-[13px] text-nevoa">{subtitulo}</div>}
    </header>
  )
}

// ---------- Status / prioridade / prazo ----------

const COR_STATUS: Record<Status, string> = {
  pendente: 'bg-pendente-claro text-pendente',
  em_andamento: 'bg-andamento-claro text-andamento',
  concluido: 'bg-concluido-claro text-concluido',
  bloqueado: 'bg-bloqueado-claro text-bloqueado',
}

const PONTO_STATUS: Record<Status, string> = {
  pendente: 'bg-pendente',
  em_andamento: 'bg-andamento',
  concluido: 'bg-concluido',
  bloqueado: 'bg-bloqueado',
}

/** Pílula de status que abre o seletor nativo do celular ao tocar. */
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
      className={clsx('chip relative cursor-pointer', COR_STATUS[status], grande && 'px-3.5 py-2 text-sm')}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', PONTO_STATUS[status])} />
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
  return <span className={clsx('inline-block h-2 w-2 rounded-full', PONTO_STATUS[status])} />
}

export function SeloPrioridade({ prioridade }: { prioridade: Prioridade }) {
  if (prioridade !== 'alta') return null
  return <span className="chip bg-bloqueado-claro text-bloqueado">{ROTULO_PRIORIDADE[prioridade]}</span>
}

export function SeloPrazo({ prazo, concluido }: { prazo: string; concluido?: boolean }) {
  if (!prazo) return null
  const dias = diasAte(prazo)
  const cor = concluido
    ? 'text-nevoa'
    : dias < 0
      ? 'text-bloqueado font-semibold'
      : dias <= 3
        ? 'text-pendente font-semibold'
        : 'text-grafite'
  const texto = concluido ? formatarData(prazo) : dias < 0 ? `Atrasado · ${formatarData(prazo)}` : dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : formatarData(prazo)
  return <span className={clsx('text-xs', cor)}>{texto}</span>
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
    <div className="nao-imprimir fixed inset-0 z-50 flex items-end justify-center bg-tinta/30 backdrop-blur-[2px]" onClick={aoFechar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-papel px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 shadow-flutuante"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-borda" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-medium">{titulo}</h2>
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
      <div className="mb-4 rounded-full bg-linho p-4 text-couro">{icone}</div>
      <h3 className="font-serif text-2xl font-medium">{titulo}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-grafite">{texto}</p>
      {acao && <div className="mt-6">{acao}</div>}
    </div>
  )
}

// ---------- Avisos rápidos (toast) ----------

const ContextoAviso = createContext<(msg: string) => void>(() => undefined)

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const avisar = useCallback((m: string) => setMsg(m), [])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2800)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <ContextoAviso.Provider value={avisar}>
      {children}
      {msg && (
        <div className="nao-imprimir pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-[60] flex justify-center px-4">
          <div className="rounded-full bg-tinta px-4 py-2.5 text-sm text-papel shadow-flutuante">{msg}</div>
        </div>
      )}
    </ContextoAviso.Provider>
  )
}

export function useAviso() {
  return useContext(ContextoAviso)
}
