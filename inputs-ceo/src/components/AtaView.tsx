import type { ReactNode } from 'react'
import { ROTULO_ORIGEM } from '../lib/rotulos'
import type { AtaExecutiva, Reuniao } from '../lib/types'
import { formatarData, formatarDuracao } from '../lib/util'

/** Ata executiva em formato de documento (também usada na impressão/PDF). */
export function AtaView({ reuniao, ata, planoDeAcao }: { reuniao: Reuniao; ata: AtaExecutiva; planoDeAcao?: ReactNode }) {
  const participantes = ata.participantes.length ? ata.participantes : reuniao.participantes
  return (
    <article className="cartao imprimivel p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-couro">Ata executiva</div>
      <h2 className="mt-2 font-serif text-[24px] font-medium leading-tight">{ata.titulo || reuniao.titulo}</h2>
      <div className="mt-2 text-[13px] text-grafite">
        {[
          formatarData(reuniao.data, true),
          reuniao.hora,
          ROTULO_ORIGEM[reuniao.origem],
          reuniao.local,
          reuniao.duracaoSeg ? formatarDuracao(reuniao.duracaoSeg) : '',
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>
      {participantes.length > 0 && (
        <div className="mt-1 text-[13px] text-grafite">
          <span className="text-nevoa">Participantes:</span> {participantes.join(', ')}
        </div>
      )}

      <Secao titulo="Resumo executivo">
        <p className="text-[15px] leading-relaxed">{ata.resumoExecutivo}</p>
      </Secao>

      {ata.temas.length > 0 && (
        <Secao titulo="Temas discutidos">
          <div className="space-y-4">
            {ata.temas.map((t, i) => (
              <div key={i}>
                <h4 className="font-medium">{t.tema}</h4>
                <ul className="mt-1 space-y-1 text-[14px] leading-relaxed text-grafite">
                  {t.pontos.map((p, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-couro" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Secao>
      )}

      {ata.decisoes.length > 0 && <Lista titulo="Decisões" itens={ata.decisoes} />}
      {ata.pontosDeAtencao.length > 0 && <Lista titulo="Pontos de atenção" itens={ata.pontosDeAtencao} />}
      {planoDeAcao && <Secao titulo="Plano de ação">{planoDeAcao}</Secao>}
    </article>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-6 border-t border-borda pt-4">
      <h3 className="rotulo">{titulo}</h3>
      {children}
    </section>
  )
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <Secao titulo={titulo}>
      <ul className="space-y-1.5 text-[14px] leading-relaxed">
        {itens.map((d, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-tinta" />
            {d}
          </li>
        ))}
      </ul>
    </Secao>
  )
}
