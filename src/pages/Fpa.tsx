import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { useStore, BUDGET_DRIVERS } from '../lib/store'
import { useData } from '../lib/hooks'
import { ebitdaBridge, ratios, simCompare } from '../lib/analytics'
import { Drivers, HIST, HIST_MONTHS, Month, SCENARIOS, SCENARIO_LABEL, ScenarioKey, runModel, sum } from '../lib/engine'
import { mm, money, num, pct, spct, x } from '../lib/format'
import { Badge, Btn, Card, CardHeader, FinancialDataTable, KPIStatCard, PageHeader, ScenarioSlider, Tabs, VarianceIndicator, Disclaimer } from '../components/ui'
import { TimeSeries, WaterfallChart } from '../components/charts'
import { Treasury13 } from './Finance'
import { params } from '../lib/analytics'

const DRIVER_DEFS: { key: keyof Drivers; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: 'growth', label: 'Crecimiento de ventas (anual)', min: -0.1, max: 0.4, step: 0.005, fmt: (v) => pct(v) },
  { key: 'gm', label: 'Margen bruto', min: 0.2, max: 0.4, step: 0.0025, fmt: (v) => pct(v, 2) },
  { key: 'fixedOpex', label: 'OPEX fijo mensual', min: 200e6, max: 450e6, step: 5e6, fmt: (v) => money(v) },
  { key: 'varOpex', label: 'OPEX variable (% ventas)', min: 0.03, max: 0.1, step: 0.001, fmt: (v) => pct(v) },
  { key: 'dso', label: 'DSO (días de cartera)', min: 30, max: 80, step: 1, fmt: (v) => `${v} d` },
  { key: 'dpo', label: 'DPO (días de proveedores)', min: 20, max: 70, step: 1, fmt: (v) => `${v} d` },
  { key: 'dio', label: 'DIO (días de inventario)', min: 25, max: 80, step: 1, fmt: (v) => `${v} d` },
  { key: 'capex', label: 'CAPEX mensual', min: 0, max: 100e6, step: 1e6, fmt: (v) => money(v) },
  { key: 'interest', label: 'Tasa de interés deuda', min: 0.08, max: 0.25, step: 0.0025, fmt: (v) => pct(v, 2) },
]

export function FpaHome() {
  const { month } = useStore()
  const { ms, models } = useData()
  const A = models.actual.slice(0, month + 1), B = models.budget.slice(0, month + 1)
  const items = [['Ingresos', sum(A, 'revenue'), sum(B, 'revenue'), 1], ['Utilidad bruta', sum(A, 'gp'), sum(B, 'gp'), 1], ['EBITDA', sum(A, 'ebitda'), sum(B, 'ebitda'), 1], ['Utilidad neta', sum(A, 'ni'), sum(B, 'ni'), 1]] as [string, number, number, number][]
  const mods = [['/budget', 'Budget', 'Presupuesto mensual y drivers editables'], ['/actual-vs-budget', 'Actual vs Budget', 'Varianzas y puente de EBITDA'], ['/forecast', 'Forecast', 'Rolling forecast 12 y 24 meses'], ['/escenarios', 'Escenarios', 'Base, Upside, Downside y Custom'], ['/simulador', 'Scenario Simulator', 'Mueve drivers y ve el impacto'], ['/cash-flow-forecast', 'Cash Flow Forecast', '13 semanas y 24 meses'], ['/valuation', 'Valuation', 'DCF y sensibilidades']]
  return (
    <div className="space-y-6">
      <PageHeader title="FP&A — Planeación y Análisis Financiero" sub="El corazón de DataArch: del presupuesto al forecast, con escenarios y valoración sobre un único modelo." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(([l, a, b]) => <Card key={l}><div className="text-xs text-muted">{l} YTD vs Budget</div><div className="mt-1 text-2xl font-bold num">{money(a)}</div><div className="mt-1 flex items-center gap-2 text-xs text-muted">Budget {money(b)} <VarianceIndicator value={(a - b) / Math.abs(b)} good={1} /></div></Card>)}
      </div>
      <Card><CardHeader title="Ingresos y EBITDA: real vs presupuesto" /><TimeSeries data={models.actual.slice(0, 12).map((m, i) => ({ label: m.label, real: m.ebitda, budget: models.budget[i].ebitda, revA: m.revenue, revB: models.budget[i].revenue }))} series={[{ key: 'real', name: 'EBITDA real', color: '#7C5CFC' }, { key: 'budget', name: 'EBITDA budget', type: 'line', color: '#F59E0B', dashed: true }]} height={240} /></Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mods.map(([to, t, d]) => <Link key={to} to={to} className="rounded-2xl border border-line bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-violet/40"><div className="font-semibold text-ink">{t}</div><div className="mt-1 text-xs text-muted">{d}</div></Link>)}
      </div>
      <p className="text-xs text-muted">Escenario activo para proyecciones: <b>{SCENARIO_LABEL[useStore.getState().scenario]}</b> · {ms.length} meses modelados (12 reales + 24 proyectados).</p>
    </div>
  )
}

