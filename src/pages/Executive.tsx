import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react'
import { useStore } from '../lib/store'
import { useData } from '../lib/hooks'
import { kpis, productStats, ratios, customerStats } from '../lib/analytics'
import { COMPANY, CATEGORIES } from '../lib/seed'
import { SCENARIO_LABEL } from '../lib/engine'
import { money, pct, x } from '../lib/format'
import { AIInsightCard, Badge, Card, CardHeader, FinancialAlert, KPIStatCard, PageHeader } from '../components/ui'
import { Donut, HBar, TimeSeries } from '../components/charts'

export default function Executive() {
  const { month, scenario } = useStore()
  const { ms, ag, alerts } = useData()
  const k = kpis(ms, month)
  const rows = ms.slice(0, 24).map((m) => ({ label: m.label, revenue: m.revenue, ebitda: m.ebitda, gm: m.gp / m.revenue, em: m.ebitda / m.revenue, nm: m.ni / m.revenue, cash: m.cash, netCf: m.netCf }))
  const r = ratios(ms, month)
  const prod = productStats(ms, month)
  const cat = CATEGORIES.map((c) => ({ name: c, value: prod.filter((p) => p.category === c).reduce((s, p) => s + p.sales, 0) }))
  const top = customerStats(ms, month, ag).slice(0, 7).map((c) => ({ name: c.name, value: c.sales }))
  const health = [
    { name: 'Razón corriente', v: r.current.toFixed(2) + 'x', ok: r.current >= 1.2, note: 'Liquidez' },
    { name: 'Prueba ácida', v: r.quick.toFixed(2) + 'x', ok: r.quick >= 0.8, note: 'Liquidez' },
    { name: 'Deuda neta / EBITDA', v: x(r.netDebtEbitda), ok: r.netDebtEbitda <= 3, note: 'Endeudamiento' },
    { name: 'Cobertura de intereses', v: x(r.interestCov), ok: r.interestCov >= 2, note: 'Endeudamiento' },
    { name: 'ROE (LTM)', v: pct(r.roe), ok: r.roe >= 0.12, note: 'Rentabilidad' },
    { name: 'Margen EBITDA', v: pct(r.em), ok: r.em >= 0.09, note: 'Rentabilidad' },
  ]
  return (
    <div className="space-y-6">
      <div className="grad-brand relative overflow-hidden rounded-3xl p-6 text-white shadow-card fade-up md:p-8">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-violet/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70"><ShieldCheck size={14} /> {COMPANY.name} · {COMPANY.city}</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Tu empresa al siguiente nivel con <span className="grad-text">Finanzas e Inteligencia Artificial</span></h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Más control y rentabilidad · Procesos más eficientes · Una empresa más competitiva. Todo el negocio, conectado en un solo motor financiero.</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <Badge tone="violet">{SCENARIO_LABEL[scenario]}</Badge>
            <div className="text-xs text-white/60">Valor empresa (DCF) y proyecciones según escenario activo</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {k.items.map((i) => <KPIStatCard key={i.key} label={i.label} value={i.value} delta={i.delta} good={i.good} pct={i.pct} abs={i.abs} spark={i.spark} to={i.path} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Evolución de Ingresos y EBITDA" sub="12 meses reales + 12 proyectados (zona sombreada)" right={<Badge tone="blue">COP</Badge>} />
          <TimeSeries data={rows} forecastFrom={ms[12].label} series={[{ key: 'revenue', name: 'Ingresos', color: '#7C5CFC' }, { key: 'ebitda', name: 'EBITDA', type: 'line', color: '#10B981' }]} />
        </Card>
        <Card>
          <CardHeader title="AI Insights" sub="Derivados de reglas verificables sobre tus datos" right={<Sparkles size={16} className="text-violet" />} />
          <div className="space-y-3">
            {alerts.slice(0, 3).map((a, i) => <AIInsightCard key={a.id} a={a} rank={i + 1} />)}
            {alerts.length === 0 && <p className="text-sm text-muted">Sin alertas: todos los indicadores dentro de umbral.</p>}
          </div>
          <Link to="/copilot" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-violet/10 py-2 text-sm font-semibold text-violet hover:bg-violet/15">Preguntar al Copilot <ArrowRight size={14} /></Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Análisis de rentabilidad" sub="Márgenes bruto, EBITDA y neto" />
          <TimeSeries data={rows} pctKeys={['gm', 'em', 'nm']} forecastFrom={ms[12].label} series={[{ key: 'gm', name: 'Margen bruto', type: 'line', color: '#7C5CFC' }, { key: 'em', name: 'Margen EBITDA', type: 'line', color: '#4F8CFF' }, { key: 'nm', name: 'Margen neto', type: 'line', color: '#10B981' }]} />
        </Card>
        <Card>
          <CardHeader title="Flujo de caja" sub="Saldo de caja y flujo neto mensual" />
          <TimeSeries data={rows} forecastFrom={ms[12].label} refLine={{ y: useStore.getState().minCash, label: 'Caja mínima' }} series={[{ key: 'netCf', name: 'Flujo neto', color: '#4F8CFF' }, { key: 'cash', name: 'Caja', type: 'area', color: '#7C5CFC' }]} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Ventas por categoría" sub="Mes seleccionado" />
          <Donut data={cat} />
        </Card>
        <Card>
          <CardHeader title="Ventas por cliente (LTM)" sub="Top 7 clientes" />
          <HBar data={top} height={230} color="#4F8CFF" />
        </Card>
        <Card>
          <CardHeader title="Salud financiera" sub="Liquidez · Endeudamiento · Rentabilidad" />
          <ul className="space-y-2.5">
            {health.map((h) => (
              <li key={h.name} className="flex items-center justify-between rounded-xl bg-sub px-3 py-2.5">
                <div><div className="text-sm font-medium text-ink">{h.name}</div><div className="text-[11px] text-muted">{h.note}</div></div>
                <div className="flex items-center gap-2"><b className="num text-ink">{h.v}</b><span className={`h-2.5 w-2.5 rounded-full ${h.ok ? 'bg-fin' : 'bg-warn'}`} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardHeader title="Alertas financieras" sub={`${alerts.length} alertas activas · cada una muestra el indicador que la origina`} right={<Link to="/alertas" className="text-sm font-semibold text-violet hover:underline">Ver todas</Link>} />
          <div className="grid gap-3 lg:grid-cols-2">{alerts.slice(0, 4).map((a) => <FinancialAlert key={a.id} a={a} compact />)}</div>
        </Card>
      )}
      <div className="text-center text-xs text-muted">Resumen {money(k.m.revenue)} de ingresos en el mes · generado con el motor DataArch (datos ficticios)</div>
    </div>
  )
}

export function Alerts() {
  const { alerts } = useData()
  return (
    <div>
      <PageHeader title="Alertas y Recomendaciones" sub="Cada alerta nace de una regla verificable sobre el modelo financiero; puedes auditar el indicador, el umbral y la regla." badge={`${alerts.length} activas`} />
      <div className="grid gap-4 lg:grid-cols-2">
        {alerts.map((a) => <FinancialAlert key={a.id} a={a} />)}
      </div>
      {alerts.length === 0 && <Card><p className="text-sm text-muted">Sin alertas activas en el escenario seleccionado.</p></Card>}
    </div>
  )
}
