import type { ReactNode } from 'react'
import { ROTULO_ORIGEM } from '../lib/rotulos'
import type { AtaExecutiva, Reuniao } from '../lib/types'
import { formatarData, formatarDuracao } from '../lib/util'
import { Secao } from './ui'

/** Título em caixa alta com a última palavra em aqua, como nas páginas do padrão. */
export function TituloDocumento({ texto }: { texto: string }) {
  const corte = texto.trimEnd().lastIndexOf(' ')
  return (
    <h2 className="titulo-pagina mt-1.5 text-[22px]">
      {corte > 0 ? (
        <>
          {texto.slice(0, corte)} <span className="titulo-acento">{texto.slice(corte + 1)}</span>
        </>
      ) : (
        texto
      )}
    </h2>
  )
}

/** Ata executiva em formato de documento (também usada na impressão/PDF). */
export function AtaView({ reuniao, ata, planoDeAcao }: { reuniao: Reuniao; ata: AtaExecutiva; planoDeAcao?: ReactNode }) {
  const participantes = ata.participantes.length ? ata.participantes : reuniao.participantes
  return (
    <article className="imprimivel space-y-6">
      <header>
        <div className="sobrelinha">Ata executiva</div>
        <TituloDocumento texto={ata.titulo || reuniao.titulo || 'Reunião'} />
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
            <span className="font-bold text-tinta">Participantes:</span> {participantes.join(', ')}
          </div>
        )}
      </header>

      <div className="destaque-leve block">
        <div className="mt-bloco mb-2 bg-aqua">Resumo executivo</div>
        <p className="text-[15px] leading-relaxed">{ata.resumoExecutivo}</p>
      </div>

      {ata.temas.length > 0 && (
        <Secao titulo="Temas discutidos">
          <ol className="space-y-4">
            {ata.temas.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-7 shrink-0 text-[15px] font-black leading-snug">{String(i + 1).padStart(2, '0')}.</span>
                <div className="min-w-0">
                  <h4 className="font-bold leading-snug">{t.tema}</h4>
                  <ul className="mt-1 space-y-1 text-[14px] leading-relaxed text-grafite">
                    {t.pontos.map((p, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-tinta" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </Secao>
      )}

      {ata.decisoes.length > 0 && <Lista titulo="Decisões" itens={ata.decisoes} estilo="destaque-aqua" />}
      {ata.pontosDeAtencao.length > 0 && <Lista titulo="Pontos de atenção" itens={ata.pontosDeAtencao} estilo="destaque-rose" />}
      {planoDeAcao && <Secao titulo="Plano de ação">{planoDeAcao}</Secao>}
    </article>
  )
}

/** Decisões em contorno aqua; pontos de atenção em rosé leve. */
function Lista({ titulo, itens, estilo }: { titulo: string; itens: string[]; estilo: string }) {
  return (
    <div className={`${estilo} block`}>
      <h3 className="titulo-secao mb-2">{titulo}</h3>
      <ul className="space-y-1.5 text-[14px] leading-relaxed">
        {itens.map((d, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-tinta" />
            {d}
          </li>
        ))}
      </ul>
    </div>
  )
}
