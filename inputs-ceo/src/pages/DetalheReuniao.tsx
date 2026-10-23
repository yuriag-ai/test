import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, FileText, Printer, Share2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AtaView } from '../components/AtaView'
import { Cabecalho, SeletorStatus, SeloPrazo, useAviso, useCompartilhar, useConfirmar } from '../components/ui'
import { EM_ARTIFACT } from '../lib/ambiente'
import { db, excluirReuniao, montarAudio, mudarStatus } from '../lib/db'
import { textoAta } from '../lib/exportar'
import { ROTULO_ORIGEM } from '../lib/rotulos'
import type { Input } from '../lib/types'
import { formatarData, formatarDuracao } from '../lib/util'

export default function DetalheReuniao() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const avisar = useAviso()
  const confirmar = useConfirmar()
  const compartilharTexto = useCompartilhar()
  const reuniao = useLiveQuery(() => db.reunioes.get(id).then((r) => r ?? null), [id])
  const inputs =
    useLiveQuery(async () => {
      const reuniao = await db.reunioes.get(id)
      const daReuniao = await db.inputs.where('reuniaoId').equals(id).toArray()
      const retomados = (await db.inputs.bulkGet(reuniao?.retomados ?? [])).filter((i): i is Input => Boolean(i))
      return [...daReuniao, ...retomados.filter((r) => r.reuniaoId !== id)].sort((a, b) => a.numero - b.numero)
    }, [id]) ?? []
  const [audioUrl, setAudioUrl] = useState('')
  const [verTranscricao, setVerTranscricao] = useState(false)

  useEffect(() => {
    let url = ''
    void montarAudio(id).then((blob) => {
      if (blob) setAudioUrl((url = URL.createObjectURL(blob)))
    })
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

  if (reuniao === undefined) return <Cabecalho titulo="" voltar />
  if (reuniao === null) {
    return (
      <>
        <Cabecalho titulo="Reunião" voltar="/reunioes" />
        <p className="px-4 py-12 text-center text-sm text-nevoa">Reunião não encontrada.</p>
      </>
    )
  }

  const compartilhar = () => {
    const texto = reuniao.ata
      ? textoAta(reuniao, reuniao.ata, inputs)
      : `PLANO DE AÇÃO — ${reuniao.titulo || 'Reunião'} (${formatarData(reuniao.data, true)})\n\n${inputs
          .map((i) => `• ${i.titulo} — ${i.responsaveis.join(', ') || 'a definir'}${i.prazo ? ` — até ${formatarData(i.prazo)}` : ''}`)
          .join('\n')}`
    void compartilharTexto(reuniao.titulo || 'Ata', texto)
  }

  const excluir = async () => {
    const ok = await confirmar({
      titulo: 'Excluir esta reunião?',
      texto: 'A ata, a transcrição e o áudio serão apagados. Os inputs criados a partir dela continuam na lista.',
      botao: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    await excluirReuniao(id)
    avisar('Reunião excluída')
    navigate('/reunioes', { replace: true })
  }

  const plano = <PlanoDeAcao inputs={inputs} reuniaoId={id} />

  return (
    <>
      <Cabecalho
        voltar="/reunioes"
        titulo={<span className="text-sm font-semibold text-nevoa">{formatarData(reuniao.data, true)}</span>}
        acoes={
          <>
            <button aria-label="Compartilhar" className="rounded-full p-2 hover:bg-linho" onClick={compartilhar}>
              <Share2 size={19} />
            </button>
            {!EM_ARTIFACT && (
              <button aria-label="Imprimir ou salvar PDF" className="rounded-full p-2 hover:bg-linho" onClick={() => window.print()}>
                <Printer size={19} />
              </button>
            )}
            <button aria-label="Excluir" className="rounded-full p-2 text-bloqueado hover:bg-bloqueado-claro" onClick={excluir}>
              <Trash2 size={19} />
            </button>
          </>
        }
      />
      <div className="space-y-5 px-4 pb-8">
        {reuniao.ata ? (
          <AtaView reuniao={reuniao} ata={reuniao.ata} planoDeAcao={plano} />
        ) : (
          <article className="cartao imprimivel p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-couro">Plano de ação</div>
            <h2 className="mt-2 font-serif text-[24px] font-medium leading-tight">{reuniao.titulo || 'Reunião'}</h2>
            <div className="mt-2 text-[13px] text-grafite">
              {[ROTULO_ORIGEM[reuniao.origem], reuniao.local, reuniao.duracaoSeg ? formatarDuracao(reuniao.duracaoSeg) : '']
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div className="mt-5 border-t border-borda pt-4">{plano}</div>
          </article>
        )}

        {!reuniao.ata && reuniao.transcricao && (
          <Link to={`/captura/${reuniao.id}`} className="botao-secundario nao-imprimir w-full">
            <FileText size={18} /> Gerar ata desta reunião
          </Link>
        )}

        {audioUrl && (
          <section className="nao-imprimir">
            <div className="rotulo">Áudio</div>
            <audio controls src={audioUrl} className="w-full" />
          </section>
        )}

        {reuniao.transcricao && (
          <section className="nao-imprimir">
            <button onClick={() => setVerTranscricao(!verTranscricao)} className="flex w-full items-center justify-between py-2">
              <span className="rotulo mb-0">Transcrição completa</span>
              <ChevronDown size={18} className={verTranscricao ? 'rotate-180 text-nevoa' : 'text-nevoa'} />
            </button>
            {verTranscricao && (
              <div className="cartao whitespace-pre-wrap p-4 text-[14px] leading-relaxed text-grafite">{reuniao.transcricao}</div>
            )}
          </section>
        )}
      </div>
    </>
  )
}

function PlanoDeAcao({ inputs, reuniaoId }: { inputs: Input[]; reuniaoId: string }) {
  if (!inputs.length) return <p className="text-sm text-nevoa">Nenhum input criado a partir desta reunião.</p>
  return (
    <ul className="divide-y divide-borda">
      {inputs.map((i) => (
        <li key={i.id} className="py-3 first:pt-0">
          <Link to={`/inputs/${i.id}`} className="block">
            <div className="text-[15px] font-medium leading-snug">
              <span className="text-nevoa">#{i.numero}</span> {i.titulo}
              {i.reuniaoId !== reuniaoId && <span className="chip ml-1.5 bg-andamento-claro py-0.5 align-middle text-andamento">retomado</span>}
            </div>
            <div className="mt-1 text-[13px] text-grafite">{i.responsaveis.join(', ') || 'Responsável a definir'}</div>
          </Link>
          <div className="mt-1.5 flex items-center gap-2.5">
            <SeletorStatus status={i.status} aoMudar={(s) => void mudarStatus(i.id, s)} />
            <SeloPrazo prazo={i.prazo} concluido={i.status === 'concluido'} />
          </div>
        </li>
      ))}
    </ul>
  )
}