export function Budget() {
  const { budget, set, tax } = useStore()
  const { models } = useData()
  const B = models.budget.slice(0, 12)
  const defs = DRIVER_DEFS.filter((d) => d.key !== 'interest')
  const rowOf = (label: string, f: (m: Month, i: number) => number, bold?: boolean) => ({ key: label, bold, shade: bold, cells: [label, ...B.map((m, i) => mm(f(m, i), 0)), <b key="t">{mm(B.reduce((s, m, i) => s + f(m, i), 0), 0)}</b>] })
  void tax
  return (
    <div className="space-y-6">
      <PageHeader title="Budget" sub="Presupuesto del año fiscal (ene-26 a dic-26). Edita los drivers: la tabla y las comparaciones Actual vs Budget se recalculan." right={<Btn variant="outline" onClick={() => set({ budget: { ...BUDGET_DRIVERS } })}><RotateCcw size={14} /> Restablecer</Btn>} />
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1"><CardHeader title="Drivers presupuestales" />
          <div className="space-y-4">{defs.map((d) => <ScenarioSlider key={d.key} label={d.label} value={budget[d.key]} min={d.min} max={d.max} step={d.step} format={d.fmt} base={BUDGET_DRIVERS[d.key]} onChange={(v) => set({ budget: { ...budget, [d.key]: v } })} />)}</div>
        </Card>
        <Card className="lg:col-span-3" pad={false}>
          <div className="p-5"><CardHeader title="Presupuesto mensual" sub="COP millones" /></div>
          <div className="px-3 pb-3"><FinancialDataTable dense head={['COP millones', ...B.map((m) => m.label), 'Total']} rows={[
            rowOf('Ingresos', (m) => m.revenue, true), rowOf('(−) Costo de ventas', (m) => -m.cogs), rowOf('Utilidad bruta', (m) => m.gp, true), rowOf('(−) OPEX', (m) => -m.opex), rowOf('EBITDA', (m) => m.ebitda, true),
            rowOf('CAPEX', (m) => -m.capex), rowOf('Capital de trabajo (saldo)', (m) => m.nwc), rowOf('Flujo de caja neto', (m) => m.netCf, true),
          ]} /></div>
        </Card>
      </div>
    </div>
  )
}

