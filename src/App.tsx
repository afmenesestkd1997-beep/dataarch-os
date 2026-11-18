import { Component, ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Tour from './components/Tour'
import { ErrorState } from './components/ui'
import Executive, { Alerts } from './pages/Executive'
import Copilot from './pages/Copilot'
import { Clientes, Compras, Inventarios, InvoiceModal, Operaciones, Proveedores, Ventas } from './pages/Operations'
import { Contabilidad, CxC, CxP, Estados, Impuestos, Tesoreria } from './pages/Finance'
import { ActualVsBudget, Budget, CashFlowForecast, Escenarios, Forecast, FpaHome, Ratios, Simulator, WorkingCapital } from './pages/Fpa'
import Valuation from './pages/Valuation'
import { Configuracion, Empresas, Integraciones } from './pages/Admin'

class Boundary extends Component<{ children: ReactNode }, { err?: string }> {
  state: { err?: string } = {}
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  render() { return this.state.err ? <ErrorState text={this.state.err} onRetry={() => this.setState({ err: undefined })} /> : this.props.children }
}

export default function App() {
  return (
    <Layout>
      <Boundary>
        <Routes>
          <Route path="/" element={<Executive />} />
          <Route path="/copilot" element={<Copilot />} />
          <Route path="/alertas" element={<Alerts />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/inventarios" element={<Inventarios />} />
          <Route path="/operaciones" element={<Operaciones />} />
          <Route path="/contabilidad" element={<Contabilidad />} />
          <Route path="/estados" element={<Estados />} />
          <Route path="/cxc" element={<CxC />} />
          <Route path="/cxp" element={<CxP />} />
          <Route path="/tesoreria" element={<Tesoreria />} />
          <Route path="/impuestos" element={<Impuestos />} />
          <Route path="/fpa" element={<FpaHome />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/actual-vs-budget" element={<ActualVsBudget />} />
          <Route path="/escenarios" element={<Escenarios />} />
          <Route path="/simulador" element={<Simulator />} />
          <Route path="/cash-flow-forecast" element={<CashFlowForecast />} />
          <Route path="/working-capital" element={<WorkingCapital />} />
          <Route path="/ratios" element={<Ratios />} />
          <Route path="/valuation" element={<Valuation />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/integraciones" element={<Integraciones />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="*" element={<ErrorState title="Página no encontrada" text="Usa el menú lateral para navegar." />} />
        </Routes>
      </Boundary>
      <InvoiceModal />
      <Tour />
    </Layout>
  )
}
