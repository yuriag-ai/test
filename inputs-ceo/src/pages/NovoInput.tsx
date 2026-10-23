import clsx from 'clsx'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cabecalho, CampoLista, CampoPessoas, useAviso } from '../components/ui'
import { useListas } from '../hooks/useDados'
import { CEO } from '../lib/ambiente'
import { criarInput } from '../lib/db'
import { ORIGENS, PRIORIDADES } from '../lib/rotulos'
import type { Origem, Prioridade } from '../lib/types'
import { hojeISO } from '../lib/util'

export default function NovoInput() {
  const navigate = useNavigate()
  const avisar = useAviso()
  const { areas, marcas, nomes } = useListas()
  const [descricao, setDescricao] = useState('')
  const [titulo, setTitulo] = useState('')
  const [responsaveis, setResponsaveis] = useState<string[]>([])
  const [prazo, setPrazo] = useState('')
  const [area, setArea] = useState('')
  const [marca, setMarca] = useState('')
  const [origem, setOrigem] = useState<Origem>('agenda')
  const [local, setLocal] = useState('')
  const [dataInput, setDataInput] = useState(hojeISO())
  const [prioridade, setPrioridade] = useState<Prioridade>('media')

  const salvar = async (outro: boolean) => {
    const novo = await criarInput({ descricao, titulo, responsaveis, prazo, area, marca, origem, local, dataInput, prioridade })
    avisar(`Input #${novo.numero} registrado`)
    if (outro) {
      setDescricao('')
      setTitulo('')
      setResponsaveis([])
      setPrazo('')
      window.scrollTo({ top: 0 })
    } else navigate('/', { replace: true })
  }

  return (
    <>
      <Cabecalho sobrelinha="Registro manual" titulo="Novo" acento="input" voltar />
      <div className="space-y-5 px-4 pb-8">
        <div>
          <label className="rotulo" htmlFor="descricao">
            O que {CEO.nome} pediu *
          </label>
          <textarea
            id="descricao"
            autoFocus
            rows={4}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="campo leading-relaxed"
            placeholder="Ex.: Levantar a performance das lojas no último trimestre"
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="titulo">Título curto (opcional)</label>
          <input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="campo" placeholder="Usa a 1ª linha da descrição se vazio" />
        </div>
        <div>
          <label className="rotulo">Responsáveis</label>
          <CampoPessoas valor={responsaveis} aoMudar={setResponsaveis} sugestoes={nomes} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo">Prazo</label>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="campo" />
          </div>
          <div>
            <label className="rotulo">Data do input</label>
            <input type="date" value={dataInput} onChange={(e) => setDataInput(e.target.value)} className="campo" />
          </div>
          <div>
            <label className="rotulo">Área</label>
            <CampoLista valor={area} opcoes={areas} aoMudar={setArea} />
          </div>
          <div>
            <label className="rotulo">Marca</label>
            <CampoLista valor={marca} opcoes={marcas} aoMudar={setMarca} />
          </div>
          <div>
            <label className="rotulo">Onde foi falado</label>
            <select value={origem} onChange={(e) => setOrigem(e.target.value as Origem)} className="campo">
              {ORIGENS.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo">Local</label>
            <input value={local} onChange={(e) => setLocal(e.target.value)} className="campo" placeholder="Ex.: Escritório SP" />
          </div>
        </div>
        <div>
          <label className="rotulo">Prioridade</label>
          <div className="flex gap-2">
            {PRIORIDADES.map((p) => (
              <button
                key={p.valor}
                onClick={() => setPrioridade(p.valor)}
                className={clsx(
                  'flex-1 rounded-md border py-2.5 text-sm font-bold',
                  prioridade !== p.valor
                    ? 'border-borda bg-superficie text-grafite'
                    : p.valor === 'alta'
                      ? 'border-aqua bg-aqua text-black'
                      : 'border-tinta bg-tinta text-papel',
                )}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button className="botao-primario" disabled={!descricao.trim()} onClick={() => salvar(false)}>
            Salvar input
          </button>
          <button className="botao-secundario" disabled={!descricao.trim()} onClick={() => salvar(true)}>
            Salvar e registrar outro
          </button>
        </div>
      </div>
    </>
  )
}
