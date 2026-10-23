import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, ExternalLink, FileText, MessageSquarePlus, Paperclip, Quote, Share2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AreaTexto, Cabecalho, CampoLista, CampoPessoas, Secao, SeletorStatus, useAviso, useCompartilhar, useConfirmar } from '../components/ui'
import { EM_ARTIFACT } from '../lib/ambiente'
import { useListas } from '../hooks/useDados'
import { adicionarAnexos, adicionarNota, atualizarInput, db, excluirInput } from '../lib/db'
import { salvarArquivo } from '../lib/exportar'
import { ORIGENS, PRIORIDADES, ROTULO_STATUS } from '../lib/rotulos'
import type { Anexo, Input, Origem, Prioridade } from '../lib/types'
import { formatarData, formatarDataHora, formatarTamanho } from '../lib/util'

export default function DetalheInput() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const avisar = useAviso()
  const confirmar = useConfirmar()
  const compartilhar = useCompartilhar()
  const input = useLiveQuery(() => db.inputs.get(id).then((i) => i ?? null), [id])
  const reuniao = useLiveQuery(() => (input?.reuniaoId ? db.reunioes.get(input.reuniaoId) : undefined), [input?.reuniaoId])
  const { areas, marcas, nomes } = useListas()

  if (input === undefined) return <Cabecalho titulo="" voltar />
  if (input === null) {
    return (
      <>
        <Cabecalho sobrelinha="Input" voltar="/" />
        <p className="px-4 py-12 text-center text-sm text-nevoa">Este input não existe mais.</p>
      </>
    )
  }

  const salvar = (mudancas: Partial<Input>) => void atualizarInput(id, mudancas)

  const compartilharInput = () => {
    const texto = [
      `#${input.numero} ${input.titulo}`,
      input.descricao !== input.titulo ? input.descricao : '',
      `Responsável: ${input.responsaveis.join(', ') || 'a definir'}`,
      input.prazo ? `Prazo: ${formatarData(input.prazo, true)}` : '',
      `Status: ${ROTULO_STATUS[input.status]}`,
    ]
      .filter(Boolean)
      .join('\n')
    void compartilhar(input.titulo, texto)
  }

  const excluir = async () => {
    const ok = await confirmar({
      titulo: `Excluir o input #${input.numero}?`,
      texto: 'O histórico e os anexos também serão apagados.',
      botao: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    await excluirInput(id)
    avisar('Input excluído')
    navigate('/', { replace: true })
  }

  return (
    <>
      <Cabecalho
        voltar
        sobrelinha={`Input #${input.numero}`}
        acoes={
          <>
            <button aria-label="Compartilhar" className="rounded-full p-2 hover:bg-linho" onClick={compartilharInput}>
              <Share2 size={19} />
            </button>
            <button aria-label="Excluir" className="rounded-full p-2 text-perigo hover:bg-ruim-claro" onClick={excluir}>
              <Trash2 size={19} />
            </button>
          </>
        }
      />

      <div className="space-y-7 px-4 pb-8 pt-1">
        <TextoEditavel
          key={`t-${input.id}`}
          valor={input.titulo}
          aoSalvar={(titulo) => titulo.trim() && salvar({ titulo: titulo.trim() })}
          className="w-full resize-none bg-transparent text-[22px] font-extrabold leading-[1.15] tracking-[-0.01em] outline-none"
          placeholder="Título"
        />

        <div className="flex flex-wrap items-center gap-2">
          <SeletorStatus grande status={input.status} aoMudar={(status) => salvar({ status })} />
          <div className="flex rounded-md border border-borda bg-superficie p-0.5">
            {PRIORIDADES.map((p) => (
              <button
                key={p.valor}
                onClick={() => salvar({ prioridade: p.valor as Prioridade })}
                className={clsx(
                  'rounded px-3 py-1.5 text-xs font-bold',
                  input.prioridade === p.valor ? (p.valor === 'alta' ? 'bg-aqua text-black' : 'bg-tinta text-papel') : 'text-grafite',
                )}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>

        <Secao titulo="Dono e prazo" className="space-y-4">
          <div>
            <label className="rotulo">Responsáveis</label>
            <CampoPessoas valor={input.responsaveis} aoMudar={(responsaveis) => salvar({ responsaveis })} sugestoes={nomes} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Prazo</label>
              <input type="date" className="campo" value={input.prazo} onChange={(e) => salvar({ prazo: e.target.value })} />
            </div>
            <div>
              <label className="rotulo">Data do input</label>
              <input
                type="date"
                className="campo"
                value={input.dataInput}
                onChange={(e) => e.target.value && salvar({ dataInput: e.target.value })}
              />
            </div>
            <div>
              <label className="rotulo">Área</label>
              <CampoLista valor={input.area} opcoes={areas} aoMudar={(area) => salvar({ area })} />
            </div>
            <div>
              <label className="rotulo">Marca</label>
              <CampoLista valor={input.marca} opcoes={marcas} aoMudar={(marca) => salvar({ marca })} />
            </div>
            <div>
              <label className="rotulo">Onde foi falado</label>
              <select className="campo" value={input.origem} onChange={(e) => salvar({ origem: e.target.value as Origem })}>
                {ORIGENS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo">Local</label>
              <TextoEditavel
                key={`l-${input.id}`}
                linha
                valor={input.local}
                aoSalvar={(local) => salvar({ local: local.trim() })}
                className="campo"
                placeholder="Ex.: Loja Oscar Freire"
              />
            </div>
          </div>
          {reuniao && (
            <Link to={`/reunioes/${reuniao.id}`} className="flex items-center gap-2 rounded-md bg-aqua-claro px-3 py-2.5 text-sm">
              <FileText size={16} />
              <span className="flex-1 truncate">
                Origem: <strong className="font-bold">{reuniao.titulo || 'Reunião'}</strong> · {formatarData(reuniao.data)}
              </span>
              <ExternalLink size={14} className="text-nevoa" />
            </Link>
          )}
        </Secao>

        <Secao titulo="O que foi pedido">
          <TextoEditavel
            key={`d-${input.id}`}
            valor={input.descricao}
            aoSalvar={(descricao) => salvar({ descricao: descricao.trim() })}
            className="campo min-h-[96px] leading-relaxed"
            placeholder="Descrição completa do input"
          />
          {input.citacao && (
            <blockquote className="destaque-fino mt-3 italic text-grafite">
              <Quote size={14} className="mt-1 shrink-0 text-tinta" />
              {input.citacao}
            </blockquote>
          )}
        </Secao>

        <Secao titulo="Contexto e observações" className="space-y-3">
          <div>
            <label className="rotulo">Contexto</label>
            <TextoEditavel
              key={`c-${input.id}`}
              valor={input.contexto}
              aoSalvar={(contexto) => salvar({ contexto: contexto.trim() })}
              className="campo min-h-[72px] leading-relaxed"
              placeholder="Em que conversa surgiu, por que é importante…"
            />
          </div>
          <div>
            <label className="rotulo">Observações</label>
            <TextoEditavel
              key={`o-${input.id}`}
              valor={input.observacoes}
              aoSalvar={(observacoes) => salvar({ observacoes: observacoes.trim() })}
              className="campo min-h-[72px] leading-relaxed"
              placeholder="Notas internas, links, combinados…"
            />
          </div>
        </Secao>

        <Anexos inputId={input.id} />

        <Historico input={input} />
      </div>
    </>
  )
}

function TextoEditavel({
  valor,
  aoSalvar,
  className,
  placeholder,
  linha,
}: {
  valor: string
  aoSalvar: (v: string) => void
  className?: string
  placeholder?: string
  linha?: boolean
}) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  const salvar = () => texto !== valor && aoSalvar(texto)
  if (linha) {
    return (
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className={className}
        placeholder={placeholder}
      />
    )
  }
  return (
    <AreaTexto
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={salvar}
      className={className}
      placeholder={placeholder}
    />
  )
}

function Anexos({ inputId }: { inputId: string }) {
  const anexos = useLiveQuery(() => db.anexos.where('inputId').equals(inputId).sortBy('criadoEm'), [inputId]) ?? []
  const arquivo = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const avisar = useAviso()

  const adicionar = async (lista: FileList | null) => {
    if (!lista?.length) return
    await adicionarAnexos(inputId, [...lista])
    avisar(lista.length === 1 ? 'Anexo adicionado' : `${lista.length} anexos adicionados`)
  }

  return (
    <Secao
      titulo={<>Anexos {anexos.length > 0 && <span className="mt-numero ml-1 align-middle">{anexos.length}</span>}</>}
      acoes={
        <div className="-my-1 flex gap-1">
          <button className="botao-fantasma py-1.5 text-sm" onClick={() => camera.current?.click()}>
            <Camera size={16} /> Foto
          </button>
          <button className="botao-fantasma py-1.5 text-sm" onClick={() => arquivo.current?.click()}>
            <Paperclip size={16} /> Arquivo
          </button>
        </div>
      }
    >
      <input ref={arquivo} type="file" multiple hidden onChange={(e) => void adicionar(e.target.files).then(() => (e.target.value = ''))} />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void adicionar(e.target.files).then(() => (e.target.value = ''))}
      />
      {anexos.length === 0 ? (
        <button
          onClick={() => arquivo.current?.click()}
          className="w-full rounded-md border border-dashed border-borda py-6 text-sm text-nevoa"
        >
          Fotos, PDFs, planilhas, apresentações…
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {anexos.map((a) => (
            <ItemAnexo key={a.id} anexo={a} />
          ))}
        </ul>
      )}
    </Secao>
  )
}

function ItemAnexo({ anexo }: { anexo: Anexo }) {
  const confirmar = useConfirmar()
  const avisar = useAviso()
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(anexo.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [anexo.blob])
  const imagem = anexo.tipo.startsWith('image/')
  return (
    <li className="cartao relative overflow-hidden">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download={imagem ? undefined : anexo.nome}
        className="block"
        onClick={(e) => {
          // No link de teste, arquivos só saem pelo recurso de downloads do claude.ai
          if (EM_ARTIFACT && !imagem) {
            e.preventDefault()
            salvarArquivo(anexo.blob, anexo.nome).catch((erro: Error) => avisar(erro.message))
          }
        }}
      >
        {imagem ? (
          <img src={url} alt={anexo.nome} className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-28 items-center justify-center bg-aqua-claro text-tinta">
            <FileText size={30} strokeWidth={1.5} />
          </div>
        )}
        <div className="p-2">
          <div className="truncate text-xs font-semibold">{anexo.nome}</div>
          <div className="text-[11px] text-nevoa">{formatarTamanho(anexo.tamanho)}</div>
        </div>
      </a>
      <button
        aria-label={`Remover ${anexo.nome}`}
        onClick={async () => {
          if (await confirmar({ titulo: 'Remover anexo?', texto: anexo.nome, botao: 'Remover', perigo: true })) await db.anexos.delete(anexo.id)
        }}
        className="absolute right-1.5 top-1.5 rounded-full bg-superficie/90 p-1.5 text-perigo shadow"
      >
        <Trash2 size={14} />
      </button>
    </li>
  )
}

function Historico({ input }: { input: Input }) {
  const [nota, setNota] = useState('')
  const enviar = async () => {
    if (!nota.trim()) return
    await adicionarNota(input.id, nota)
    setNota('')
  }
  return (
    <Secao titulo="Atualizações">
      <div className="flex gap-2">
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void enviar()}
          className="campo"
          placeholder="Ex.: Material enviado por e-mail"
        />
        <button aria-label="Adicionar atualização" className="botao-primario px-3.5" onClick={enviar} disabled={!nota.trim()}>
          <MessageSquarePlus size={18} />
        </button>
      </div>
      <ol className="mt-4 space-y-3 border-l border-borda pl-4">
        {[...input.atualizacoes].reverse().map((a) => (
          <li key={a.id} className="relative">
            <span
              className={clsx(
                'absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-papel',
                a.tipo === 'nota' ? 'bg-aqua' : a.tipo === 'status' ? 'bg-rose' : 'bg-cinza',
              )}
            />
            <div className={clsx('text-sm', a.tipo === 'sistema' && 'text-nevoa')}>{a.texto}</div>
            <div className="text-[11px] text-nevoa">{formatarDataHora(a.data)}</div>
          </li>
        ))}
      </ol>
    </Secao>
  )
}
