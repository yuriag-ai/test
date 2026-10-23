import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, ChevronRight, FileUp, Mic } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Cabecalho, Vazio } from '../components/ui'
import { EM_ARTIFACT } from '../lib/ambiente'
import { db } from '../lib/db'
import { ROTULO_ORIGEM } from '../lib/rotulos'
import type { Reuniao } from '../lib/types'
import { formatarData, formatarDuracao } from '../lib/util'

function destino(r: Reuniao): string {
  if (r.propostas) return `/revisao/${r.id}`
  if (r.estado === 'processada') return `/reunioes/${r.id}`
  return `/captura/${r.id}`
}

function selo(r: Reuniao): { texto: string; cor: string } | null {
  if (r.propostas) return { texto: 'Aguardando revisão', cor: 'mt-numero' }
  if (r.estado === 'gravando') return { texto: 'Gravação interrompida', cor: 'mt-valor' }
  if (r.estado === 'rascunho') return { texto: 'Rascunho', cor: 'marca-texto bg-linho text-grafite' }
  return null
}

export default function Reunioes() {
  const reunioes = useLiveQuery(() => db.reunioes.orderBy('data').reverse().toArray(), [])
  const contagem = useLiveQuery(async () => {
    const mapa = new Map<string, number>()
    await db.inputs.each((i) => i.reuniaoId && mapa.set(i.reuniaoId, (mapa.get(i.reuniaoId) ?? 0) + 1))
    return mapa
  }, [])

  return (
    <>
      <Cabecalho
        logo
        sobrelinha="Agendas e visitas"
        titulo="Reuniões"
        acento="e atas"
        subtitulo="Atas executivas, transcrições e planos de ação."
        acoes={
          !EM_ARTIFACT && (
            <Link to="/captura" aria-label="Gravar no celular" className="rounded-full p-2 text-grafite hover:bg-linho">
              <Mic size={20} />
            </Link>
          )
        }
      />
      {reunioes && reunioes.length === 0 ? (
        <Vazio
          icone={<CalendarDays size={28} />}
          titulo="Nenhuma reunião ainda"
          texto="Importe a transcrição ou o resumo de uma reunião (ou grave pelo celular) para gerar a ata e o plano de ação."
          acao={
            <div className="flex flex-col gap-2.5">
              <Link to="/importar" className="botao-primario">
                <FileUp size={18} /> Importar transcrição ou resumo
              </Link>
              {!EM_ARTIFACT && (
                <Link to="/captura" className="botao-secundario">
                  <Mic size={18} /> Gravar no celular
                </Link>
              )}
            </div>
          }
        />
      ) : (
        <ul className="border-t border-tinta px-4">
          {(reunioes ?? []).map((r) => {
            const s = selo(r)
            const n = contagem?.get(r.id) ?? 0
            return (
              <li key={r.id}>
                <Link to={destino(r)} className="linha flex items-center gap-3 py-4">
                  <div className="flex w-11 shrink-0 flex-col items-start">
                    <span className="text-[26px] font-black leading-none tracking-[-0.02em]">{r.data.slice(8, 10)}</span>
                    <span className="mt-0.5 text-[11px] font-black uppercase text-aqua">{formatarData(r.data).slice(3)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{r.titulo || r.ata?.titulo || 'Reunião sem título'}</div>
                    <div className="truncate text-xs text-nevoa">
                      {[ROTULO_ORIGEM[r.origem], r.local, r.hora, r.duracaoSeg ? formatarDuracao(r.duracaoSeg) : ''].filter(Boolean).join(' · ')}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s && <span className={s.cor}>{s.texto}</span>}
                      {r.ata && <span className="mt-chave">Ata</span>}
                      {n > 0 && (
                        <span className="marca-texto bg-linho text-tinta">
                          {n} {n === 1 ? 'input' : 'inputs'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-nevoa" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
