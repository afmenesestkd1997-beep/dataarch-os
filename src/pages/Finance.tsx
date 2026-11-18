import { useState } from 'react'
import { useStore } from '../lib/store'
import { useData } from '../lib/hooks'
import { BUCKETS, opexBreakdown, productStats, treasury13, supplierStats } from '../lib/analytics'
import { BANKS, CATEGORIES } from '../lib/seed'
import { HIST_MONTHS, Month, checks, ltm, sum } from '../lib/engine'
import { downloadCSV, mm, money, pct, spct } from '../lib/format'
import { Badge, Btn, Card, CardHeader, CheckPill, Disclaimer, Drawer, FinancialAlert, FinancialDataTable, KPIStatCard, PageHeader, Tabs, VarianceIndicator } from '../components/ui'
import { StackedBars, TimeSeries } from '../components/charts'

// ---------------- Estados financieros ----------------
type Line = { key: string; label: string; get: (m: Month) => number; bold?: boolean; sub?: boolean; shade?: boolean; stock?: boolean }
const IS: Line[] = [
  { key: 'revenue', label: 'Ingresos', get: (m) => m.revenue, bold: true },
  { key: 'cogs', label: '(−) Costo de ventas', get: (m) => -m.cogs },
  { key: 'gp', label: 'Utilidad bruta', get: (m) => m.gp, bold: true, shade: true },
  { key: 'fixedOpex', label: 'OPEX fijo', get: (m) => -m.fixedOpex, sub: true },
  { key: 'varOpex', label: 'OPEX variable', get: (m) => -m.varOpex, sub: true },
  { key: 'opex', label: '(−) Gastos operacionales', get: (m) => -m.opex },
  { key: 'ebitda', label: 'EBITDA', get: (m) => m.ebitda, bold: true, shade: true },
  { key: 'da', label: '(−) Depreciación y amortización', get: (m) => -m.da },
  { key: 'ebit', label: 'EBIT', get: (m) => m.ebit, bold: true },
  { key: 'interest', label: '(−) Gastos financieros', get: (m) => -m.interest },
  { key: 'tax', label: '(−) Impuesto de renta', get: (m) => -m.tax },
  { key: 'ni', label: 'Utilidad neta', get: (m) => m.ni, bold: true, shade: true },
]
const BS: Line[] = [
  { key: 'cash', label: 'Caja y bancos', get: (m) => m.cash, stock: true },
  { key: 'ar', label: 'Cuentas por cobrar', get: (m) => m.ar, stock: true },
  { key: 'inv', label: 'Inventarios', get: (m) => m.inv, stock: true },
  { key: 'fa', label: 'Activos fijos netos', get: (m) => m.fa, stock: true },
  { key: 'assets', label: 'TOTAL ACTIVOS', get: (m) => checks(m).assets, bold: true, shade: true, stock: true },
  { key: 'ap', label: 'Cuentas por pagar', get: (m) => m.ap, stock: true },
  { key: 'ivaPay', label: 'IVA por pagar', get: (m) => m.ivaPay, stock: true },
  { key: 'debt', label: 'Deuda financiera', get: (m) => m.debt, stock: true },
  { key: 'liab', label: 'TOTAL PASIVOS', get: (m) => m.ap + m.ivaPay + m.debt, bold: true, stock: true },
  { key: 'equity', label: 'Patrimonio', get: (m) => m.equity, stock: true },
  { key: 'le', label: 'TOTAL PASIVO + PATRIMONIO', get: (m) => checks(m).le, bold: true, shade: true, stock: true },
]
const CF: Line[] = [
  { key: 'ni', label: 'Utilidad neta', get: (m) => m.ni, sub: true },
  { key: 'da', label: '(+) D&A (no caja)', get: (m) => m.da, sub: true },
  { key: 'wc', label: '(±) Variación capital de trabajo', get: (m) => m.cfo - m.ni - m.da, sub: true },
  { key: 'cfo', label: 'Flujo operativo', get: (m) => m.cfo, bold: true, shade: true },
  { key: 'cfi', label: 'Flujo de inversión (CAPEX)', get: (m) => m.cfi, bold: true },
  { key: 'cff', label: 'Flujo de financiación (amort. deuda)', get: (m) => m.cff, bold: true },
  { key: 'netCf', label: 'Cambio neto en caja', get: (m) => m.netCf, bold: true, shade: true },
  { key: 'openCash', label: 'Caja inicial', get: (m) => m.openCash, stock: true },
  { key: 'cash', label: 'Caja final', get: (m) => m.cash, bold: true, stock: true },
]