export function ActualVsBudget() {
  const { month } = useStore()
  const { models } = useData()
  const [mode, setMode] = useState<'m' | 'ytd'>('ytd')
  const from = mode === 'm' ? month : 0
  const A = models.actual.slice(from, month + 1), B = models.budget.slice(from, month + 1)
  const L: { l: string; k: keyof Month; cost?: boolean }[] = [{ l: 'Ingresos', k: 'revenue' }, { l: 'Costo de ventas', k: 'cogs', cost: true }, { l: 'Utilidad bruta', k: 'gp' }, { l: 'OPEX', k: 'opex', cost: true }, { l: 'EBITDA', k: 'ebitda' }, { l: 'Utilidad neta', k: 'ni' }]
  const steps = ebitdaBridge(models.actual, models.budget, from, month)
  const chk = steps.slice(0, -1).reduce((s, st) => s + st.value, 0) - steps[steps.length - 1].value
  return (
    <div className="space-y-6">
      <PageHeader title="Actual vs Budget" sub="Varianzas con lectura favorable / desfavorable y puente de EBITDA que explica la diferencia." right={<Tabs value={mode} onChange={setMode} tabs={[{ id: 'm', label: 'Mes' }, { id: 'ytd', label: 'YTD' }]} />} />
      <Card pad={false} className="p-3"><FinancialDataTable head={['COP millones', 'Actual', 'Budget', 'Var. COP', 'Var. %', 'Resultado']} rows={L.map((r) => {
        const a = sum(A, r.k), b = sum(B, r.k), v = a - b
        const fav = r.cost ? v <= 0 : v >= 0
        return { key: r.l, bold: ['gp', 'ebitda', 'ni'].includes(r.k), cells: [r.l, mm(a, 0), mm(b, 0), mm(v, 0), spct(v / Math.abs(b)), <Badge key="b" tone={fav ? 'green' : 'red'}>{fav ? 'Favorable' : 'Desfavorable'}</Badge>] }
      })} /></Card>
      <Card><CardHeader title="Puente de EBITDA: Budget → Real" sub="Volumen, margen, OPEX fijo y variable — la suma reconcilia exactamente" right={<Badge tone={Math.abs(chk) < 1 ? 'green' : 'red'}>{Math.abs(chk) < 1 ? 'Reconciliado' : 'Diferencia'}</Badge>} /><WaterfallChart steps={steps} /></Card>
    </div>
  )
}

