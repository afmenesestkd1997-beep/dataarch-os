import { useStore } from '../lib/store'
import { useData } from '../lib/hooks'
import { COMPANY, CUSTOMERS, PRODUCTS, SUPPLIERS } from '../lib/seed'
import { money, pct } from '../lib/format'
import { Badge, Btn, Card, CardHeader, PageHeader, Disclaimer } from '../components/ui'

export function Empresas() {
  const { ms } = useData()
  const f = [['Razón social', COMPANY.name], ['NIT', COMPANY.nit], ['Industria', COMPANY.industry], ['Ubicación', COMPANY.city], ['Moneda funcional', COMPANY.currency], ['Versión de datos', COMPANY.version], ['Histórico', '12 meses (ene-26 a dic-26)'], ['Proyección', '24 meses (ene-27 a dic-28)']]
  return (
    <div>
      <PageHeader title="Empresas" sub="Entidades gestionadas en la plataforma. Cada registro financiero lleva empresa, período, escenario y versión." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title={COMPANY.name} right={<Badge tone="green">Activa · datos ficticios</Badge>} />
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{f.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="text-sm font-medium text-ink">{v}</dd></div>)}</dl>
        </Card>
        <Card><CardHeader title="Dataset" />
          <ul className="space-y-2 text-sm">{[['Clientes', CUSTOMERS.length], ['Proveedores', SUPPLIERS.length], ['Productos', PRODUCTS.length], ['Meses modelados', ms.length]].map(([k, v]) => <li key={k} className="flex justify-between"><span className="text-muted">{k}</span><b>{v}</b></li>)}
            <li className="flex justify-between"><span className="text-muted">Ingresos LTM</span><b>{money(ms.slice(0, 12).reduce((s, m) => s + m.revenue, 0))}</b></li></ul>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted">Multi-empresa: el modelo de datos ya incluye el identificador de empresa; al conectar el backend se podrán administrar varias entidades.</p>
    </div>
  )
}

const INTEG = [['Excel / CSV', 'Carga de balances, ventas y presupuestos'], ['Siigo / Alegra', 'Sistemas contables colombianos'], ['SAP Business One', 'ERP externo'], ['Bancos (open banking)', 'Extractos y saldos diarios'], ['OpenAI', 'Modelos de lenguaje vía backend seguro'], ['Anthropic Claude', 'Modelos de lenguaje vía backend seguro']]
export function Integraciones() {
  const { integrations, set } = useStore()
  return (
    <div className="space-y-6">
      <PageHeader title="Integraciones" sub="Conectores previstos. En esta versión de demostración la conexión es simulada: no se llama a ningún servicio externo." badge="Simulado" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTEG.map(([n, d]) => (
          <Card key={n}><div className="flex items-start justify-between"><div><div className="font-semibold text-ink">{n}</div><div className="mt-1 text-xs text-muted">{d}</div></div><Badge tone={integrations[n] ? 'green' : 'gray'}>{integrations[n] ? 'Conectado (simulado)' : 'Desconectado'}</Badge></div>
            <Btn className="mt-4" variant={integrations[n] ? 'outline' : 'primary'} onClick={() => set({ integrations: { ...integrations, [n]: !integrations[n] } })}>{integrations[n] ? 'Desconectar' : 'Conectar (simulado)'}</Btn></Card>
        ))}
      </div>
      <Card><CardHeader title="Arquitectura objetivo" />
        <p className="text-sm leading-relaxed text-muted">Frontend React → API FastAPI (Python) → PostgreSQL. El motor financiero (hoy en <code>src/lib/engine.ts</code>) se portará al backend manteniendo la misma interfaz. Las claves de OpenAI y Anthropic viven solo en el servidor.</p></Card>
    </div>
  )
}

export function Configuracion() {
  const s = useStore()
  const field = 'w-28 rounded-xl border border-line bg-sub px-3 py-1.5 text-right text-sm text-ink outline-none focus:border-violet'
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" sub="Preferencias de la demostración. Se guardan en este navegador." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Apariencia" /><div className="flex gap-2">{(['light', 'dark'] as const).map((t) => <Btn key={t} variant={s.theme === t ? 'primary' : 'outline'} onClick={() => s.set({ theme: t })}>{t === 'light' ? 'Modo claro' : 'Modo oscuro'}</Btn>)}</div></Card>
        <Card><CardHeader title="Alertas de caja" sub="Alimenta las alertas del dashboard, tesorería y flujo de caja" />
          <label className="flex items-center justify-between text-sm text-muted">Caja mínima (COP M)<input type="number" step={50} className={field} value={Math.round(s.minCash / 1e6)} onChange={(e) => s.set({ minCash: Math.max(0, Number(e.target.value)) * 1e6 })} /></label></Card>
        <Card><CardHeader title="Valoración" />
          <div className="space-y-3 text-sm text-muted"><label className="flex items-center justify-between">WACC %<input type="number" step={0.25} className={field} value={+(s.wacc * 100).toFixed(2)} onChange={(e) => s.set({ wacc: Number(e.target.value) / 100 })} /></label>
            <label className="flex items-center justify-between">Crecimiento terminal %<input type="number" step={0.25} className={field} value={+(s.tg * 100).toFixed(2)} onChange={(e) => s.set({ tg: Number(e.target.value) / 100 })} /></label></div></Card>
        <Card><CardHeader title="Datos de demostración" sub={`${s.invoices.length} facturas simuladas · renta ${pct(s.tax.renta, 0)}`} />
          <Btn variant="outline" onClick={() => { s.reset(); s.set({ tourStep: null }) }}>Restablecer datos de la demo</Btn></Card>
      </div>
      <Disclaimer>Todos los datos de Nova Comercial S.A.S. son ficticios. No hay backend, API keys ni llamadas externas en esta versión.</Disclaimer>
    </div>
  )
}
