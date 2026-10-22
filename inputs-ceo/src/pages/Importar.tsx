import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RevisaoAcoes, paraRevisao, type AcaoRevisavel } from '../components/RevisaoAcoes'
import { Cabecalho, useAviso } from '../components/ui'
import { useIA, useListas } from '../hooks/useDados'
import { processarComIA } from '../lib/api'
import { criarInputsDeAcoes } from '../lib/db'
import { importarLista } from '../lib/importador'
import { ORIGENS } from '../lib/rotulos'
import type { Origem } from '../lib/types'
import { hojeISO } from '../lib/util'

const EXEMPLO = `1. Nome: pergunta ou pedido do Alexandre
2. Pedido ou assunto | Responsável
3. Relatório para 05.11. Enviado pela Ana.`

export default function Importar() {
  const navigate = useNavigate()
  const avisar = useAviso()
  const ia = useIA()
  const { areas, marcas, pessoas } = useListas()
  const [texto, setTexto] = useState('')
  const [origem, setOrigem] = useState<Origem>('agenda')
  const [data, setData] = useState(hojeISO())
  const [local, setLocal] = useState('')
  const [acoes, setAcoes] = useState<AcaoRevisavel[] | null>(null)
  const [refinando, setRefinando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const organizar = () => {
    setErro(null)
    setAcoes(paraRevisao(importarLista(texto, { dataReferencia: data, areas, marcas })))
  }

  const refinar = async () => {
    setRefinando(true)
    setErro(null)
    try {
      const r = await processarComIA({
        modo: 'lista',
        texto,
        contexto: { data, local, areas, marcas, pessoas: pessoas.map((p) => ({ nome: p.nome, area: p.area })) },
      })
      setAcoes(paraRevisao(r.acoes))
      avisar('Lista refinada pela IA')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setRefinando(false)
    }
  }

  const criar = async () => {
    const selecionadas = (acoes ?? []).filter((a) => a.incluir)
    const criados = await criarInputsDeAcoes(selecionadas, { data, local, origem })
    avisar(`${criados.length} inputs criados`)
    navigate('/', { replace: true })
  }

  if (acoes) {
    const total = acoes.filter((a) => a.incluir).length
    return (
      <>
        <Cabecalho titulo="Revisar inputs" voltar subtitulo="Confira responsáveis, áreas e prazos antes de criar." />
        <div className="space-y-4 px-4 pb-32">
          {ia && (
            <div className="flex items-center gap-3 rounded-2xl bg-couro-claro p-3.5">
              <Sparkles size={20} className="shrink-0 text-couro" />
              <p className="flex-1 text-[13px] leading-snug text-couro-escuro">
                Organizado automaticamente. A IA pode melhorar títulos, áreas e responsáveis.
              </p>
              <button className="botao rounded-lg bg-couro px-3 py-2 text-sm text-white" onClick={refinar} disabled={refinando}>
                {refinando ? <Loader2 size={16} className="animate-spin" /> : 'Refinar'}
              </button>
            </div>
          )}
          {erro && <p className="rounded-xl bg-bloqueado-claro p-3 text-sm text-bloqueado">{erro}</p>}
          <RevisaoAcoes acoes={acoes} aoMudar={setAcoes} />
        </div>
        <div className="nao-imprimir fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-20 mx-auto max-w-xl px-4">
          <div className="flex gap-2 rounded-2xl bg-papel/95 p-2 shadow-flutuante backdrop-blur">
            <button className="botao-secundario" onClick={() => setAcoes(null)}>
              Voltar
            </button>
            <button className="botao-primario flex-1" disabled={!total} onClick={criar}>
              Criar {total} {total === 1 ? 'input' : 'inputs'}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Cabecalho titulo="Importar lista" voltar subtitulo="Cole os inputs como vieram (agenda, WhatsApp, anotações)." />
      <div className="space-y-5 px-4 pb-8">
        <textarea
          autoFocus
          rows={12}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="campo font-mono text-[13px] leading-relaxed"
          placeholder={EXEMPLO}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo">Onde foi falado</label>
            <select className="campo" value={origem} onChange={(e) => setOrigem(e.target.value as Origem)}>
              {ORIGENS.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo">Data</label>
            <input type="date" className="campo" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="rotulo">Local (opcional)</label>
            <input className="campo" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Visita a lojas SP" />
          </div>
        </div>
        <div className="rounded-2xl bg-linho p-4 text-[13px] leading-relaxed text-grafite">
          <strong className="font-semibold text-tinta">Como o app entende a lista:</strong> "Nome: pedido" e "pedido | Nome" viram
          responsáveis; "Enviado." e "Em andamento." viram status; datas como 03.11 viram prazo. Tudo pode ser ajustado na revisão.
        </div>
        <button className="botao-primario w-full" disabled={!texto.trim()} onClick={organizar}>
          <Wand2 size={18} /> Organizar inputs
        </button>
      </div>
    </>
  )
}
