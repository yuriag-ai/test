import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, ChevronRight, Mic } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Cabecalho, Vazio } from '../components/ui'
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
  if (r.propostas) return { texto: 'Aguardando revisão', cor: 'bg-pendente-claro text-pendente' }
  if (r.estado === 'gravando') return { texto: 'Gravação interrompida', cor: 'bg-bloqueado-claro text-bloqueado' }
  if (r.estado === 'rascunho') return { texto: 'Rascunho', cor: 'bg-linho text-grafite' }
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
      <Cabecalho titulo="Reuniões" subtitulo="Capturas, atas executivas e planos de ação." />
      {reunioes && reunioes.length === 0 ? (
        <Vazio
          icone={<CalendarDays size={28} />}
          titulo="Nenhuma reunião gravada"
          texto="Grave uma reunião ou agenda: o app transcreve a conversa e gera a ata e o plano de ação."
          acao={
            <Link to="/captura" className="botao-primario">
              <Mic size={18} /> Gravar reunião
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2.5 px-4">
          {(reunioes ?? []).map((r) => {
            const s = selo(r)
            const n = contagem?.get(r.id) ?? 0
            return (
              <li key={r.id}>
                <Link to={destino(r)} className="cartao flex items-center gap-3 p-3.5">
                  <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-linho py-1.5">
                    <span className="font-serif text-xl font-medium leading-none">{r.data.slice(8, 10)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-nevoa">{formatarData(r.data).slice(3)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.titulo || r.ata?.titulo || 'Reunião sem título'}</div>
                    <div className="truncate text-xs text-nevoa">
                      {[ROTULO_ORIGEM[r.origem], r.local, r.hora, r.duracaoSeg ? formatarDuracao(r.duracaoSeg) : ''].filter(Boolean).join(' · ')}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s && <span className={`chip ${s.cor}`}>{s.texto}</span>}
                      {r.ata && <span className="chip bg-couro-claro text-couro-escuro">Ata</span>}
                      {n > 0 && <span className="chip bg-linho">{n} {n === 1 ? 'input' : 'inputs'}</span>}
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
