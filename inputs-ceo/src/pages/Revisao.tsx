import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AtaView } from '../components/AtaView'
import { RevisaoAcoes, paraRevisao, type AcaoRevisavel } from '../components/RevisaoAcoes'
import { Cabecalho, useAviso } from '../components/ui'
import { aplicarRevisao, atualizarReuniao, db } from '../lib/db'
import { resumoSalvamento, textoBotaoSalvar } from '../lib/rotulos'

export default function Revisao() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const avisar = useAviso()
  const reuniao = useLiveQuery(() => db.reunioes.get(id).then((r) => r ?? null), [id])
  const [acoes, setAcoes] = useState<AcaoRevisavel[] | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (reuniao && acoes === null) setAcoes(paraRevisao(reuniao.propostas ?? []))
  }, [reuniao, acoes])

  if (reuniao === undefined) return <Cabecalho titulo="" voltar />
  if (reuniao === null) {
    return (
      <>
        <Cabecalho titulo="Revisão" voltar="/reunioes" />
        <p className="px-4 py-12 text-center text-sm text-nevoa">Reunião não encontrada.</p>
      </>
    )
  }

  const novos = acoes?.filter((a) => a.incluir && !a.vinculo).length ?? 0
  const vinculados = acoes?.filter((a) => a.incluir && a.vinculo).length ?? 0

  const confirmar = async () => {
    if (!acoes) return
    setSalvando(true)
    const { criados, atualizados } = await aplicarRevisao(acoes, {
      reuniaoId: reuniao.id,
      data: reuniao.data,
      local: reuniao.local,
      origem: reuniao.origem,
    })
    await atualizarReuniao(reuniao.id, { estado: 'processada', propostas: undefined })
    avisar(resumoSalvamento(criados.length, atualizados) || 'Reunião salva')
    navigate(`/reunioes/${reuniao.id}`, { replace: true })
  }

  return (
    <>
      <Cabecalho
        titulo={reuniao.ata ? 'Ata e plano de ação' : 'Plano de ação'}
        voltar={`/captura/${reuniao.id}`}
        subtitulo="Revise antes de salvar. Nada vira input sem a sua confirmação."
      />
      <div className="space-y-6 px-4 pb-32">
        {reuniao.ata && <AtaView reuniao={reuniao} ata={reuniao.ata} />}
        <section>
          <h2 className="mb-3 font-serif text-2xl font-medium">Ações sugeridas</h2>
          {acoes && acoes.length > 0 ? (
            <RevisaoAcoes acoes={acoes} aoMudar={setAcoes} />
          ) : (
            <p className="rounded-xl bg-linho p-4 text-sm text-grafite">Nenhuma ação identificada nesta conversa.</p>
          )}
        </section>
      </div>
      <div className="nao-imprimir fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-20 mx-auto max-w-xl px-4">
        <div className="rounded-2xl bg-papel/95 p-2 shadow-flutuante backdrop-blur">
          <button className="botao-primario w-full" disabled={salvando} onClick={confirmar}>
            {textoBotaoSalvar(novos, vinculados)}
          </button>
        </div>
      </div>
    </>
  )
}
