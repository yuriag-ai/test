import clsx from 'clsx'
import { Check, ChevronDown, Quote } from 'lucide-react'
import { useState } from 'react'
import { useListas } from '../hooks/useDados'
import { PRIORIDADES, ROTULO_STATUS } from '../lib/rotulos'
import type { AcaoProposta, Prioridade } from '../lib/types'
import { formatarData } from '../lib/util'
import { AreaTexto, CampoLista, CampoPessoas } from './ui'

export interface AcaoRevisavel extends AcaoProposta {
  incluir: boolean
}

export function paraRevisao(acoes: AcaoProposta[]): AcaoRevisavel[] {
  return acoes.map((a) => ({ ...a, incluir: true }))
}

/** Lista editável de ações propostas (pela IA ou pelo importador) antes de virarem Inputs. */
export function RevisaoAcoes({
  acoes,
  aoMudar,
}: {
  acoes: AcaoRevisavel[]
  aoMudar: (acoes: AcaoRevisavel[]) => void
}) {
  const marcadas = acoes.filter((a) => a.incluir).length
  const atualizar = (indice: number, mudancas: Partial<AcaoRevisavel>) =>
    aoMudar(acoes.map((a, i) => (i === indice ? { ...a, ...mudancas } : a)))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-grafite">
          {marcadas} de {acoes.length} selecionadas
        </span>
        <button
          className="text-sm font-medium text-couro"
          onClick={() => aoMudar(acoes.map((a) => ({ ...a, incluir: marcadas < acoes.length })))}
        >
          {marcadas < acoes.length ? 'Marcar todas' : 'Desmarcar todas'}
        </button>
      </div>
      <ol className="space-y-2.5">
        {acoes.map((a, i) => (
          <ItemRevisao key={i} indice={i + 1} acao={a} aoMudar={(m) => atualizar(i, m)} />
        ))}
      </ol>
    </div>
  )
}

function ItemRevisao({
  acao: a,
  indice,
  aoMudar,
}: {
  acao: AcaoRevisavel
  indice: number
  aoMudar: (m: Partial<AcaoRevisavel>) => void
}) {
  const [aberto, setAberto] = useState(false)
  const { areas, marcas, nomes } = useListas()
  return (
    <li className={clsx('cartao p-3.5 transition', !a.incluir && 'opacity-50')}>
      <div className="flex gap-3">
        <button
          aria-label={a.incluir ? 'Não criar esta ação' : 'Criar esta ação'}
          onClick={() => aoMudar({ incluir: !a.incluir })}
          className={clsx(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2',
            a.incluir ? 'border-tinta bg-tinta text-papel' : 'border-borda bg-white',
          )}
        >
          {a.incluir && <Check size={15} strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-nevoa">{indice}</div>
          <AreaTexto
            value={a.titulo}
            onChange={(e) => aoMudar({ titulo: e.target.value })}
            className="-mx-1 w-full resize-none rounded-md bg-transparent px-1 text-[15px] font-medium leading-snug outline-none focus:bg-linho"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {a.responsaveis.length ? (
              a.responsaveis.map((r) => (
                <span key={r} className="chip bg-linho">
                  {r}
                </span>
              ))
            ) : (
              <span className="chip border border-dashed border-pendente/50 text-pendente">Sem responsável</span>
            )}
            {a.area && <span className="chip text-grafite">{a.area}</span>}
            {a.marca && <span className="chip bg-couro-claro text-couro-escuro">{a.marca}</span>}
            {a.prazo && <span className="chip text-grafite">até {formatarData(a.prazo)}</span>}
            {a.status !== 'pendente' && <span className="chip bg-concluido-claro text-concluido">{ROTULO_STATUS[a.status]}</span>}
            {a.prioridade === 'alta' && <span className="chip bg-bloqueado-claro text-bloqueado">Alta</span>}
          </div>
          <button onClick={() => setAberto(!aberto)} className="mt-2 flex items-center gap-1 text-[13px] font-medium text-couro">
            {aberto ? 'Fechar' : 'Ajustar detalhes'}
            <ChevronDown size={15} className={clsx('transition', aberto && 'rotate-180')} />
          </button>
          {aberto && (
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
                  <select
                    className="campo"
                    value={a.status}
                    onChange={(e) => aoMudar({ status: e.target.value as AcaoProposta['status'] })}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Realizado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="rotulo">Descrição</label>
                <textarea
                  rows={3}
                  className="campo leading-relaxed"
                  value={a.descricao}
                  onChange={(e) => aoMudar({ descricao: e.target.value })}
                />
              </div>
              {a.contexto && (
                <div>
                  <label className="rotulo">Contexto</label>
                  <textarea rows={2} className="campo leading-relaxed" value={a.contexto} onChange={(e) => aoMudar({ contexto: e.target.value })} />
                </div>
              )}
              {a.citacao && (
                <blockquote className="flex gap-2 border-l-2 border-couro pl-3 text-[13px] italic text-grafite">
                  <Quote size={13} className="mt-0.5 shrink-0 text-couro" />
                  {a.citacao}
                </blockquote>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