function drill(key: string, ms: Month[], t: number): { title: string; note: string; items: { name: string; value: number }[] } {
  const m = ms[t]
  const prev = ms[Math.max(0, t - 1)]
  if (key === 'revenue' || key === 'gp') { const p = productStats(ms, t); return { title: key === 'gp' ? 'Utilidad bruta por categoría' : 'Ingresos por categoría', note: 'Suma de productos del mes.', items: CATEGORIES.map((c) => ({ name: c, value: p.filter((q) => q.category === c).reduce((s, q) => s + (key === 'gp' ? q.gp : q.sales), 0) })) } }
  if (key === 'cogs') { const p = productStats(ms, t); return { title: 'Costo de ventas por categoría', note: 'Ventas − utilidad bruta.', items: CATEGORIES.map((c) => ({ name: c, value: -p.filter((q) => q.category === c).reduce((s, q) => s + q.sales - q.gp, 0) })) } }
  if (['opex', 'fixedOpex', 'varOpex'].includes(key)) return { title: 'OPEX por categoría', note: 'Gastos administrativos y comerciales.', items: opexBreakdown(ms, t).map((o) => ({ name: `${o.name} (${o.type})`, value: -o.value })) }
  if (key === 'cash') return { title: 'Caja por cuenta bancaria', note: 'Distribución ilustrativa por cuenta.', items: BANKS.map((b) => ({ name: `${b.name} · ${b.type}`, value: m.cash * b.share })) }
  if (key === 'wc' || key === 'cfo') return { title: 'Variación del capital de trabajo', note: 'Aumento de activos consume caja; aumento de pasivos la libera.', items: [{ name: 'Δ Cuentas por cobrar', value: -(m.ar - prev.ar) }, { name: 'Δ Inventarios', value: -(m.inv - prev.inv) }, { name: 'Δ Cuentas por pagar', value: m.ap - prev.ap }, { name: 'Δ IVA por pagar', value: m.ivaPay - prev.ivaPay }] }
  if (key === 'ebitda') return { title: 'Construcción del EBITDA', note: 'EBITDA ≠ caja: no incluye variación de capital de trabajo, CAPEX ni deuda.', items: [{ name: 'Ingresos', value: m.revenue }, { name: 'Costo de ventas', value: -m.cogs }, { name: 'OPEX', value: -m.opex }] }
  return { title: 'Detalle', note: 'Partida calculada por el motor financiero.', items: [{ name: 'Valor del mes', value: IS.concat(BS, CF).find((l) => l.key === key)?.get(m) ?? 0 }, { name: 'Mes anterior', value: IS.concat(BS, CF).find((l) => l.key === key)?.get(prev) ?? 0 }] }
}

