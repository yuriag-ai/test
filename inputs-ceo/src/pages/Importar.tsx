import clsx from 'clsx'
import { Camera, ChevronDown, FileText, ImageIcon, Loader2, Mic, Paperclip, RotateCcw, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AtaView } from '../components/AtaView'
import { RevisaoAcoes, paraRevisao } from '../components/RevisaoAcoes'
import { Cabecalho, CampoPessoas, Folha, useAviso, useConfirmar } from '../components/ui'
import { CEO, EM_ARTIFACT, MSG_SEM_IA } from '../lib/ambiente'
import { useIA, useListas } from '../hooks/useDados'
import { processarComIA } from '../lib/api'
import { ACEITOS, LIMITE_ANEXOS_BYTES, lerArquivo, tamanhoAnexos } from '../lib/arquivos'
import { aplicarRevisao, criarReuniao, db, registrarPessoas } from '../lib/db'
import { contarPalavras, detectarTipo, interpretarLocalmente, ROTULO_MATERIAL } from '../lib/material'
import { ORIGENS, ROTULO_ORIGEM, resumoSalvamento, textoBotaoSalvar } from '../lib/rotulos'
import type { AcaoRevisavel, ArquivoIA, AtaExecutiva, ModoProcessamento, Origem, Reuniao, TipoMaterial } from '../lib/types'
import { agoraISO, formatarData, hojeISO, unicos } from '../lib/util'

interface Lote {
  titulo: string
  origem: Origem
  data: string
  local: string
  participantes: string[]
}

interface Rascunho {
  etapa: 'material' | 'revisao'
  texto: string
  anexos: ArquivoIA[]
  tipo: TipoMaterial | null // null = detectar automaticamente
  gerarAta: boolean | null // null = padrão conforme o tipo
  lote: Lote
  loteManual: boolean
  acoes: AcaoRevisavel[]
  ata: AtaExecutiva | null
  viaIA: boolean
  aviso: string | null
}

const CHAVE_RASCUNHO = 'rascunho-importacao'

function rascunhoVazio(): Rascunho {
  return {
    etapa: 'material',
    texto: '',
    anexos: [],
    tipo: null,
    gerarAta: null,
    lote: { titulo: '', origem: 'agenda', data: hojeISO(), local: '', participantes: [] },
    loteManual: false,
    acoes: [],
    ata: null,
    viaIA: false,
    aviso: null,
  }
}

const EXEMPLO = `Cole aqui a transcrição, o resumo ou a lista. Exemplos:

1. Nome: pergunta ou pedido ${CEO.de}
2. Pedido ou assunto | Responsável
3. Relatório para 05.11. Enviado pela Ana.`

