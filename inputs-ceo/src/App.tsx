import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProvedorAvisos } from './components/ui'
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
  return (
    <ProvedorAvisos>
      <Layout>
        <Routes>
          <Route path="/" element={<Inputs />} />
          <Route path="/inputs/novo" element={<NovoInput />} />
          <Route path="/inputs/:id" element={<DetalheInput />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/captura" element={<Captura />} />
          <Route path="/captura/:id" element={<Captura />} />
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