export function Estados() {
  const { month } = useStore()
  const { ms } = useData()
  const [tab, setTab] = useState<'is' | 'bs' | 'cf'>('is')
  const [range, setRange] = useState<'h' | 'p1' | 'p2'>('h')
  const [cum, setCum] = useState(false)
  const [dk, setDk] = useState<string | null>(null)
  const lines = tab === 'is' ? IS : tab === 'bs' ? BS : CF
  const slice = range === 'h' ? ms.slice(0, 12) : range === 'p1' ? ms.slice(12, 24) : ms.slice(24, 36)
  const tIdx = range === 'h' ? month : slice.length - 1
  const cumulative = cum && tab !== 'bs'
  const vals = (l: Line) => slice.map((m, i) => (cumulative && !l.stock ? slice.slice(0, i + 1).reduce((s, x) => s + l.get(x), 0) : l.get(m)))
  const fmt = (v: number) => mm(v, 1)
  const totalOf = (l: Line) => (l.stock ? l.get(slice[tIdx]) : slice.slice(0, tIdx + 1).reduce((s, m) => s + l.get(m), 0))
  const rows = lines.map((l) => {
    const v = vals(l)
    const cur = l.get(slice[tIdx]), prev = tIdx > 0 ? l.get(slice[tIdx - 1]) : l.get(ms[Math.max(0, slice[0].t - 1)])
    const dAbs = cur - prev, dPct = prev !== 0 ? dAbs / Math.abs(prev) : 0
    return { key: l.key, bold: l.bold, sub: l.sub, shade: l.shade, cells: [l.label, ...v.map(fmt), <b key="y">{fmt(totalOf(l))}</b>, fmt(dAbs), <VarianceIndicator key="p" value={dPct} good={0} />] }
  })
  const head = ['COP millones', ...slice.map((m) => (m.isActual ? m.label : `${m.label}ᵖ`)), tab === 'bs' ? 'Saldo' : 'YTD', 'Δ vs mes ant.', 'Δ %']
  const cur = slice[tIdx], ck = checks(cur)
  const worstBal = Math.max(...ms.map((m) => Math.abs(checks(m).balanceDiff)))
  const worstCash = Math.max(...ms.map((m) => Math.abs(checks(m).cashDiff)))
  const csv = () => downloadCSV(`estado_${tab}_${range}.csv`, [head.map(String), ...lines.map((l) => [l.label, ...vals(l).map((v) => Math.round(v / 1e6 * 10) / 10), Math.round(totalOf(l) / 1e6 * 10) / 10])])
  const d = dk ? drill(dk, ms, cur.t) : null
  return (
    <div className="space-y-6">
      <PageHeader title="Estados Financieros" sub="Estado de resultados, balance general y flujo de caja integrados: los tres cuadran bajo supuestos simplificados." right={<Btn variant="outline" onClick={csv}>Exportar CSV</Btn>} />
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'is', label: 'Estado de resultados' }, { id: 'bs', label: 'Balance general' }, { id: 'cf', label: 'Flujo de caja' }]} />
        <Tabs value={range} onChange={setRange} tabs={[{ id: 'h', label: 'Histórico (real)' }, { id: 'p1', label: 'Proyección año 1' }, { id: 'p2', label: 'Proyección año 2' }]} />
        {tab !== 'bs' && <Tabs value={cum ? 'y' : 'm'} onChange={(v) => setCum(v === 'y')} tabs={[{ id: 'm', label: 'Mensual' }, { id: 'y', label: 'Acumulado YTD' }]} />}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <CheckPill ok={worstBal < 1} label="Activos = Pasivos + Patrimonio" detail={`dif. máx. 36 meses: ${worstBal.toFixed(2)} COP · mes actual ${ck.balanceDiff.toFixed(2)}`} />
        <CheckPill ok={worstCash < 1} label="Caja final = Caja inicial + Flujo neto" detail={`dif. máx. 36 meses: ${worstCash.toFixed(2)} COP`} />
      </div>
      <Card pad={false} className="p-3">
        <FinancialDataTable head={head} rows={rows} onRow={setDk} dense />
        <p className="px-2 pt-3 text-[11px] text-muted">ᵖ = período proyectado · Haz clic en una fila para ver el desglose (drill-down). Supuesto: impuesto de renta pagado en el mes; IVA como partida transitoria. EBITDA ≠ caja.</p>
      </Card>
      <Drawer open={!!d} onClose={() => setDk(null)} title={d?.title ?? ''}>
        {d && (<>
          <p className="mb-4 text-sm text-muted">{d.note} · Mes: <b className="text-ink">{cur.label}</b></p>
          <FinancialDataTable head={['Concepto', 'COP M']} rows={d.items.map((i) => ({ key: i.name, cells: [i.name, mm(i.value, 1)] }))} stickyFirst={false} />
          <div className="mt-3 text-right text-sm font-semibold num">Total: {mm(d.items.reduce((s, i) => s + i.value, 0), 1)} M</div>
        </>)}
      </Drawer>
    </div>
  )
}