export default function Importar() {
  const navigate = useNavigate()
  const avisar = useAviso()
  const confirmar = useConfirmar()
  const ia = useIA()
  const { areas, marcas, pessoas } = useListas()
  const [r, setR] = useState<Rascunho>(rascunhoVazio)
  const [carregado, setCarregado] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [errosArquivo, setErrosArquivo] = useState<string[]>([])
  const [verOriginal, setVerOriginal] = useState(false)
  const [editarLote, setEditarLote] = useState(false)
  const [detalhesAbertos, setDetalhesAbertos] = useState(false)
  const [verAta, setVerAta] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const atualizar = (m: Partial<Rascunho>) => setR((atual) => ({ ...atual, ...m }))

  // Restaura e salva o rascunho (não perde a revisão se sair da tela)
  useEffect(() => {
    void db.config.get(CHAVE_RASCUNHO).then((salvo) => {
      if (salvo?.valor) {
        setR({ ...rascunhoVazio(), ...(salvo.valor as Rascunho) })
        if ((salvo.valor as Rascunho).etapa === 'revisao') avisar('Revisão em andamento restaurada')
      }
      setCarregado(true)
    })
  }, [avisar])

  useEffect(() => {
    if (!carregado) return
    const vazio = !r.texto.trim() && !r.anexos.length && !r.acoes.length
    const t = setTimeout(() => {
      if (vazio) void db.config.delete(CHAVE_RASCUNHO)
      else void db.config.put({ chave: CHAVE_RASCUNHO, valor: { ...r, salvoEm: agoraISO() } })
    }, 400)
    return () => clearTimeout(t)
  }, [r, carregado])

  const tipoDetectado: TipoMaterial = r.texto.trim() ? detectarTipo(r.texto) : 'resumo'
  const tipo = r.tipo ?? tipoDetectado
  const gerarAta = r.gerarAta ?? tipo === 'transcricao'
  const temMaterial = Boolean(r.texto.trim() || r.anexos.length)

  // Origem padrão acompanha o tipo de material até o usuário mexer
  useEffect(() => {
    if (r.loteManual || !temMaterial) return
    const origem: Origem = tipo === 'lista' ? 'agenda' : 'reuniao'
    if (r.lote.origem !== origem) setR((atual) => ({ ...atual, lote: { ...atual.lote, origem } }))
  }, [tipo, temMaterial, r.loteManual, r.lote.origem])

  const mudarLote = (m: Partial<Lote>) => setR((atual) => ({ ...atual, lote: { ...atual.lote, ...m }, loteManual: true }))

  const adicionarArquivos = async (lista: FileList | null) => {
    if (!lista?.length) return
    const lidos = await Promise.all([...lista].map(lerArquivo))
    const textos = lidos.filter((l) => l.texto).map((l) => l.texto!.trim())
    const anexos = lidos.flatMap((l) => (l.anexo ? [l.anexo] : []))
    setErrosArquivo(lidos.filter((l) => l.erro).map((l) => `${l.nome}: ${l.erro}`))
    const tipoDoArquivo = lidos.find((l) => l.tipo)?.tipo
    setR((atual) => ({
      ...atual,
      texto: [atual.texto.trim(), ...textos].filter(Boolean).join('\n\n'),
      anexos: [...atual.anexos, ...anexos],
      tipo: atual.tipo ?? tipoDoArquivo ?? null,
    }))
    if (textos.length) avisar(textos.length === 1 ? 'Texto do arquivo adicionado' : `${textos.length} arquivos adicionados`)
  }

  const interpretar = async () => {
    setErro(null)
    const opcoes = { dataReferencia: r.lote.data, areas, marcas }
    const precisaIA = r.anexos.length > 0 || tipo !== 'lista' || gerarAta

    if (!precisaIA) {
      const acoes = interpretarLocalmente(r.texto, 'lista', opcoes)
      if (!acoes.length) return setErro('Não encontrei itens neste texto.')
      atualizar({ etapa: 'revisao', acoes: paraRevisao(acoes), ata: null, viaIA: false, aviso: null })
      return window.scrollTo({ top: 0 })
    }

    if (!ia) {
      if (r.anexos.length) return setErro(`Para ler PDFs e fotos é preciso a IA. ${MSG_SEM_IA}`)
      const acoes = interpretarLocalmente(r.texto, tipo, opcoes)
      if (!acoes.length) {
        return setErro(
          `Sem a IA, só consigo ler listas e seções de "próximos passos" / "ações". Este material precisa da IA. ${MSG_SEM_IA}`,
        )
      }
      const primeiraLinha = r.texto.trim().split('\n')[0].replace(/^#+\s*|\*\*/g, '').trim()
      const pareceTitulo = primeiraLinha.length <= 80 && !/^\S.{0,40}:\s/.test(primeiraLinha) && !/^\s*(?:\d+[.)]|[-•*])\s/.test(primeiraLinha)
      setR((atual) => ({
        ...atual,
        etapa: 'revisao',
        acoes: paraRevisao(acoes),
        ata: null,
        viaIA: false,
        aviso: `Sem IA: encontrei ${acoes.length} itens nas seções de ações do texto. Confira se falta algo.`,
        lote: { ...atual.lote, titulo: atual.lote.titulo || (pareceTitulo ? primeiraLinha : '') },
      }))
      return window.scrollTo({ top: 0 })
    }

    if (tamanhoAnexos(r.anexos) > LIMITE_ANEXOS_BYTES) {
      return setErro('Os arquivos somam mais de 3,5 MB. Envie menos fotos/páginas por vez.')
    }

    setProcessando(true)
    try {
      const modo: ModoProcessamento = gerarAta ? 'ata' : tipo === 'lista' ? 'lista' : 'plano'
      const resultado = await processarComIA({
        modo,
        texto: r.texto,
        arquivos: r.anexos,
        tipoMaterial: r.tipo ?? undefined,
        contexto: {
          titulo: r.lote.titulo,
          data: r.lote.data,
          local: r.lote.local,
          participantes: r.lote.participantes,
          areas,
          marcas,
          pessoas: pessoas.map((p) => ({ nome: p.nome, area: p.area })),
        },
      })
      const meta = resultado.meta
      setR((atual) => ({
        ...atual,
        etapa: 'revisao',
        acoes: paraRevisao(resultado.acoes),
        ata: resultado.ata,
        viaIA: true,
        aviso: resultado.acoes.length ? null : 'A IA não encontrou ações neste material.',
        tipo: atual.tipo ?? meta?.tipoMaterial ?? null,
        lote: {
          ...atual.lote,
          titulo: atual.lote.titulo || meta?.titulo || resultado.ata?.titulo || '',
          data: !atual.loteManual && meta?.data && /^\d{4}-\d{2}-\d{2}$/.test(meta.data) ? meta.data : atual.lote.data,
          local: atual.lote.local || meta?.local || '',
          participantes: unicos([...atual.lote.participantes, ...(meta?.participantes ?? [])]),
        },
      }))
      window.scrollTo({ top: 0 })
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setProcessando(false)
    }
  }

  const refinarLista = async () => {
    setProcessando(true)
    setErro(null)
    try {
      const resultado = await processarComIA({
        modo: 'lista',
        texto: r.texto,
        contexto: { data: r.lote.data, local: r.lote.local, areas, marcas, pessoas: pessoas.map((p) => ({ nome: p.nome, area: p.area })) },
      })
      atualizar({ acoes: paraRevisao(resultado.acoes), viaIA: true })
      avisar('Lista refinada pela IA')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setProcessando(false)
    }
  }

  const salvar = async () => {
    const ehReuniao = Boolean(r.ata) || tipo !== 'lista'
    let reuniaoId: string | undefined
    if (ehReuniao) {
      const reuniao = await criarReuniao({
        titulo: r.lote.titulo || r.ata?.titulo || '',
        data: r.lote.data,
        local: r.lote.local,
        origem: r.lote.origem,
        participantes: r.lote.participantes,
        transcricao: r.texto,
        ata: r.ata ?? undefined,
        modo: r.ata ? 'ata' : 'plano',
        estado: 'processada',
      })
      reuniaoId = reuniao.id
    }
    const { criados, atualizados } = await aplicarRevisao(r.acoes, {
      reuniaoId,
      data: r.lote.data,
      local: r.lote.local,
      origem: r.lote.origem,
    })
    await registrarPessoas(r.lote.participantes)
    await db.config.delete(CHAVE_RASCUNHO)
    setR(rascunhoVazio())
    avisar(resumoSalvamento(criados.length, atualizados) || 'Salvo')
    navigate(reuniaoId ? `/reunioes/${reuniaoId}` : '/', { replace: true })
  }

  const recomecar = async () => {
    if (r.acoes.length || r.texto.trim()) {
      const ok = await confirmar({ titulo: 'Descartar este material?', texto: 'O texto, os arquivos e a revisão serão apagados.', botao: 'Descartar', perigo: true })
      if (!ok) return
    }
    setR(rascunhoVazio())
    setErro(null)
    setErrosArquivo([])
  }

  // ---------------- Revisão ----------------
  if (r.etapa === 'revisao') {
    const novos = r.acoes.filter((a) => a.incluir && !a.vinculo).length
    const vinculados = r.acoes.filter((a) => a.incluir && a.vinculo).length
    const reuniaoVirtual: Reuniao = {
      id: '',
      titulo: r.lote.titulo,
      data: r.lote.data,
      hora: '',
      local: r.lote.local,
      origem: r.lote.origem,
      participantes: r.lote.participantes,
      transcricao: '',
      duracaoSeg: 0,
      estado: 'rascunho',
      criadoEm: '',
      atualizadoEm: '',
    }
    return (
      <>
        <Cabecalho
          titulo="Revisar"
          voltar={false}
          acoes={
            <>
              <button className="botao-fantasma py-1.5 text-sm" onClick={() => setVerOriginal(true)}>
                <FileText size={16} /> Original
              </button>
              <button aria-label="Descartar" className="rounded-full p-2 text-nevoa hover:bg-linho" onClick={recomecar}>
                <RotateCcw size={18} />
              </button>
            </>
          }
          subtitulo={
            <>
              {r.viaIA ? 'Interpretado pela IA' : 'Organizado automaticamente'} · {ROTULO_MATERIAL[tipo]}. Nada é salvo sem a sua
              confirmação.
            </>
          }
        />
        <div className="space-y-4 px-4 pb-36">
          <button onClick={() => setEditarLote(true)} className="cartao flex w-full items-center gap-3 p-3.5 text-left">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.lote.titulo || 'Sem título'}</div>
              <div className="truncate text-xs text-nevoa">
                {[ROTULO_ORIGEM[r.lote.origem], formatarData(r.lote.data, true), r.lote.local].filter(Boolean).join(' · ')}
                {r.lote.participantes.length > 0 && ` · ${r.lote.participantes.length} participantes`}
              </div>
            </div>
            <span className="text-[13px] font-medium text-couro">Editar</span>
          </button>

          {!r.viaIA && ia && tipo === 'lista' && (
            <div className="flex items-center gap-3 rounded-2xl bg-couro-claro p-3.5">
              <Sparkles size={20} className="shrink-0 text-couro" />
              <p className="flex-1 text-[13px] leading-snug text-couro-escuro">A IA pode melhorar títulos, áreas e responsáveis.</p>
              <button className="botao rounded-lg bg-couro px-3 py-2 text-sm text-papel" onClick={refinarLista} disabled={processando}>
                {processando ? <Loader2 size={16} className="animate-spin" /> : 'Refinar'}
              </button>
            </div>
          )}
          {r.aviso && <p className="rounded-xl bg-pendente-claro p-3 text-[13px] text-pendente">{r.aviso}</p>}
          {erro && <p className="rounded-xl bg-bloqueado-claro p-3 text-sm text-bloqueado">{erro}</p>}

          {r.ata &&
            (verAta ? (
              <div>
                <AtaView reuniao={reuniaoVirtual} ata={r.ata} />
                <button className="mt-2 w-full py-2 text-[13px] font-medium text-couro" onClick={() => setVerAta(false)}>
                  Recolher ata
                </button>
              </div>
            ) : (
              <button onClick={() => setVerAta(true)} className="cartao block w-full p-4 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-couro">Ata executiva</div>
                <div className="mt-1 font-serif text-xl font-medium">{r.ata.titulo}</div>
                <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-grafite">{r.ata.resumoExecutivo}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-couro">
                  Ver ata completa <ChevronDown size={14} />
                </span>
              </button>
            ))}

          <section>
            <h2 className="mb-3 font-serif text-2xl font-medium">Ações</h2>
            <RevisaoAcoes acoes={r.acoes} aoMudar={(acoes) => atualizar({ acoes })} />
          </section>
        </div>

        <div className="nao-imprimir fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-20 mx-auto max-w-xl px-4">
          <div className="flex gap-2 rounded-2xl bg-papel/95 p-2 shadow-flutuante backdrop-blur">
            <button className="botao-secundario" onClick={() => atualizar({ etapa: 'material' })}>
              Voltar
            </button>
            <button className="botao-primario flex-1" onClick={salvar}>
              {textoBotaoSalvar(novos, vinculados)}
            </button>
          </div>
        </div>

        <Folha aberta={verOriginal} aoFechar={() => setVerOriginal(false)} titulo="Material original">
          {r.anexos.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {r.anexos.map((a) => (
                <span key={a.nome} className="chip bg-linho">
                  {a.tipo === 'application/pdf' ? <FileText size={13} /> : <ImageIcon size={13} />} {a.nome}
                </span>
              ))}
            </div>
          )}
          {r.texto ? (
            <div className="whitespace-pre-wrap rounded-xl bg-superficie p-3 text-[13px] leading-relaxed text-grafite">{r.texto}</div>
          ) : (
            <p className="text-sm text-nevoa">Sem texto colado.</p>
          )}
        </Folha>

        <Folha aberta={editarLote} aoFechar={() => setEditarLote(false)} titulo="Dados do encontro">
          <CamposLote lote={r.lote} aoMudar={mudarLote} />
          <button className="botao-primario mt-4 w-full" onClick={() => setEditarLote(false)}>
            Pronto
          </button>
        </Folha>
      </>
    )
  }

  // ---------------- Material ----------------
  const palavras = contarPalavras(r.texto)
  return (
    <>
      <Cabecalho
        titulo="Importar"
        subtitulo="Transcrição, resumo, lista de tarefas ou foto de anotações."
        acoes={
          temMaterial && (
            <button aria-label="Recomeçar" className="rounded-full p-2 text-nevoa hover:bg-linho" onClick={recomecar}>
              <RotateCcw size={18} />
            </button>
          )
        }
      />
      <div className="space-y-5 px-4 pb-8">
        <div className="grid grid-cols-2 gap-2">
          <button className="cartao flex flex-col items-center gap-1.5 p-4 text-sm font-medium" onClick={() => arquivoRef.current?.click()}>
            <Paperclip size={22} className="text-couro" />
            Escolher arquivo
            <span className="text-[11px] font-normal text-nevoa">TXT, DOCX, PDF, SRT, VTT</span>
          </button>
          <button className="cartao flex flex-col items-center gap-1.5 p-4 text-sm font-medium" onClick={() => cameraRef.current?.click()}>
            <Camera size={22} className="text-couro" />
            Foto de anotações
            <span className="text-[11px] font-normal text-nevoa">caderno, quadro, print</span>
          </button>
          <input
            ref={arquivoRef}
            type="file"
            multiple
            accept={ACEITOS}
            hidden
            onChange={(e) => void adicionarArquivos(e.target.files).then(() => (e.target.value = ''))}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void adicionarArquivos(e.target.files).then(() => (e.target.value = ''))}
          />
        </div>

        {(r.anexos.length > 0 || errosArquivo.length > 0) && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {r.anexos.map((a, i) => (
                <span key={`${a.nome}-${i}`} className="chip border border-borda bg-superficie py-1.5">
                  {a.tipo === 'application/pdf' ? <FileText size={13} /> : <ImageIcon size={13} />}
                  <span className="max-w-[12rem] truncate">{a.nome}</span>
                  <button aria-label={`Remover ${a.nome}`} onClick={() => atualizar({ anexos: r.anexos.filter((_, j) => j !== i) })}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
            {errosArquivo.map((e) => (
              <p key={e} className="text-[13px] text-bloqueado">
                {e}
              </p>
            ))}
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label className="rotulo mb-0" htmlFor="material">
              {r.anexos.length ? 'Texto adicional (opcional)' : 'Ou cole o texto'}
            </label>
            {palavras > 0 && <span className="text-[11px] text-nevoa">{palavras.toLocaleString('pt-BR')} palavras</span>}
          </div>
          <textarea
            id="material"
            rows={r.texto ? 12 : 8}
            value={r.texto}
            onChange={(e) => atualizar({ texto: e.target.value })}
            className="campo text-[14px] leading-relaxed"
            placeholder={EXEMPLO}
          />
        </div>

        {temMaterial && (
          <>
            <div>
              <div className="rotulo">Tipo de material</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(ROTULO_MATERIAL) as TipoMaterial[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => atualizar({ tipo: r.tipo === t ? null : t })}
                    className={clsx(
                      'rounded-xl border px-2 py-2.5 text-[13px] font-medium leading-tight',
                      tipo === t ? 'border-tinta bg-tinta text-papel' : 'border-borda bg-superficie text-grafite',
                    )}
                  >
                    {ROTULO_MATERIAL[t]}
                    {tipo === t && !r.tipo && r.texto.trim() && <span className="block text-[10px] font-normal opacity-70">detectado</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="rotulo">O que gerar</div>
              <div className="grid grid-cols-2 gap-2">
                <OpcaoGerar
                  ativa={!gerarAta}
                  titulo="Plano de ação"
                  texto="Só os inputs, com responsáveis e prazos"
                  onClick={() => atualizar({ gerarAta: false })}
                />
                <OpcaoGerar
                  ativa={gerarAta}
                  titulo="Ata + plano"
                  texto="Ata executiva e os inputs"
                  onClick={() => atualizar({ gerarAta: true })}
                />
              </div>
            </div>

            <div>
              <button onClick={() => setDetalhesAbertos(!detalhesAbertos)} className="flex w-full items-center justify-between py-1">
                <span className="rotulo mb-0">Dados do encontro (opcional)</span>
                <ChevronDown size={17} className={clsx('text-nevoa transition', detalhesAbertos && 'rotate-180')} />
              </button>
              {detalhesAbertos ? (
                <div className="mt-2">
                  <CamposLote lote={r.lote} aoMudar={mudarLote} />
                  <p className="mt-2 text-[12px] text-nevoa">Se o material trouxer título, data ou participantes, a IA preenche o que estiver vazio.</p>
                </div>
              ) : (
                <p className="text-[13px] text-grafite">
                  {[ROTULO_ORIGEM[r.lote.origem], formatarData(r.lote.data, true), r.lote.local, r.lote.titulo].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </>
        )}

        {erro && <p className="rounded-xl bg-bloqueado-claro p-3 text-sm text-bloqueado">{erro}</p>}

        <button className="botao-primario w-full py-3.5" disabled={!temMaterial || processando} onClick={interpretar}>
          {processando ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {processando ? 'Interpretando…' : 'Interpretar material'}
        </button>
        {processando && (
          <p className="-mt-2 text-center text-[13px] text-nevoa">
            {tipo === 'transcricao' ? 'Lendo a conversa inteira — pode levar até 2 minutos.' : 'Organizando os itens…'}
          </p>
        )}
        {ia === false && temMaterial && tipo !== 'lista' && (
          <p className="text-center text-[12px] leading-relaxed text-nevoa">
            Sem IA nesta visualização: só listas e seções de "próximos passos" serão lidas.
          </p>
        )}

        {!EM_ARTIFACT && (
          <Link to="/captura" className="flex items-center justify-center gap-2 py-2 text-[13px] font-medium text-grafite">
            <Mic size={15} /> Prefere gravar aqui? Gravar no celular
          </Link>
        )}
      </div>
    </>
  )
}

function OpcaoGerar({ ativa, titulo, texto, onClick }: { ativa: boolean; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx('rounded-2xl border p-3 text-left transition', ativa ? 'border-tinta bg-superficie ring-1 ring-tinta' : 'border-borda bg-superficie')}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={clsx('h-4 w-4 rounded-full border-2', ativa ? 'border-[5px] border-tinta' : 'border-borda')} />
        {titulo}
      </div>
      <div className="mt-1 text-[12px] leading-snug text-nevoa">{texto}</div>
    </button>
  )
}

function CamposLote({ lote, aoMudar }: { lote: Lote; aoMudar: (m: Partial<Lote>) => void }) {
  const { nomes } = useListas()
  return (
    <div className="space-y-3">
      <div>
        <label className="rotulo">Título</label>
        <input className="campo" value={lote.titulo} onChange={(e) => aoMudar({ titulo: e.target.value })} placeholder="Ex.: Comitê de produto" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="rotulo">Onde foi falado</label>
          <select className="campo" value={lote.origem} onChange={(e) => aoMudar({ origem: e.target.value as Origem })}>
            {ORIGENS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo">Data</label>
          <input type="date" className="campo" value={lote.data} onChange={(e) => e.target.value && aoMudar({ data: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="rotulo">Local</label>
        <input className="campo" value={lote.local} onChange={(e) => aoMudar({ local: e.target.value })} placeholder="Ex.: Escritório SP" />
      </div>
      <div>
        <label className="rotulo">Participantes</label>
        <CampoPessoas valor={lote.participantes} aoMudar={(participantes) => aoMudar({ participantes })} sugestoes={nomes} placeholder="Quem estava" />
      </div>
    </div>
  )
}