export function Forecast() {
  const { scenario, month } = useStore()
  const { ms } = useData()
  const [h, setH] = useState<12 | 24>(12)
  const rows = ms.slice(0, 12 + h)
  const P = ms.slice(12, 12 + h)
  const d = scenario === 'custom' ? useStore.getState().custom : SCENARIOS[scenario]
  void month
  return (
    <div className="space-y-6">
      <PageHeader title="Rolling Forecast" sub="Histórico real separado de la proyección. Los drivers del escenario activo gobiernan ventas, margen, OPEX, capital de trabajo, CAPEX, deuda e impuestos." right={<><Badge tone="violet">{SCENARIO_LABEL[scenario]}</Badge><Tabs value={String(h) as '12'} onChange={(v) => setH(Number(v) as 12 | 24)} tabs={[{ id: '12', label: '12 meses' }, { id: '24', label: '24 meses' }]} /></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStatCard label={`Ingresos próx. ${h}m`} value={sum(P, 'revenue')} delta={0} /><KPIStatCard label="EBITDA" value={sum(P, 'ebitda')} delta={0} />
        <KPIStatCard label="Flujo de caja libre" value={sum(P, 'fcf')} delta={0} /><KPIStatCard label="Caja final" value={P[P.length - 1].cash} delta={0} />
      </div>
      <Card><CardHeader title="Real + proyección" /><TimeSeries data={rows.map((m) => ({ label: m.label, revenue: m.revenue, ebitda: m.ebitda, cash: m.cash }))} forecastFrom={ms[12].label} series={[{ key: 'revenue', name: 'Ingresos', color: '#7C5CFC' }, { key: 'ebitda', name: 'EBITDA', color: '#10B981' }, { key: 'cash', name: 'Caja', type: 'line', color: '#F59E0B' }]} /></Card>
      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardHeader title="Drivers del escenario" /><ul className="space-y-2 text-sm">
          {DRIVER_DEFS.map((df) => <li key={df.key} className="flex justify-between"><span className="text-muted">{df.label.split(' (')[0]}</span><b className="num text-ink">{df.fmt(d[df.key])}</b></li>)}
          <li className="flex justify-between"><span className="text-muted">Impuesto de renta</span><b className="num">{pct(useStore.getState().tax.renta, 0)}</b></li>
        </ul><Link to="/simulador" className="mt-4 block text-sm font-semibold text-violet hover:underline">Simular otros drivers →</Link></Card>
        <Card className="lg:col-span-3" pad={false}><div className="p-5 pb-2"><CardHeader title="Detalle mensual proyectado" sub="COP millones · ᵖ proyectado" /></div>
          <div className="px-3 pb-3"><FinancialDataTable dense head={['COP millones', ...P.map((m) => m.label + 'ᵖ')]} rows={[['Ingresos', 'revenue'], ['Utilidad bruta', 'gp'], ['OPEX', 'opex'], ['EBITDA', 'ebitda'], ['Utilidad neta', 'ni'], ['Flujo libre', 'fcf'], ['Caja final', 'cash']].map(([l, k]) => ({ key: l, bold: ['ebitda', 'cash'].includes(k), cells: [l, ...P.map((m) => mm(m[k as keyof Month] as number, 0))] }))} /></div>
        </Card>
      </div>
    </div>
  )
}

export function Escenarios() {
  const { custom, set, minCash, wacc, tg } = useStore()
  const { models } = useData()
  const keys: ScenarioKey[] = ['base', 'upside', 'downside', 'custom']
  const cmp = keys.map((k) => ({ k, ...simCompare(models.scen.base, models.scen[k], params(useStore.getState().tax).taxRate, wacc, tg) }))
  void wacc; void tg
  const colors: Record<ScenarioKey, string> = { base: '#7C5CFC', upside: '#10B981', downside: '#EF4444', custom: '#F59E0B' }
  const mk = (f: (m: Month) => number) => models.scen.base.slice(0, 36).map((m, i) => ({ label: m.label, ...Object.fromEntries(keys.map((k) => [k, f(models.scen[k][i])])) }))
  const lines = keys.map((k) => ({ key: k, name: SCENARIO_LABEL[k], type: 'line' as const, color: colors[k] }))
  return (
    <div className="space-y-6">
      <PageHeader title="Escenarios" sub="Compara Base, Upside, Downside y un escenario Custom editable. Todos usan el mismo motor y los mismos saldos iniciales." />
      <Card pad={false} className="p-3"><FinancialDataTable head={['Año 1 proyectado', ...keys.map((k) => SCENARIO_LABEL[k])]} rows={[
        ['Ingresos', 'revenue'], ['EBITDA', 'ebitda'], ['Margen EBITDA', 'margin'], ['Utilidad neta', 'ni'], ['Flujo de caja libre', 'fcf'], ['Caja final año 1', 'cash'], ['Valor empresa (DCF)', 'ev'],
      ].map(([l, f]) => ({ key: l, cells: [l, ...cmp.map((c) => { const v = c.sim[f as 'ev']; return f === 'margin' ? pct(v) : money(v) })] }))} /></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="EBITDA mensual" /><TimeSeries data={mk((m) => m.ebitda)} forecastFrom={models.scen.base[12].label} series={lines} height={240} /></Card>
        <Card><CardHeader title="Caja final" sub="Línea roja: caja mínima configurada" /><TimeSeries data={mk((m) => m.cash)} forecastFrom={models.scen.base[12].label} refLine={{ y: minCash, label: 'Mínimo' }} series={lines} height={240} /></Card>
        <Card><CardHeader title="Ingresos mensuales" /><TimeSeries data={mk((m) => m.revenue)} forecastFrom={models.scen.base[12].label} series={lines} height={240} /></Card>
        <Card><CardHeader title="Escenario Custom" sub="Edita los drivers; se guarda en este navegador" right={<Btn variant="ghost" onClick={() => set({ custom: { ...SCENARIOS.base, growth: 0.12, gm: 0.31 } })}><RotateCcw size={14} /></Btn>} />
          <div className="grid gap-3 sm:grid-cols-2">{DRIVER_DEFS.map((d) => <ScenarioSlider key={d.key} label={d.label.split(' (')[0]} value={custom[d.key]} min={d.min} max={d.max} step={d.step} format={d.fmt} onChange={(v) => set({ custom: { ...custom, [d.key]: v } })} />)}</div>
        </Card>
      </div>
    </div>
  )
}

export function CashFlowForecast() {
  const { minCash } = useStore()
  const { models, ms } = useData()
  const rows = ms.map((m, i) => ({ label: m.label, cash: m.cash, up: models.scen.upside[i].cash, down: models.scen.downside[i].cash }))
  return (
    <div className="space-y-6">
      <PageHeader title="Cash Flow Forecast" sub="13 semanas de visibilidad táctica y 24 meses de visión estratégica. Alertas si la caja cae bajo el mínimo." />
      <Card><CardHeader title="Flujo de caja a 13 semanas" /><Treasury13 /></Card>
      <Card><CardHeader title="Caja proyectada 24 meses" sub="Escenario activo vs. Upside y Downside" /><TimeSeries data={rows} forecastFrom={ms[12].label} refLine={{ y: minCash, label: 'Mínimo' }} series={[{ key: 'cash', name: 'Escenario activo', type: 'line', color: '#7C5CFC' }, { key: 'up', name: 'Upside', type: 'line', color: '#10B981', dashed: true }, { key: 'down', name: 'Downside', type: 'line', color: '#EF4444', dashed: true }]} /></Card>
    </div>
  )
}

export function WorkingCapital() {
  const { month } = useStore()
  const { ms } = useData()
  const m = ms[month]
  const rows = ms.slice(0, 24).map((r) => ({ label: r.label, DSO: r.dso, DIO: r.dio, DPO: r.dpo, nwc: r.nwc, ccc: r.dso + r.dio - r.dpo }))
  return (
    <div className="space-y-6">
      <PageHeader title="Working Capital" sub="Capital de trabajo operativo = CxC + Inventarios − CxP − IVA por pagar. Cada día de mejora libera caja." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPIStatCard label="Capital de trabajo" value={m.nwc} delta={0} good={-1} />
        <Card><div className="text-xs text-muted">DSO</div><div className="mt-1 text-2xl font-bold num">{m.dso.toFixed(0)} d</div></Card>
        <Card><div className="text-xs text-muted">DIO</div><div className="mt-1 text-2xl font-bold num">{m.dio.toFixed(0)} d</div></Card>
        <Card><div className="text-xs text-muted">DPO</div><div className="mt-1 text-2xl font-bold num">{m.dpo.toFixed(0)} d</div></Card>
        <Card><div className="text-xs text-muted">Ciclo de conversión</div><div className="mt-1 text-2xl font-bold num">{(m.dso + m.dio - m.dpo).toFixed(0)} d</div></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Días de capital de trabajo" /><TimeSeries data={rows} forecastFrom={ms[12].label} pctKeys={[]} series={[{ key: 'DSO', name: 'DSO', type: 'line', color: '#EF4444' }, { key: 'DIO', name: 'DIO', type: 'line', color: '#4F8CFF' }, { key: 'DPO', name: 'DPO', type: 'line', color: '#10B981' }]} height={240} /></Card>
        <Card><CardHeader title="Capital de trabajo (COP)" /><TimeSeries data={rows} forecastFrom={ms[12].label} series={[{ key: 'nwc', name: 'Capital de trabajo', type: 'area', color: '#7C5CFC' }]} height={240} /></Card>
      </div>
      <Card><CardHeader title="¿Cuánta caja libera mejorar el ciclo?" sub="Con base en las ventas y costos del mes seleccionado" />
        <FinancialDataTable head={['Palanca', 'Caja liberada (M)']} rows={[
          { key: '1', cells: ['−5 días de DSO (cobranza)', mm(m.revenue / 30 * 5, 0)] }, { key: '2', cells: ['−5 días de DIO (inventario)', mm(m.cogs / 30 * 5, 0)] }, { key: '3', cells: ['+5 días de DPO (proveedores)', mm(m.cogs / 30 * 5, 0)] },
          { key: '4', bold: true, shade: true, cells: ['Total combinado', mm(m.revenue / 30 * 5 + m.cogs / 30 * 10, 0)] },
        ]} /></Card>
    </div>
  )
}

export function Ratios() {
  const { month } = useStore()
  const { ms } = useData()
  const r = ratios(ms, month)
  const series = ms.slice(0, 12).map((_, t) => { const q = ratios(ms, t); return { label: ms[t].label, current: q.current, nde: q.netDebtEbitda } })
  const groups: [string, [string, string, boolean][]][] = [
    ['Liquidez', [['Razón corriente', x(r.current), r.current >= 1.2], ['Prueba ácida', x(r.quick), r.quick >= 0.8], ['Razón de caja', x(r.cashRatio), r.cashRatio >= 0.2]]],
    ['Endeudamiento', [['Deuda / Patrimonio', x(r.debtEquity), r.debtEquity <= 1.5], ['Deuda neta / EBITDA', x(r.netDebtEbitda), r.netDebtEbitda <= 3], ['Cobertura de intereses', x(r.interestCov), r.interestCov >= 2], ['Pasivos / Activos', pct(r.debtAssets), r.debtAssets <= 0.7]]],
    ['Rentabilidad', [['Margen bruto', pct(r.gm), r.gm >= 0.3], ['Margen EBITDA', pct(r.em), r.em >= 0.09], ['Margen neto', pct(r.nm), r.nm >= 0.04], ['ROE (LTM)', pct(r.roe), r.roe >= 0.12], ['ROA (LTM)', pct(r.roa), r.roa >= 0.04]]],
    ['Eficiencia', [['Rotación de activos', x(r.assetTurn), r.assetTurn >= 1], ['Ciclo de conversión de caja', `${r.ccc.toFixed(0)} d`, r.ccc <= 55]]],
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Financial Ratios" sub="Razones calculadas sobre los estados financieros del mes seleccionado (flujos en base LTM)." />
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(([g, items]) => (
          <Card key={g}><CardHeader title={g} /><ul className="space-y-2">{items.map(([n, v, ok]) => <li key={n} className="flex items-center justify-between rounded-xl bg-sub px-3 py-2.5 text-sm"><span className="text-ink">{n}</span><span className="flex items-center gap-2"><b className="num">{v}</b><span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-fin' : 'bg-warn'}`} /></span></li>)}</ul></Card>
        ))}
      </div>
      <Card><CardHeader title="Tendencia: razón corriente y deuda neta / EBITDA" /><TimeSeries data={series} pctKeys={[]} series={[{ key: 'current', name: 'Razón corriente (x)', type: 'line', color: '#7C5CFC' }, { key: 'nde', name: 'Deuda neta / EBITDA (x)', type: 'line', color: '#EF4444', axis: 'r' }]} height={240} /></Card>
    </div>
  )
}

export function Simulator() {
  const { sim, set, tax, wacc, tg } = useStore()
  const { models } = useData()
  const p = params(tax)
  const simMs = useMemo(() => runModel(HIST, sim, p, undefined), [sim, p.taxRate])
  const baseMs = useMemo(() => runModel(HIST, SCENARIOS.base, p, undefined), [p.taxRate])
  void models
  const c = simCompare(baseMs, simMs, p.taxRate, wacc, tg)
  void wacc; void tg
  const metrics: [string, 'revenue' | 'ebitda' | 'margin' | 'ni' | 'nwc' | 'fcf' | 'cash' | 'ev', number][] = [['Ingresos año 1', 'revenue', 1], ['EBITDA', 'ebitda', 1], ['Margen EBITDA', 'margin', 1], ['Utilidad neta', 'ni', 1], ['Capital de trabajo', 'nwc', -1], ['Flujo de caja libre', 'fcf', 1], ['Caja final', 'cash', 1], ['Valor empresa (EV)', 'ev', 1]]
  const cmp = (k: typeof metrics[number][1]) => (k === 'margin' ? c.sim[k] - c.base[k] : (c.sim[k] - c.base[k]) / Math.abs(c.base[k]))
  const chart = (f: (m: Month) => number) => simMs.slice(0, 36).map((m, i) => ({ label: m.label, base: f(baseMs[i]), sim: f(m) }))
  const ser = [{ key: 'base', name: 'Escenario base', type: 'line' as const, color: '#94A3B8', dashed: true }, { key: 'sim', name: 'Escenario simulado', type: 'line' as const, color: '#7C5CFC' }]
  return (
    <div className="space-y-6">
      <PageHeader title="Financial Scenario Simulator" badge="Interactivo" sub="Mueve los drivers y observa en tiempo real el impacto sobre EBITDA, caja y valor de la empresa. Cálculo determinístico sobre el mismo motor." right={<Btn variant="outline" onClick={() => set({ sim: { ...SCENARIOS.base } })}><RotateCcw size={14} /> Reset Scenario</Btn>} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit xl:sticky xl:top-20"><CardHeader title="Drivers" sub="Punto de partida: Base Case" />
          <div className="space-y-4">{DRIVER_DEFS.map((d) => <ScenarioSlider key={d.key} label={d.label} value={sim[d.key]} min={d.min} max={d.max} step={d.step} base={SCENARIOS.base[d.key]} format={d.fmt} onChange={(v) => set({ sim: { ...sim, [d.key]: v } })} />)}</div>
        </Card>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([l, k, good]) => (
              <Card key={k} className="!p-4"><div className="text-xs font-medium text-muted">{l}</div>
                <div className="mt-1 text-xl font-bold num text-ink">{k === 'margin' ? pct(c.sim[k]) : money(c.sim[k])}</div>
                <div className="mt-1 flex items-center gap-1.5"><VarianceIndicator value={cmp(k)} good={good as 1} pctMode={k !== 'margin'} /><span className="text-[11px] text-muted">vs base {k === 'margin' ? pct(c.base[k]) : money(c.base[k])}</span></div></Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader title="EBITDA mensual" /><TimeSeries data={chart((m) => m.ebitda)} forecastFrom={baseMs[12].label} series={ser} height={230} /></Card>
            <Card><CardHeader title="Caja final" /><TimeSeries data={chart((m) => m.cash)} forecastFrom={baseMs[12].label} series={ser} height={230} /></Card>
            <Card className="lg:col-span-2"><CardHeader title="Base vs simulado — año 1" /><TimeSeries data={[{ label: 'Ingresos', base: c.base.revenue, sim: c.sim.revenue }, { label: 'EBITDA', base: c.base.ebitda, sim: c.sim.ebitda }, { label: 'Utilidad neta', base: c.base.ni, sim: c.sim.ni }, { label: 'FCF', base: c.base.fcf, sim: c.sim.fcf }, { label: 'Caja final', base: c.base.cash, sim: c.sim.cash }]} series={[{ key: 'base', name: 'Base', color: '#94A3B8' }, { key: 'sim', name: 'Simulado', color: '#7C5CFC' }]} height={230} /></Card>
          </div>
          <Disclaimer>Escenario simulado sobre datos ficticios. La proyección parte del saldo de cierre de dic-2026 de Nova Comercial S.A.S. y usa WACC {pct(0.15)} / crecimiento terminal {pct(0.035)} para el EV (editable en Valuation).</Disclaimer>
        </div>
      </div>
      <p className="text-xs text-muted">{num(c.sim.revenue / 1e6)} M ingresos simulados · {spct(c.sim.ev / c.base.ev - 1)} en EV vs base.</p>
    </div>
  )
}