// ---------------- Contabilidad ----------------
export function Contabilidad() {
  const { month, invoices } = useStore()
  const { ms } = useData()
  const sl = ms.slice(0, month + 1), m = ms[month]
  const open = ms[0]
  const eq0 = open.equity - open.ni
  const tb = [
    { code: '1105', name: 'Caja y bancos', d: m.cash, c: 0 }, { code: '1305', name: 'Clientes (CxC)', d: m.ar, c: 0 }, { code: '1435', name: 'Inventario de mercancía', d: m.inv, c: 0 },
    { code: '1524', name: 'Activos fijos netos', d: m.fa, c: 0 },
    { code: '2205', name: 'Proveedores (CxP)', d: 0, c: m.ap }, { code: '2408', name: 'IVA por pagar', d: 0, c: m.ivaPay }, { code: '2105', name: 'Obligaciones financieras', d: 0, c: m.debt },
    { code: '3105', name: 'Patrimonio inicial', d: 0, c: eq0 },
    { code: '4135', name: 'Ingresos operacionales (acum.)', d: 0, c: sum(sl, 'revenue') }, { code: '6135', name: 'Costo de ventas (acum.)', d: sum(sl, 'cogs'), c: 0 },
    { code: '5105', name: 'Gastos operacionales (acum.)', d: sum(sl, 'opex'), c: 0 }, { code: '5160', name: 'Depreciaciones (acum.)', d: sum(sl, 'da'), c: 0 },
    { code: '5305', name: 'Gastos financieros (acum.)', d: sum(sl, 'interest'), c: 0 }, { code: '5405', name: 'Impuesto de renta (acum.)', d: sum(sl, 'tax'), c: 0 },
  ]
  const D = tb.reduce((s, r) => s + r.d, 0), C = tb.reduce((s, r) => s + r.c, 0)
  return (
    <div className="space-y-6">
      <PageHeader title="Contabilidad" sub="Balance de comprobación acumulado generado por el motor (plan de cuentas simplificado, estilo PUC)." />
      <CheckPill ok={Math.abs(D - C) < 1} label="Débitos = Créditos" detail={`${mm(D, 1)} M vs ${mm(C, 1)} M`} />
      <Card><FinancialDataTable head={['Cuenta', 'Nombre', 'Débito (M)', 'Crédito (M)']} rows={[...tb.map((r) => ({ key: r.code, cells: [r.code, r.name, r.d ? mm(r.d, 1) : '', r.c ? mm(r.c, 1) : ''] })), { key: 'tot', bold: true, shade: true, cells: ['', 'TOTAL', mm(D, 1), mm(C, 1)] }]} /></Card>
      <Card>
        <CardHeader title="Asientos de ventas registradas" sub="Generados en esta sesión desde el módulo de Ventas" />
        {invoices.length === 0 ? <p className="text-sm text-muted">Aún no hay facturas nuevas. Registra una venta en el módulo Ventas para ver su asiento contable.</p> : (
          <FinancialDataTable head={['Factura', 'Cuenta', 'Débito (M)', 'Crédito (M)']} rows={invoices.flatMap((i) => [
            { key: i.id + 'a', cells: [i.id, i.credit ? '1305 Clientes' : '1105 Caja', mm(i.total, 1), ''] },
            { key: i.id + 'b', cells: ['', '4135 Ingresos', '', mm(i.net, 1)], sub: true }, { key: i.id + 'c', cells: ['', '2408 IVA generado', '', mm(i.iva, 1)], sub: true },
            { key: i.id + 'd', cells: ['', '6135 Costo de ventas', mm(i.cost, 1), ''], sub: true }, { key: i.id + 'e', cells: ['', '1435 Inventario', '', mm(i.cost, 1)], sub: true },
          ])} />
        )}
      </Card>
    </div>
  )
}

