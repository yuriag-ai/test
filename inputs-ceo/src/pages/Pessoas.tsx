import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, MessageCircle, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CORES_RODIZIO, Cabecalho, PontoStatus, SeloPrazo, Vazio, useCompartilhar } from '../components/ui'
import { db } from '../lib/db'
import { textoPendencias } from '../lib/exportar'
import type { Input } from '../lib/types'
import { diasAte } from '../lib/util'

interface Resumo {
  nome: string
  area: string
  abertos: Input[]
  atrasados: number
  realizados: number
}

export default function Pessoas() {
  const compartilhar = useCompartilhar()
  const inputs = useLiveQuery(() => db.inputs.toArray(), [])
  const pessoas = useLiveQuery(() => db.pessoas.toArray(), []) ?? []
  const [aberta, setAberta] = useState<string | null>(null)

  const resumos = useMemo(() => {
    const mapa = new Map<string, Resumo>()
    const areaDe = new Map(pessoas.map((p) => [p.nome, p.area]))
    for (const i of inputs ?? []) {
      for (const nome of i.responsaveis) {
        const r = mapa.get(nome) ?? { nome, area: areaDe.get(nome) ?? '', abertos: [], atrasados: 0, realizados: 0 }
        if (i.status === 'concluido') r.realizados++
        else {
          r.abertos.push(i)
          if (i.prazo && diasAte(i.prazo) < 0) r.atrasados++
        }
        mapa.set(nome, r)
      }
    }
    return [...mapa.values()].sort((a, b) => b.abertos.length - a.abertos.length || a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [inputs, pessoas])

  const cobrar = (r: Resumo) => void compartilhar(`Pendências — ${r.nome}`, textoPendencias(r.nome, r.abertos))

  return (
    <>
      <Cabecalho
        logo
        sobrelinha="Follow-up"
        titulo="Pessoas"
        acento="e pendências"
        subtitulo="Quem está com o quê — e o que precisa de follow-up."
      />
      {inputs && resumos.length === 0 ? (
        <Vazio icone={<Users size={28} />} titulo="Ninguém por aqui ainda" texto="As pessoas aparecem quando você atribui responsáveis aos inputs." />
      ) : (
        <ul className="border-t border-tinta px-4">
          {resumos.map((r, indice) => {
            const expandida = aberta === r.nome
            return (
              <li key={r.nome} className="linha">
                <button className="flex w-full items-center gap-3 py-3.5 text-left" onClick={() => setAberta(expandida ? null : r.nome)}>
                  <span
                    className={clsx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-black text-black',
                      CORES_RODIZIO[indice % CORES_RODIZIO.length],
                    )}
                  >
                    {r.nome.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{r.nome}</div>
                    <div className="text-xs text-nevoa">
                      {r.abertos.length} {r.abertos.length === 1 ? 'aberto' : 'abertos'} · {r.realizados} realizados
                      {r.area && ` · ${r.area}`}
                    </div>
                  </div>
                  {r.atrasados > 0 && (
                    <span className="mt-valor">
                      {r.atrasados} atrasado{r.atrasados > 1 && 's'}
                    </span>
                  )}
                  <ChevronDown size={18} className={clsx('text-nevoa transition', expandida && 'rotate-180')} />
                </button>
                {expandida && (
                  <div className="pb-3.5 pl-[52px]">
                    {r.abertos.length === 0 ? (
                      <p className="py-3 text-sm text-nevoa">Nada em aberto. 👏</p>
                    ) : (
                      <ul className="divide-y divide-regua border-t border-regua">
                        {r.abertos.map((i) => (
                          <li key={i.id}>
                            <Link to={`/inputs/${i.id}`} className="flex items-center gap-2.5 py-2.5">
                              <PontoStatus status={i.status} />
                              <span className="flex-1 text-sm leading-snug">
                                <span className="font-bold text-nevoa">{String(i.numero).padStart(2, '0')}.</span> {i.titulo}
                              </span>
                              <SeloPrazo prazo={i.prazo} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.abertos.length > 0 && (
                      <button className="botao-secundario mt-2 w-full" onClick={() => cobrar(r)}>
                        <MessageCircle size={17} /> Pedir status por WhatsApp
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
