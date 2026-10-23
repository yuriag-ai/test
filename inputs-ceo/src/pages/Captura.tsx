import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { FileText, ListChecks, Loader2, Mic, Pause, Play, Send, Square, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CampoPessoas, useAviso, useConfirmar } from '../components/ui'
import { MSG_SEM_IA } from '../lib/ambiente'
import { suportaGravacao, suportaTranscricao, useCaptura } from '../hooks/useCaptura'
import { useIA, useListas } from '../hooks/useDados'
import { processarComIA } from '../lib/api'
import { atualizarReuniao, criarReuniao, db, montarAudio, registrarPessoas } from '../lib/db'
import { ORIGENS } from '../lib/rotulos'
import type { ModoProcessamento, Origem, Reuniao } from '../lib/types'
import { formatarDuracao, hojeISO, horaAgora } from '../lib/util'

const ORIGENS_CAPTURA = ORIGENS.filter((o) => ['reuniao', 'agenda', 'visita_loja', 'evento', 'outro'].includes(o.valor))

export default function Captura() {
  const { id: idRota } = useParams()
  const navigate = useNavigate()
  const avisar = useAviso()
  const confirmar = useConfirmar()
  const ia = useIA()
  const { areas, marcas, pessoas, nomes } = useListas()

  const [reuniaoId, setReuniaoId] = useState<string | undefined>(idRota)
  const rascunho = useLiveQuery(() => (idRota ? db.reunioes.get(idRota) : undefined), [idRota])
  const carregado = useRef(false)

  const [titulo, setTitulo] = useState('')
  const [origem, setOrigem] = useState<Origem>('reuniao')
  const [local, setLocal] = useState('')
  const [participantes, setParticipantes] = useState<string[]>([])
  const [transcricao, setTranscricao] = useState('')
  const [anotacao, setAnotacao] = useState('')
  const [transcrever, setTranscrever] = useState(suportaTranscricao)
  const [gravarAudio, setGravarAudio] = useState(suportaGravacao)
  const [duracaoAnterior, setDuracaoAnterior] = useState(0)
  const [audioUrl, setAudioUrl] = useState('')
  const [processando, setProcessando] = useState<ModoProcessamento | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const transcrevendoAntesDaPausa = useRef(false)
  const fimTranscricao = useRef<HTMLDivElement>(null)

  const cap = useCaptura((trecho) => setTranscricao((t) => (t ? `${t}\n${trecho}` : trecho)))
  const gravando = cap.estado !== 'parado'
  const temConteudo = transcricao.trim().length > 0
  const segundosTotais = duracaoAnterior + cap.segundos

  // Carrega um rascunho existente (/captura/:id)
  useEffect(() => {
    if (!rascunho || carregado.current) return
    carregado.current = true
    setTitulo(rascunho.titulo)
    setOrigem(rascunho.origem)
    setLocal(rascunho.local)
    setParticipantes(rascunho.participantes)
    setTranscricao(rascunho.transcricao)
    setDuracaoAnterior(rascunho.duracaoSeg)
  }, [rascunho])

  // Áudio do rascunho
  useEffect(() => {
    if (!reuniaoId || gravando) return
    let url = ''
    void montarAudio(reuniaoId).then((blob) => {
      if (blob) {
        url = URL.createObjectURL(blob)
        setAudioUrl(url)
      }
    })
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [reuniaoId, gravando])

  // Salva a transcrição continuamente
  useEffect(() => {
    if (!reuniaoId) return
    const t = setTimeout(() => void atualizarReuniao(reuniaoId, { transcricao }), 1200)
    return () => clearTimeout(t)
  }, [reuniaoId, transcricao])

  useEffect(() => {
    if (!reuniaoId) return
    const t = setTimeout(() => void atualizarReuniao(reuniaoId, { titulo, origem, local, participantes }), 600)
    return () => clearTimeout(t)
  }, [reuniaoId, titulo, origem, local, participantes])

  // Guarda a duração a cada 10s: se o app for fechado no meio, a reunião não fica zerada
  const segundosRef = useRef(0)
  segundosRef.current = segundosTotais
  useEffect(() => {
    if (cap.estado !== 'gravando' || !reuniaoId) return
    const t = setInterval(() => void atualizarReuniao(reuniaoId, { duracaoSeg: segundosRef.current }), 10_000)
    return () => clearInterval(t)
  }, [cap.estado, reuniaoId])

  useEffect(() => {
    if (gravando) fimTranscricao.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcricao, cap.interino, gravando])

  useEffect(() => {
    if (!gravando) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [gravando])

  const iniciar = async () => {
    setErro(null)
    try {
      let id = reuniaoId
      const continuando = Boolean(id) && (duracaoAnterior > 0 || (await db.audio.where('reuniaoId').equals(id!).count()) > 0)
      if (!id) {
        const nova = await criarReuniao({ titulo, origem, local, participantes, hora: horaAgora(), data: hojeISO(), estado: 'gravando' })
        id = nova.id
        setReuniaoId(id)
        window.history.replaceState(null, '', `/captura/${id}`)
      } else {
        await atualizarReuniao(id, { estado: 'gravando' })
      }
      // Ao continuar um rascunho, só a transcrição é adicionada (o áudio original fica intacto).
      await cap.iniciar(id, { gravarAudio: gravarAudio && !continuando, transcrever })
    } catch (e) {
      const nome = (e as DOMException).name
      setErro(
        nome === 'NotAllowedError'
          ? 'Permita o uso do microfone nas configurações do navegador para gravar.'
          : 'Não foi possível acessar o microfone neste aparelho.',
      )
    }
  }

  const pausarOuRetomar = () => {
    if (cap.estado === 'gravando') transcrevendoAntesDaPausa.current = cap.pausar()
    else cap.retomar(transcrevendoAntesDaPausa.current || transcrever)
  }

  const parar = async () => {
    const r = await cap.parar()
    if (!reuniaoId) return
    const duracaoSeg = duracaoAnterior + r.duracaoSeg
    setDuracaoAnterior(duracaoSeg)
    const mudancas: Partial<Reuniao> = { estado: 'rascunho', duracaoSeg, transcricao }
    if (r.audioTipo) mudancas.audioTipo = r.audioTipo
    await atualizarReuniao(reuniaoId, mudancas)
    void registrarPessoas(participantes)
  }

  const destacar = () => {
    setTranscricao((t) => `${t}${t ? '\n' : ''}★ Destaque (${formatarDuracao(segundosTotais)})`)
    avisar('Momento destacado')
  }

  const anotar = () => {
    if (!anotacao.trim()) return
    setTranscricao((t) => `${t}${t ? '\n' : ''}[Nota] ${anotacao.trim()}`)
    setAnotacao('')
  }

  const processar = async (modo: ModoProcessamento) => {
    if (!reuniaoId) return
    setProcessando(modo)
    setErro(null)
    try {
      await atualizarReuniao(reuniaoId, { transcricao })
      const resultado = await processarComIA({
        modo,
        texto: transcricao,
        contexto: {
          titulo,
          data: rascunho?.data ?? hojeISO(),
          local,
          participantes,
          areas,
          marcas,
          pessoas: pessoas.map((p) => ({ nome: p.nome, area: p.area })),
        },
      })
      await atualizarReuniao(reuniaoId, {
        modo,
        ata: resultado.ata ?? undefined,
        propostas: resultado.acoes,
        titulo: titulo || resultado.ata?.titulo || '',
      })
      navigate(`/revisao/${reuniaoId}`, { replace: true })
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setProcessando(null)
    }
  }

  const sair = async () => {
    if (gravando && !(await confirmar({ titulo: 'Encerrar a gravação?', texto: 'O que foi gravado até agora fica salvo em Reuniões.', botao: 'Encerrar e sair' }))) return
    if (gravando) void parar()
    navigate(reuniaoId && temConteudo ? '/reunioes' : '/')
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 flex items-center gap-2 bg-papel/90 px-4 pb-2 pt-3 backdrop-blur">
        <button aria-label="Fechar" onClick={sair} className="-ml-2 rounded-full p-2 hover:bg-linho">
          <X size={22} />
        </button>
        <div className="flex-1 text-sm font-semibold text-grafite">
          {gravando ? (cap.estado === 'pausado' ? 'Pausado' : 'Gravando') : reuniaoId ? 'Captura' : 'Nova captura'}
        </div>
        {(gravando || segundosTotais > 0) && (
          <div className="flex items-center gap-2 font-mono text-sm tabular-nums text-grafite">
            {cap.estado === 'gravando' && <span className="h-2 w-2 animate-pulse rounded-full bg-bloqueado" />}
            {formatarDuracao(segundosTotais)}
          </div>
        )}
      </header>

      <div className="flex-1 space-y-4 px-4 pb-6">
        {!gravando && (
          <section className="space-y-3">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-transparent font-serif text-[24px] font-medium leading-tight outline-none placeholder:text-borda"
              placeholder="Título da reunião"
            />
            <div className="grid grid-cols-2 gap-2">
              <select className="campo" value={origem} onChange={(e) => setOrigem(e.target.value as Origem)}>
                {ORIGENS_CAPTURA.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
              <input className="campo" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Local" />
            </div>
            <CampoPessoas valor={participantes} aoMudar={setParticipantes} sugestoes={nomes} placeholder="Participantes" />
          </section>
        )}

        {/* Área central: botão de gravar ou transcrição ao vivo */}
        {!gravando && !temConteudo && (
          <section className="flex flex-col items-center pt-6 text-center">
            <button
              onClick={iniciar}
              disabled={!suportaGravacao && !suportaTranscricao}
              aria-label="Começar a gravar"
              className="group relative flex h-36 w-36 items-center justify-center rounded-full bg-tinta text-papel shadow-flutuante transition active:scale-95 disabled:opacity-40"
            >
              <span className="absolute inset-0 rounded-full ring-1 ring-tinta/10 transition group-hover:scale-110" />
              <Mic size={48} strokeWidth={1.5} />
            </button>
            <p className="mt-5 font-serif text-xl font-medium">Toque para começar</p>
            <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-grafite">
              O microfone capta o ambiente. Avise os presentes que a conversa será registrada.
            </p>
            <OpcoesCaptura
              transcrever={transcrever}
              setTranscrever={setTranscrever}
              gravarAudio={gravarAudio}
              setGravarAudio={setGravarAudio}
            />
          </section>
        )}

        {gravando && (
          <section className="flex flex-col items-center pb-2 pt-4">
            <div className="font-serif text-5xl font-medium lining-nums tabular-nums tracking-tight">{formatarDuracao(segundosTotais)}</div>
            <MedidorNivel nivel={cap.nivel} ativo={cap.estado === 'gravando'} />
          </section>
        )}

        {(gravando || temConteudo) && (
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="rotulo mb-0">Transcrição</span>
              {!gravando && <span className="text-[11px] text-nevoa">Toque para corrigir</span>}
            </div>
            {gravando ? (
              <div className="cartao max-h-[42vh] min-h-[30vh] overflow-y-auto whitespace-pre-wrap p-4 text-[15px] leading-relaxed">
                {transcricao || (!cap.interino && <span className="text-nevoa">{transcrever && suportaTranscricao ? 'Ouvindo…' : 'Gravando áudio. Use as anotações abaixo para registrar pontos.'}</span>)}
                {cap.interino && <span className="text-nevoa"> {cap.interino}</span>}
                <div ref={fimTranscricao} />
              </div>
            ) : (
              <textarea
                value={transcricao}
                onChange={(e) => setTranscricao(e.target.value)}
                rows={12}
                className="campo min-h-[40vh] leading-relaxed"
              />
            )}
          </section>
        )}

        {gravando && (
          <div className="flex gap-2">
            <input
              value={anotacao}
              onChange={(e) => setAnotacao(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && anotar()}
              className="campo"
              placeholder="Anotar um ponto…"
            />
            <button aria-label="Adicionar anotação" onClick={anotar} disabled={!anotacao.trim()} className="botao-secundario px-3.5">
              <Send size={17} />
            </button>
          </div>
        )}

        {cap.aviso && <p className="rounded-xl bg-pendente-claro p-3 text-[13px] text-pendente">{cap.aviso}</p>}
        {erro && <p className="rounded-xl bg-bloqueado-claro p-3 text-sm text-bloqueado">{erro}</p>}

        {!gravando && temConteudo && (
          <section className="space-y-3">
            {audioUrl && <audio controls src={audioUrl} className="w-full" />}
            {ia === false && (
              <p className="rounded-xl bg-linho p-3 text-[13px] leading-relaxed text-grafite">
                A geração de Ata e Plano de Ação precisa da IA. {MSG_SEM_IA} A captura fica salva em Reuniões.
              </p>
            )}
            <button className="botao-primario w-full py-3.5" disabled={!ia || Boolean(processando)} onClick={() => processar('ata')}>
              {processando === 'ata' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              Gerar Ata Executiva + Plano de Ação
            </button>
            <button className="botao-secundario w-full py-3.5" disabled={!ia || Boolean(processando)} onClick={() => processar('plano')}>
              {processando === 'plano' ? <Loader2 size={18} className="animate-spin" /> : <ListChecks size={18} />}
              Só o Plano de Ação
            </button>
            {processando && (
              <p className="text-center text-[13px] text-nevoa">Organizando a conversa… pode levar até 2 minutos em reuniões longas.</p>
            )}
            <div className="flex gap-2">
              <button className="botao-fantasma flex-1" disabled={Boolean(processando)} onClick={iniciar}>
                <Mic size={17} /> Gravar mais
              </button>
              <button className="botao-fantasma flex-1" disabled={Boolean(processando)} onClick={() => navigate('/reunioes')}>
                Salvar rascunho
              </button>
            </div>
          </section>
        )}
      </div>

      {gravando && (
        <div className="sticky bottom-0 border-t border-borda bg-papel/95 px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur">
          <div className="flex items-center justify-around">
            <BotaoControle rotulo="Destacar" onClick={destacar}>
              <Star size={22} />
            </BotaoControle>
            <button
              onClick={parar}
              aria-label="Encerrar gravação"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-bloqueado text-papel shadow-flutuante active:scale-95"
            >
              <Square size={28} fill="currentColor" />
            </button>
            <BotaoControle rotulo={cap.estado === 'pausado' ? 'Retomar' : 'Pausar'} onClick={pausarOuRetomar}>
              {cap.estado === 'pausado' ? <Play size={22} /> : <Pause size={22} />}
            </BotaoControle>
          </div>
        </div>
      )}
    </div>
  )
}

function BotaoControle({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-20 flex-col items-center gap-1 text-[12px] font-medium text-grafite">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-borda bg-superficie">{children}</span>
      {rotulo}
    </button>
  )
}

function MedidorNivel({ nivel, ativo }: { nivel: number; ativo: boolean }) {
  const barras = 21
  return (
    <div className="mt-4 flex h-10 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: barras }, (_, i) => {
        const centro = 1 - Math.abs(i - (barras - 1) / 2) / ((barras - 1) / 2)
        const altura = ativo ? Math.max(0.12, Math.min(1, nivel * (0.5 + centro) * (0.8 + ((i * 7) % 5) / 10))) : 0.12
        return (
          <span
            key={i}
            className={clsx('w-[3px] rounded-full transition-[height] duration-100', ativo ? 'bg-tinta' : 'bg-borda')}
            style={{ height: `${altura * 100}%` }}
          />
        )
      })}
    </div>
  )
}

function OpcoesCaptura({
  transcrever,
  setTranscrever,
  gravarAudio,
  setGravarAudio,
}: {
  transcrever: boolean
  setTranscrever: (v: boolean) => void
  gravarAudio: boolean
  setGravarAudio: (v: boolean) => void
}) {
  return (
    <div className="mt-8 w-full space-y-2 text-left">
      <Interruptor
        rotulo="Transcrever ao vivo"
        descricao={suportaTranscricao ? 'Texto em português enquanto falam (requer internet)' : 'Indisponível neste navegador — use o Chrome'}
        ligado={transcrever && suportaTranscricao}
        desabilitado={!suportaTranscricao}
        aoMudar={setTranscrever}
      />
      <Interruptor
        rotulo="Gravar áudio"
        descricao={suportaGravacao ? 'Guarda o áudio no aparelho para ouvir depois' : 'Indisponível neste navegador'}
        ligado={gravarAudio && suportaGravacao}
        desabilitado={!suportaGravacao}
        aoMudar={setGravarAudio}
      />
    </div>
  )
}

function Interruptor({
  rotulo,
  descricao,
  ligado,
  desabilitado,
  aoMudar,
}: {
  rotulo: string
  descricao: string
  ligado: boolean
  desabilitado?: boolean
  aoMudar: (v: boolean) => void
}) {
  return (
    <label className={clsx('cartao flex items-center gap-3 p-3.5', desabilitado && 'opacity-60')}>
      <div className="flex-1">
        <div className="text-sm font-medium">{rotulo}</div>
        <div className="text-[12px] text-nevoa">{descricao}</div>
      </div>
      <input type="checkbox" className="peer sr-only" checked={ligado} disabled={desabilitado} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="relative h-7 w-12 rounded-full bg-borda transition peer-checked:bg-tinta after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-superficie after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  )
}