// ---------------- CxC / CxP ----------------
export function CxC() {
  const { month } = useStore()
  const { ms, ag } = useData()
  const m = ms[month]
  const tot = BUCKETS.map((b, i) => ({ name: b, v: ag.reduce((s, r) => s + r.buckets[i], 0) }))
  const T = tot.reduce((s, b) => s + b.v, 0)
  const sorted = [...ag].sort((a, b) => b.overdue - a.overdue)
  return (
    <div className="space-y-6">
      <PageHeader title="Cuentas por Cobrar" sub="Antigüedad de cartera por cliente. El total reconcilia con el Balance General al cierre de dic-2026." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStatCard label="Cartera total" value={T} delta={0} good={-1} hint={month === 11 ? 'Reconcilia con balance' : 'Aging a cierre dic-26'} />
        <KPIStatCard label="Cartera vencida" value={T - tot[0].v} delta={0} good={-1} hint={pct((T - tot[0].v) / T) + ' del total'} />
        <KPIStatCard label="DSO" value={m.dso * 1e6} delta={0} good={-1} hint={`${m.dso.toFixed(0)} días`} />
        <KPIStatCard label="Mayor deudor" value={sorted[0].overdue} delta={0} good={-1} hint={sorted[0].name} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Antigüedad de cartera" /><StackedBars data={[{ label: 'Cartera', ...Object.fromEntries(tot.map((b) => [b.name, b.v])) }]} keys={tot.map((b, i) => ({ key: b.name, name: b.name, color: ['#10B981', '#4F8CFF', '#F59E0B', '#F97316', '#EF4444'][i] }))} /></Card>
        <Card className="lg:col-span-2"><CardHeader title="Detalle por cliente" sub="Ordenado por saldo vencido" />
          <FinancialDataTable head={['Cliente', ...BUCKETS.map((b) => b + ' (M)'), 'Total (M)']} rows={sorted.map((r) => ({ key: r.id, cells: [r.name, ...r.buckets.map((b) => mm(b, 1)), <b key="t">{mm(r.total, 1)}</b>] }))} dense />
        </Card>
      </div>
    </div>
  )
}

export function CxP() {
  const { month } = useStore()
  const { ms } = useData()
  const s = supplierStats(ms, month)
  const m = ms[month]
  const cal = s.map((p, i) => ({ ...p, due: `${String(2 + ((i * 2) % 28)).padStart(2, '0')}-ene-2027`, amount: p.ap * (30 / Math.max(30, p.terms)) })).sort((a, b) => a.due.localeCompare(b.due))
  return (
    <div className="space-y-6">
      <PageHeader title="Cuentas por Pagar" sub="Saldo por proveedor y calendario de pagos de los próximos 30 días." />
      <div className="grid gap-4 sm:grid-cols-3">
        <KPIStatCard label="CxP total" value={m.ap} delta={0} good={0} />
        <KPIStatCard label="DPO" value={m.dpo * 1e6} delta={0} good={1} hint={`${m.dpo.toFixed(0)} días`} />
        <KPIStatCard label="Vencido" value={s.reduce((a, p) => a + p.overdue, 0)} delta={0} good={-1} />
      </div>
      <Card><CardHeader title="Calendario de pagos (ilustrativo)" /><FinancialDataTable head={['Proveedor', 'Vence', 'Plazo', 'Saldo (M)', 'Pago estimado (M)']} rows={cal.map((p) => ({ key: p.id, cells: [p.name, p.due, `${p.terms} d`, mm(p.ap, 1), mm(p.amount, 1)] }))} dense /></Card>
    </div>
  )
}

