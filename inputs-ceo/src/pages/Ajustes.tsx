import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, CircleAlert, Download, Plus, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Cabecalho, CampoLista, Secao, useAviso, useConfirmar } from '../components/ui'
import { EM_ARTIFACT, MSG_SEM_IA } from '../lib/ambiente'
import { useIA, useListas } from '../hooks/useDados'
import { apagarTudo, db, salvarLista } from '../lib/db'
import { exportarBackup, exportarCSV, restaurarBackup } from '../lib/exportar'
import { aplicarTema, lerTema, type Tema } from '../lib/tema'

export default function Ajustes() {
  const avisar = useAviso()
  const confirmar = useConfirmar()
  const ia = useIA()
  const { areas, marcas, pessoas } = useListas()
  const backup = useRef<HTMLInputElement>(null)
  const [tema, setTema] = useState<Tema>(lerTema)
  const totais = useLiveQuery(async () => ({ inputs: await db.inputs.count(), reunioes: await db.reunioes.count() }), [])

  return (
    <>
      <Cabecalho logo sobrelinha="Configurações" titulo="Ajustes" acento="e dados" />
      <div className="space-y-7 px-4 pb-8">
        <section className={ia === false ? 'destaque-rose' : 'destaque-leve'}>
          {ia ? <CheckCircle2 className="mt-0.5 shrink-0" size={20} /> : <CircleAlert className="mt-0.5 shrink-0" size={20} />}
          <div className="text-sm leading-relaxed">
            <div className="font-bold">{ia === null ? 'Verificando IA…' : ia ? 'IA conectada' : 'IA não configurada'}</div>
            <div className="text-grafite">
              {ia
                ? 'Atas executivas, planos de ação e refinamento de listas estão disponíveis.'
                : `${MSG_SEM_IA} Importar listas e acompanhar os inputs funciona sem IA.`}
            </div>
          </div>
        </section>

        <Secao titulo="Aparência">
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ['claro', 'Claro'],
                ['escuro', 'Escuro'],
                ['auto', 'Automático'],
              ] as [Tema, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                onClick={() => {
                  aplicarTema(valor)
                  setTema(valor)
                }}
                className={
                  tema === valor
                    ? 'rounded-md border border-tinta bg-tinta py-2.5 text-sm font-bold text-papel'
                    : 'rounded-md border border-borda bg-superficie py-2.5 text-sm font-bold text-grafite'
                }
              >
                {rotulo}
              </button>
            ))}
          </div>
          {tema === 'auto' && <p className="mt-1.5 text-[12px] text-nevoa">Segue o tema do aparelho ou do claude.ai.</p>}
        </Secao>

        <EditorLista titulo="Áreas" itens={areas} aoSalvar={(v) => salvarLista('areas', v)} />
        <EditorLista titulo="Marcas" itens={marcas} aoSalvar={(v) => salvarLista('marcas', v)} />

        <Secao titulo={<>Pessoas <span className="mt-numero ml-1 align-middle">{pessoas.length}</span></>}>
          {pessoas.length === 0 ? (
            <p className="text-sm text-nevoa">As pessoas são cadastradas automaticamente ao atribuir responsáveis.</p>
          ) : (
            <ul className="divide-y divide-regua">
              {pessoas.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2">
                  <span className="flex-1 truncate text-sm font-bold">{p.nome}</span>
                  <div className="w-44">
                    <CampoLista valor={p.area} opcoes={areas} placeholder="Área" aoMudar={(area) => void db.pessoas.update(p.id, { area })} />
                  </div>
                  <button
                    aria-label={`Remover ${p.nome}`}
                    className="rounded-full p-2 text-nevoa hover:text-perigo"
                    onClick={() => void db.pessoas.delete(p.id)}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Dados" className="space-y-2">
          <p className="text-[13px] leading-relaxed text-grafite">
            {EM_ARTIFACT ? 'Nesta versão de teste, os dados ficam só neste navegador' : 'Os dados ficam guardados neste aparelho'} (
            {totais?.inputs ?? 0} inputs, {totais?.reunioes ?? 0} reuniões). Faça backups periódicos; a sincronização entre aparelhos e
            usuários é a próxima etapa.
          </p>
          <button className="botao-secundario w-full justify-start" onClick={() => exportarBackup().catch((e: Error) => avisar(e.message))}>
            <Download size={18} /> Exportar backup completo
          </button>
          <button className="botao-secundario w-full justify-start" onClick={() => backup.current?.click()}>
            <Upload size={18} /> Restaurar backup
          </button>
          <input
            ref={backup}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const arquivo = e.target.files?.[0]
              e.target.value = ''
              if (!arquivo) return
              try {
                await restaurarBackup(arquivo)
                avisar('Backup restaurado')
              } catch (erro) {
                avisar((erro as Error).message)
              }
            }}
          />
          <button
            className="botao-secundario w-full justify-start"
            onClick={async () => exportarCSV(await db.inputs.orderBy('numero').toArray()).catch((e: Error) => avisar(e.message))}
          >
            <Download size={18} /> Exportar inputs para Excel
          </button>
          <button
            className="botao-perigo w-full justify-start"
            onClick={async () => {
              const ok = await confirmar({
                titulo: 'Apagar todos os dados?',
                texto: 'Inputs, reuniões, áudios e anexos deste aparelho serão apagados. Não dá para desfazer.',
                botao: 'Apagar tudo',
                perigo: true,
              })
              if (!ok) return
              await apagarTudo()
              avisar('Dados apagados')
            }}
          >
            <Trash2 size={18} /> Apagar todos os dados
          </button>
        </Secao>
      </div>
    </>
  )
}

function EditorLista({ titulo, itens, aoSalvar }: { titulo: string; itens: string[]; aoSalvar: (v: string[]) => Promise<void> }) {
  const [novo, setNovo] = useState('')
  const adicionar = () => {
    if (!novo.trim()) return
    void aoSalvar([...itens, novo.trim()])
    setNovo('')
  }
  return (
    <Secao titulo={titulo}>
      <div className="flex flex-wrap gap-1.5">
        {itens.map((item) => (
          <span key={item} className="chip rounded-md border border-borda bg-superficie py-1.5 pl-3 text-[13px]">
            {item}
            <button aria-label={`Remover ${item}`} className="text-nevoa hover:text-perigo" onClick={() => void aoSalvar(itens.filter((i) => i !== item))}>
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} className="campo" placeholder={`Nova ${titulo.toLowerCase().replace(/s$/, '')}`} />
        <button aria-label={`Adicionar ${titulo}`} className="botao-secundario px-3.5" onClick={adicionar} disabled={!novo.trim()}>
          <Plus size={18} />
        </button>
      </div>
    </Secao>
  )
}
