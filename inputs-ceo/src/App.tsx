import { HardDrive, Mic } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Cabecalho, ProvedorAvisos, Vazio } from './components/ui'
import { EM_ARTIFACT } from './lib/ambiente'
import { db } from './lib/db'
import { prepararDadosIniciais } from './lib/dadosIniciais'
import Ajustes from './pages/Ajustes'
import Captura from './pages/Captura'
import DetalheInput from './pages/DetalheInput'
import DetalheReuniao from './pages/DetalheReuniao'
import Importar from './pages/Importar'
import Inputs from './pages/Inputs'
import NovoInput from './pages/NovoInput'
import Pessoas from './pages/Pessoas'
import Reunioes from './pages/Reunioes'
import Revisao from './pages/Revisao'

export default function App() {
  const [banco, setBanco] = useState<'abrindo' | 'ok' | 'erro'>('abrindo')

  useEffect(() => {
    db.open()
      .then(() => prepararDadosIniciais())
      .then(() => setBanco('ok'))
      .catch(() => setBanco('erro'))
  }, [])

  if (banco === 'erro') {
    return (
      <Vazio
        icone={<HardDrive size={28} />}
        titulo="Armazenamento bloqueado"
        texto="Este navegador não permitiu guardar dados (janela anônima ou dados de site bloqueados). Abra em uma janela normal para usar o app."
      />
    )
  }
  if (banco === 'abrindo') return null

  const captura = EM_ARTIFACT ? <SemGravacao /> : <Captura />
  return (
    <ProvedorAvisos>
      <Layout>
        <Routes>
          <Route path="/" element={<Inputs />} />
          <Route path="/inputs/novo" element={<NovoInput />} />
          <Route path="/inputs/:id" element={<DetalheInput />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/captura" element={captura} />
          <Route path="/captura/:id" element={captura} />
          <Route path="/revisao/:id" element={<Revisao />} />
          <Route path="/reunioes" element={<Reunioes />} />
          <Route path="/reunioes/:id" element={<DetalheReuniao />} />
          <Route path="/pessoas" element={<Pessoas />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Inputs />} />
        </Routes>
      </Layout>
    </ProvedorAvisos>
  )
}

/** No link de teste não há acesso ao microfone: a gravação fica na versão instalada. */
function SemGravacao() {
  return (
    <>
      <Cabecalho titulo="Gravar" voltar="/" />
      <Vazio
        icone={<Mic size={28} />}
        titulo="Gravação só na versão instalada"
        texto="Neste link de teste o microfone não fica disponível. Grave na sua ferramenta de costume e importe a transcrição ou o resumo."
        acao={
          <Link to="/importar" className="botao-primario">
            Importar material
          </Link>
        }
      />
    </>
  )
}