// ---------------- Tesorería ----------------
export function Treasury13() {
  const { ms } = useData()
  const { minCash, set } = useStore()
  const w = treasury13(ms)
  const low = w.filter((x) => x.ending < minCash)
  const row = (label: string, k: keyof typeof w[0], opts: { bold?: boolean; neg?: boolean } = {}) => ({ key: label, bold: opts.bold, shade: opts.bold, cells: [label, ...w.map((x) => mm(opts.neg ? -(x[k] as number) : (x[k] as number), 0))] })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">Caja mínima (COP M)
          <input type="number" step={50} value={Math.round(minCash / 1e6)} onChange={(e) => set({ minCash: Math.max(0, Number(e.target.value)) * 1e6 })} className="w-28 rounded-xl border border-line bg-sub px-3 py-1.5 text-sm text-ink outline-none focus:border-violet" />
        </label>
        {low.length > 0 ? <Badge tone="red">{low.length} semanas bajo el mínimo (primera: {low[0].label})</Badge> : <Badge tone="green">Caja sobre el mínimo en las 13 semanas</Badge>}
      </div>
      <TimeSeries data={w.map((x) => ({ label: x.label, ending: x.ending, net: x.ending - x.opening }))} refLine={{ y: minCash, label: 'Mínimo' }} series={[{ key: 'net', name: 'Flujo neto semanal', color: '#4F8CFF' }, { key: 'ending', name: 'Caja final', type: 'line', color: '#7C5CFC' }]} height={240} />
      <FinancialDataTable head={['COP millones', ...w.map((x) => x.label)]} dense rows={[
        row('Caja inicial', 'opening'), row('(+) Recaudos', 'collections'), row('(−) Pago a proveedores', 'suppliers', { neg: true }), row('(−) Nómina', 'payroll', { neg: true }),
        row('(−) Otros gastos operativos', 'otherOpex', { neg: true }), row('(−) Impuestos', 'taxes', { neg: true }), row('(−) Servicio de deuda', 'debt', { neg: true }), row('(−) CAPEX', 'capex', { neg: true }), row('Caja final', 'ending', { bold: true }),
      ]} />
      <p className="text-[11px] text-muted">El flujo semanal es una distribución de los meses 13-15 del modelo; la caja final de la semana 13 coincide con la caja mensual proyectada.</p>
    </div>
  )
}

export function Tesoreria() {
  const { month, minCash } = useStore()
  const { ms, alerts } = useData()
  const m = ms[month]
  const flows = ms.slice(0, 12).map((x) => ({ label: x.label, in: x.collections, out: -(x.supplierPay + x.opex + x.interest + x.tax + x.capex + -x.cff), cash: x.cash }))
  const obl = [['Nómina quincenal', 'Cada 15 y 30', 0.55 * ms[12].fixedOpex / 2], ['Servicio de deuda', 'Primer día hábil', ms[12].interest - ms[12].cff], ['IVA bimestral (estimado)', '12-ene-2027', ms[12].revenue * 0.19 * 0.35], ['Pago a proveedores clave', 'Semanal', ms[12].supplierPay / 4.3]] as [string, string, number][]
  return (
    <div className="space-y-6">
      <PageHeader title="Tesorería" sub="Posición de caja, cuentas bancarias, obligaciones próximas y proyección de liquidez a 13 semanas." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStatCard label="Caja disponible" value={m.cash} delta={(m.cash - ms[Math.max(0, month - 1)].cash) / ms[Math.max(0, month - 1)].cash} />
        <KPIStatCard label="Por cobrar" value={m.ar} delta={0} good={-1} />
        <KPIStatCard label="Por pagar" value={m.ap} delta={0} good={0} />
        <KPIStatCard label="Colchón vs mínimo" value={m.cash - minCash} delta={0} hint={`Mínimo ${money(minCash)}`} />
      </div>
      {alerts.filter((a) => a.id === 'cash').map((a) => <FinancialAlert key={a.id} a={a} />)}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Entradas y salidas de caja" sub="Recaudos vs. desembolsos operativos, financieros y de inversión" /><TimeSeries data={flows} series={[{ key: 'in', name: 'Entradas', color: '#10B981' }, { key: 'out', name: 'Salidas', color: '#EF4444' }, { key: 'cash', name: 'Caja', type: 'line', color: '#7C5CFC' }]} /></Card>
        <Card><CardHeader title="Cuentas bancarias (ficticias)" />
          <ul className="space-y-3">{BANKS.map((b) => <li key={b.name} className="flex items-center justify-between"><div><div className="text-sm font-medium text-ink">{b.name}</div><div className="text-[11px] text-muted">{b.type}</div></div><b className="num text-ink">{money(m.cash * b.share)}</b></li>)}</ul>
        </Card>
      </div>
      <Card><CardHeader title="Próximas obligaciones" sub="Mes siguiente según el escenario activo" />
        <FinancialDataTable head={['Obligación', 'Fecha', 'Monto (M)']} rows={obl.map((o) => ({ key: o[0], cells: [o[0], o[1], mm(o[2], 1)] }))} />
      </Card>
      <Card><CardHeader title="Flujo de caja a 13 semanas" /><Treasury13 /></Card>
    </div>
  )
}

