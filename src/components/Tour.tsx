import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, PlayCircle } from 'lucide-react'
import { useStore, Invoice } from '../lib/store'
import { SCENARIOS } from '../lib/engine'
import { Btn } from './ui'

const STEPS = [
  { to: '/', title: '1 · Dashboard Ejecutivo', text: 'Abre con la foto completa: 11 KPIs, evolución de ingresos y EBITDA, y las alertas generadas por reglas verificables.' },
  { to: '/', title: '2 · Indicadores financieros', text: 'Cada tarjeta muestra variación vs. el mes anterior y lleva al módulo que la explica. Observa la caja y la cartera: ahí está el riesgo.' },
  { to: '/ventas', title: '3 · Crear una venta', text: 'Registra una factura simulada: genera ingreso, IVA, cuenta por cobrar, costo e inventario en un solo paso.', action: 'sale' },
  { to: '/cxc', title: '4 · Impacto en cartera y estados', text: 'La venta ya aparece en la cartera del cliente y en el balance, y los estados siguen cuadrando. Revisa también Estados Financieros.' },
  { to: '/fpa', title: '5 · FP&A', text: 'Presupuesto, forecast y escenarios sobre un único modelo. Mira el avance real vs. presupuesto.' },
  { to: '/simulador', title: '6 · Simular crecimiento de ventas', text: 'Subimos el crecimiento de ventas al 20% anual. Mueve cualquier otro driver para ver el efecto inmediato.', action: 'sim' },
  { to: '/simulador', title: '7 · Efecto en EBITDA y caja', text: 'Más ventas aumentan el EBITDA, pero el capital de trabajo consume caja: crecer sin cobrar a tiempo tensiona la liquidez.' },
  { to: '/copilot', title: '8 · AI Financial Copilot', text: 'Pregunta en lenguaje natural. Cada respuesta trae hallazgo, evidencia, impacto, recomendación y acción.' },
  { to: '/alertas', title: '9 · Riesgos y recomendaciones', text: 'Cada alerta muestra el indicador, el umbral y la regla que la originó. Nada es una caja negra.' },
  { to: '/valuation', title: '10 · Valoración empresarial', text: 'Cerramos con el valor de la empresa por DCF: más rentabilidad y menos capital de trabajo = más valor.' },
]

export default function Tour() {
  const { tourStep, set, invoices, addInvoice } = useStore()
  const nav = useNavigate()
  const s = tourStep !== null ? STEPS[tourStep] : null
  useEffect(() => {
    if (tourStep === null) return
    const st = STEPS[tourStep]
    nav(st.to)
    if (st.action === 'sim') set({ sim: { ...SCENARIOS.base, growth: 0.2 } })
  }, [tourStep]) // eslint-disable-line
  if (!s || tourStep === null) return null
  const registerSale = () => {
    const net = 520e6, iva = net * 0.19
    const inv: Invoice = { id: `FV-D${invoices.length + 1}`, date: '2026-12-31', customerId: 'C003', productId: 'SKU-11', qty: 120000, unitPrice: 4333, credit: true, net, iva, total: net + iva, cost: net * 0.7 }
    addInvoice(inv)
    set({ tourStep })
  }
  const last = tourStep === STEPS.length - 1
  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-violet/40 bg-navy p-5 text-white shadow-2xl shadow-violet/30 fade-up">
      <div className="mb-2 flex items-center justify-between text-xs text-white/60">
        <span className="flex items-center gap-1.5"><PlayCircle size={14} className="text-[#A78BFA]" /> Demo guiada · {tourStep + 1}/{STEPS.length}</span>
        <button onClick={() => set({ tourStep: null })} className="rounded p-1 hover:bg-white/10"><X size={14} /></button>
      </div>
      <div className="mb-3 h-1 rounded-full bg-white/10"><div className="h-1 rounded-full bg-gradient-to-r from-violet to-electric transition-all" style={{ width: `${((tourStep + 1) / STEPS.length) * 100}%` }} /></div>
      <div className="font-bold">{s.title}</div>
      <p className="mt-1 text-sm text-white/70">{s.text}</p>
      {s.action === 'sale' && (
        <div className="mt-3 flex gap-2">
          <Btn onClick={registerSale} disabled={invoices.some((i) => i.id.startsWith('FV-D'))}>Registrar venta demo ($520 M)</Btn>
          <Btn variant="dark" className="border border-white/20" onClick={() => set({ invoiceOpen: true })}>Crear la mía</Btn>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <button disabled={tourStep === 0} onClick={() => set({ tourStep: tourStep - 1 })} className="flex items-center gap-1 text-sm text-white/70 hover:text-white disabled:opacity-30"><ChevronLeft size={15} /> Atrás</button>
        <Btn onClick={() => set({ tourStep: last ? null : tourStep + 1 })}>{last ? 'Finalizar' : 'Siguiente'} {!last && <ChevronRight size={15} />}</Btn>
      </div>
    </div>
  )
}