// ---------------- Impuestos ----------------
export function Impuestos() {
  const { tax, set, month, paid, dueDates } = useStore()
  const { ms } = useData()
  const m = ms[month]
  const ivaGen = m.revenue * tax.iva
  const ivaDesc = (m.purchases + 0.35 * m.opex) * tax.iva
  const ret = m.purchases * tax.reteFuente
  const ica = m.revenue * tax.reteIca
  const renta = ltm(ms, 'tax', month)
  const set1 = (k: keyof typeof tax, v: number) => set({ tax: { ...tax, [k]: v / 100 } })
  const field = 'w-24 rounded-lg border border-line bg-sub px-2 py-1 text-right text-sm text-ink outline-none focus:border-violet'
  const cal = [
    { id: 'iva', name: 'IVA bimestral (simulado)', def: '2027-01-12', amt: Math.max(0, ivaGen - ivaDesc) * 2 },
    { id: 'rete', name: 'Retención en la fuente', def: '2027-01-10', amt: ret },
    { id: 'ica', name: 'ICA Bogotá (simulado)', def: '2027-01-20', amt: ica },
    { id: 'renta', name: 'Anticipo renta (simulado)', def: '2027-02-15', amt: renta / 12 },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Impuestos" sub="Módulo tributario ilustrativo para Colombia. Las tasas son parámetros editables." badge="Simulado" />
      <Disclaimer>Estimaciones para fines de demostración. No sustituyen la revisión de un contador o asesor tributario. No hay integración con la DIAN.</Disclaimer>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPIStatCard label="IVA generado" value={ivaGen} delta={0} good={0} />
        <KPIStatCard label="IVA descontable" value={ivaDesc} delta={0} good={0} />
        <KPIStatCard label="IVA neto estimado" value={ivaGen - ivaDesc} delta={0} good={-1} />
        <KPIStatCard label="Retenciones (mes)" value={ret + ica} delta={0} good={0} />
        <KPIStatCard label="Renta estimada LTM" value={renta} delta={0} good={-1} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Parámetros (editables)" sub="No representan normativa vigente" />
          <ul className="space-y-3 text-sm">
            {([['iva', 'Tarifa IVA %'], ['renta', 'Impuesto de renta %'], ['reteFuente', 'Retención en la fuente %'], ['reteIca', 'ICA / Reteica %']] as [keyof typeof tax, string][]).map(([k, l]) => (
              <li key={k} className="flex items-center justify-between"><span className="text-muted">{l}</span><input type="number" step={0.1} className={field} value={+(tax[k] * 100).toFixed(2)} onChange={(e) => set1(k, Number(e.target.value))} /></li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted">El impuesto de renta alimenta el Estado de Resultados y el flujo de caja de todos los módulos.</p>
        </Card>
        <Card className="lg:col-span-2"><CardHeader title="Calendario tributario configurable" sub="Cambia la fecha o marca como pagada" />
          <FinancialDataTable head={['Obligación', 'Fecha límite', 'Monto (M)', 'Estado']} rows={cal.map((c) => ({ key: c.id, cells: [c.name, <input key="d" type="date" className={field + ' w-36 text-left'} value={dueDates[c.id] ?? c.def} onChange={(e) => set({ dueDates: { ...dueDates, [c.id]: e.target.value } })} />, mm(c.amt, 1), <button key="p" onClick={() => set({ paid: { ...paid, [c.id]: !paid[c.id] } })}><Badge tone={paid[c.id] ? 'green' : 'amber'}>{paid[c.id] ? 'Pagada' : 'Pendiente'}</Badge></button>] }))} />
        </Card>
      </div>
      <p className="text-xs text-muted">Margen impositivo efectivo LTM: {spct(renta / Math.max(1, ltm(ms, 'ebt', month)))} sobre utilidad antes de impuestos.</p>
    </div>
  )
}
void HIST_MONTHS
