import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Plus } from 'lucide-react'
import { useStore, Invoice } from '../lib/store'
import { useData } from '../lib/hooks'
import { inventoryRows, customerStats, opexBreakdown, productStats, supplierStats, invoiceAdj, ratios } from '../lib/analytics'
import { CATEGORIES, CUSTOMERS, PRODUCTS, AVG_BASE_MARGIN } from '../lib/seed'
import { HIST_MONTHS, ltm } from '../lib/engine'
import { downloadCSV, mm, money, pct, spct } from '../lib/format'
import { Badge, Btn, Card, CardHeader, FinancialDataTable, KPIStatCard, Modal, PageHeader, Tabs, VarianceIndicator, EmptyState } from '../components/ui'
import { Donut, HBar, StackedBars, TimeSeries } from '../components/charts'

/** Facturas base del último mes: una por cliente, suman exactamente los ingresos (sin facturas nuevas). */
export function baseInvoices(revBase: number) {
  return CUSTOMERS.map((c, i) => {
    const net = revBase * c.weight
    return { id: `FV-${String(2610 + i).padStart(4, '0')}`, date: `2026-12-${String(1 + ((i * 7) % 28)).padStart(2, '0')}`, customer: c.name, net, iva: net * 0.19, credit: c.terms > 30 || i % 4 !== 0, status: i % 5 === 4 ? 'Vencida' : 'Vigente' }
  })
}

export function InvoiceModal() {
  const { invoiceOpen, set, addInvoice, tax, invoices } = useStore()
  const { ms } = useData()
  const [cust, setCust] = useState(CUSTOMERS[0].id)
  const [prod, setProd] = useState(PRODUCTS[0].id)
  const [qty, setQty] = useState(20000)
  const [credit, setCredit] = useState(true)
  const [done, setDone] = useState<Invoice | null>(null)
  const p = PRODUCTS.find((q) => q.id === prod)!
  const m = ms[HIST_MONTHS - 1]
  const unitMargin = m.gp / m.revenue + (p.unitMargin - AVG_BASE_MARGIN)
  const net = qty * p.price, iva = net * tax.iva, cost = net * (1 - unitMargin)
  const close = () => { set({ invoiceOpen: false }); setDone(null) }
  const post = () => {
    const inv: Invoice = { id: `FV-${String(3000 + invoices.length + 1)}`, date: '2026-12-31', customerId: cust, productId: prod, qty, unitPrice: p.price, credit, net, iva, total: net + iva, cost }
    addInvoice(inv); setDone(inv)
  }
  const field = 'w-full rounded-xl border border-line bg-sub px-3 py-2 text-sm text-ink outline-none focus:border-violet'
  return (
    <Modal open={invoiceOpen} onClose={close} title={done ? 'Venta registrada' : 'Nueva factura (simulada)'}>
      {done ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-fin/10 p-3 text-sm font-semibold text-fin"><CheckCircle2 size={18} /> {done.id} contabilizada en el motor financiero</div>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-muted">Ventas (ingreso neto)</span><b className="num text-ink">+{money(done.net)}</b></li>
            <li className="flex justify-between"><span className="text-muted">IVA generado (ilustrativo)</span><b className="num text-ink">+{money(done.iva)}</b></li>
            <li className="flex justify-between"><span className="text-muted">{done.credit ? 'Cuenta por cobrar' : 'Entrada de caja'}</span><b className="num text-ink">+{money(done.total)}</b></li>
            <li className="flex justify-between"><span className="text-muted">Costo de venta</span><b className="num text-ink">{money(done.cost)}</b></li>
            <li className="flex justify-between"><span className="text-muted">Inventario</span><b className="num text-danger">-{money(done.cost)}</b></li>
            <li className="flex justify-between border-t border-line pt-2"><span className="text-muted">Utilidad bruta</span><b className="num text-fin">+{money(done.net - done.cost)}</b></li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link to="/estados" onClick={close}><Btn>Ver estados financieros</Btn></Link>
            <Link to="/cxc" onClick={close}><Btn variant="outline">Ver cartera</Btn></Link>
            <Btn variant="ghost" onClick={() => setDone(null)}>Otra venta</Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs font-semibold text-muted">Cliente<select className={field} value={cust} onChange={(e) => setCust(e.target.value)}>{CUSTOMERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="col-span-2 text-xs font-semibold text-muted">Producto<select className={field} value={prod} onChange={(e) => setProd(e.target.value)}>{PRODUCTS.map((q) => <option key={q.id} value={q.id}>{q.name} · {q.category}</option>)}</select></label>
            <label className="text-xs font-semibold text-muted">Cantidad (und.)<input type="number" min={1} className={field} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} /></label>
            <label className="text-xs font-semibold text-muted">Precio unitario<input readOnly className={field} value={money(p.price, false)} /></label>
          </div>
          <div className="flex gap-2">
            {[true, false].map((c) => <button key={String(c)} onClick={() => setCredit(c)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${credit === c ? 'border-violet bg-violet/10 text-violet' : 'border-line text-muted'}`}>{c ? 'A crédito (genera CxC)' : 'De contado (entra a caja)'}</button>)}
          </div>
          <div className="rounded-xl bg-sub p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><b className="num">{money(net)}</b></div>
            <div className="flex justify-between"><span className="text-muted">IVA {pct(tax.iva, 0)}</span><b className="num">{money(iva)}</b></div>
            <div className="flex justify-between border-t border-line pt-1.5"><span className="font-semibold">Total factura</span><b className="num text-violet">{money(net + iva)}</b></div>
            <div className="mt-1 flex justify-between text-xs text-muted"><span>Costo de venta estimado</span><span className="num">{money(cost)} · margen {pct(unitMargin)}</span></div>
          </div>
          <Btn onClick={post} className="w-full"><Plus size={16} /> Registrar venta</Btn>
          <p className="text-[11px] text-muted">La venta se contabiliza en el último mes cerrado (dic-2026): actualiza ventas, cartera/caja, IVA, costo, inventario y estados financieros.</p>
        </div>
      )}
    </Modal>
  )
}

export function Ventas() {
  const { month, set, invoices } = useStore()
  const { ms, models } = useData()
  const [tab, setTab] = useState<'res' | 'fact' | 'prod' | 'cli'>('res')
  const ag = useData().ag
  const k = ms[month]
  const adj = invoiceAdj(invoices)
  const base = baseInvoices(models.actual[HIST_MONTHS - 1].revenue - (adj?.rev ?? 0))
  const n = (month === HIST_MONTHS - 1 ? base.length + invoices.length : Math.round(base.length * k.revenue / models.actual[11].revenue))
  const prod = productStats(ms, month)
  const cust = customerStats(ms, month, ag)
  const series = ms.slice(0, 12).map((m) => ({ label: m.label, revenue: m.revenue, ticket: m.revenue / (base.length + (m.t === 11 ? invoices.length : 0)) }))
  const cat = CATEGORIES.map((c) => ({ name: c, value: prod.filter((p) => p.category === c).reduce((s, p) => s + p.sales, 0) }))
  const prev = ms[Math.max(0, month - 1)]
  const allInv = [...invoices.map((i) => ({ id: i.id, date: i.date, customer: CUSTOMERS.find((c) => c.id === i.customerId)!.name, net: i.net, iva: i.iva, credit: i.credit, status: 'Nueva', isNew: true })), ...base.map((b) => ({ ...b, isNew: false }))]
  return (
    <div className="space-y-6">
      <PageHeader title="Ventas" sub="Facturación, clientes y productos conectados al mismo motor financiero." right={<><Tabs value={tab} onChange={setTab} tabs={[{ id: 'res', label: 'Resumen' }, { id: 'fact', label: 'Facturas' }, { id: 'prod', label: 'Productos' }, { id: 'cli', label: 'Clientes' }]} /><Btn onClick={() => set({ invoiceOpen: true })}><Plus size={16} /> Nueva factura</Btn></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStatCard label="Ventas del mes" value={k.revenue} delta={(k.revenue - prev.revenue) / prev.revenue} />
        <KPIStatCard label="Ticket promedio" value={k.revenue / n} delta={0} hint={`${n} facturas en el mes`} />
        <KPIStatCard label="Utilidad bruta" value={k.gp} delta={(k.gp - prev.gp) / prev.gp} />
        <KPIStatCard label="Ventas LTM" value={ltm(ms, 'revenue', month)} delta={0} hint="Últimos 12 meses" />
      </div>
      {tab === 'res' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader title="Evolución mensual de ventas" sub="Ventas y ticket promedio por factura" /><TimeSeries data={series} series={[{ key: 'revenue', name: 'Ventas', color: '#7C5CFC' }, { key: 'ticket', name: 'Ticket promedio', type: 'line', axis: 'r', color: '#F59E0B' }]} /></Card>
          <Card><CardHeader title="Ventas por categoría" /><Donut data={cat} /></Card>
          <Card className="lg:col-span-2"><CardHeader title="Top 10 clientes (LTM)" /><HBar data={cust.slice(0, 10).map((c) => ({ name: c.name, value: c.sales }))} height={300} /></Card>
          <Card><CardHeader title="Top productos (mes)" /><HBar data={[...prod].sort((a, b) => b.sales - a.sales).slice(0, 8).map((p) => ({ name: p.name, value: p.sales }))} height={300} color="#10B981" /></Card>
        </div>
      )}
      {tab === 'fact' && (
        <Card>
          <CardHeader title="Facturas del último mes" sub={`${allInv.length} facturas · las nuevas aparecen primero`} right={<Btn variant="outline" onClick={() => downloadCSV('facturas.csv', [['Factura', 'Fecha', 'Cliente', 'Neto', 'IVA', 'Modalidad', 'Estado'], ...allInv.map((i) => [i.id, i.date, i.customer, Math.round(i.net), Math.round(i.iva), i.credit ? 'Crédito' : 'Contado', i.status])])}>Exportar CSV</Btn>} />
          {allInv.length === 0 ? <EmptyState title="Sin facturas" text="Registra tu primera venta simulada." /> : (
            <FinancialDataTable head={['Factura', 'Fecha', 'Cliente', 'Neto (M)', 'IVA (M)', 'Total (M)', 'Modalidad', 'Estado']} rows={allInv.map((i) => ({ key: i.id, cells: [i.id, i.date, <span key="c" className="text-ink">{i.customer}</span>, mm(i.net, 1), mm(i.iva, 1), mm(i.net + i.iva, 1), i.credit ? 'Crédito' : 'Contado', <Badge key="b" tone={i.status === 'Nueva' ? 'violet' : i.status === 'Vencida' ? 'red' : 'green'}>{i.status}</Badge>] }))} />
          )}
        </Card>
      )}
      {tab === 'prod' && (
        <Card>
          <CardHeader title="Ventas por producto" sub="Margen = margen bruto del mes ajustado por mezcla de producto" />
          <FinancialDataTable head={['Producto', 'Categoría', 'Ventas (M)', 'Unidades', 'Margen', 'Utilidad bruta (M)']} rows={[...prod].sort((a, b) => b.sales - a.sales).map((p) => ({ key: p.id, cells: [p.name, p.category, mm(p.sales, 1), Math.round(p.units).toLocaleString('es-CO'), pct(p.margin), mm(p.gp, 1)] }))} />
        </Card>
      )}
      {tab === 'cli' && <ClientTable />}
    </div>
  )
}

function ClientTable() {
  const { month } = useStore()
  const { ms, ag } = useData()
  const cust = customerStats(ms, month, ag)
  return (
    <Card>
      <CardHeader title="Ranking de clientes" sub="Ventas LTM, cartera y plazo de pago" />
      <FinancialDataTable head={['Cliente', 'Ventas LTM (M)', '% ventas', 'Cartera (M)', 'Vencida (M)', 'Plazo', 'Riesgo']} rows={cust.map((c) => ({ key: c.id, cells: [c.name, mm(c.sales, 1), pct(c.weight), mm(c.ar, 1), mm(c.overdue, 1), `${c.terms} d`, <Badge key="r" tone={['green', 'amber', 'red'][c.risk] as 'green'}>{['Bajo', 'Medio', 'Alto'][c.risk]}</Badge>] }))} />
    </Card>
  )
}
export function Clientes() {
  const { month } = useStore()
  const { ms, ag } = useData()
  const cust = customerStats(ms, month, ag)
  const top3 = cust.slice(0, 3).reduce((s, c) => s + c.weight, 0)
  const top10 = cust.slice(0, 10).reduce((s, c) => s + c.weight, 0)
  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" sub="30 clientes ficticios con concentración de ventas, plazos y riesgo de cartera." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><div className="text-xs text-muted">Clientes activos</div><div className="mt-1 text-2xl font-bold">30</div></Card>
        <Card><div className="text-xs text-muted">Concentración Top-3</div><div className="mt-1 text-2xl font-bold">{pct(top3)}</div></Card>
        <Card><div className="text-xs text-muted">Concentración Top-10</div><div className="mt-1 text-2xl font-bold">{pct(top10)}</div></Card>
      </div>
      <ClientTable />
    </div>
  )
}

export function Compras() {
  const { month } = useStore()
  const { ms } = useData()
  const m = ms[month], prev = ms[Math.max(0, month - 1)]
  const rows = ms.slice(0, 12).map((x) => ({ label: x.label, purchases: x.purchases, ap: x.ap, paid: x.supplierPay }))
  return (
    <div className="space-y-6">
      <PageHeader title="Compras" sub="Compras de mercancía = costo de venta + variación de inventario. Pagos a proveedores = compras − variación de CxP." />
      <div className="grid gap-4 sm:grid-cols-3">
        <KPIStatCard label="Compras del mes" value={m.purchases} delta={(m.purchases - prev.purchases) / Math.abs(prev.purchases)} good={0} />
        <KPIStatCard label="Pagos a proveedores" value={m.supplierPay} delta={(m.supplierPay - prev.supplierPay) / Math.abs(prev.supplierPay)} good={0} />
        <KPIStatCard label="Cuentas por pagar" value={m.ap} delta={(m.ap - prev.ap) / prev.ap} good={0} />
      </div>
      <Card><CardHeader title="Compras, pagos y CxP" /><TimeSeries data={rows} series={[{ key: 'purchases', name: 'Compras', color: '#7C5CFC' }, { key: 'paid', name: 'Pagos', color: '#4F8CFF' }, { key: 'ap', name: 'CxP (saldo)', type: 'line', color: '#F59E0B' }]} /></Card>
    </div>
  )
}

export function Proveedores() {
  const { month } = useStore()
  const { ms } = useData()
  const s = supplierStats(ms, month)
  return (
    <div className="space-y-6">
      <PageHeader title="Proveedores" sub="15 proveedores ficticios con saldo por pagar y plazo de pago." />
      <Card>
        <FinancialDataTable head={['Proveedor', 'Categoría', 'Compras mes (M)', 'Saldo CxP (M)', 'Vencido (M)', 'Plazo']} rows={s.map((p) => ({ key: p.id, cells: [p.name, p.category, mm(p.purchases, 1), mm(p.ap, 1), p.overdue ? <span key="o" className="font-semibold text-danger">{mm(p.overdue, 1)}</span> : '—', `${p.terms} d`] }))} />
      </Card>
    </div>
  )
}

export function Inventarios() {
  const { month, invoices } = useStore()
  const { ms } = useData()
  const m = ms[month]
  const rows = inventoryRows(ms, month, invoices)
  return (
    <div className="space-y-6">
      <PageHeader title="Inventarios" sub="El valor total del inventario coincide con el Balance General; las ventas registradas lo descargan." />
      <div className="grid gap-4 sm:grid-cols-3">
        <KPIStatCard label="Inventario total" value={m.inv} delta={(m.inv - ms[Math.max(0, month - 1)].inv) / ms[Math.max(0, month - 1)].inv} good={-1} />
        <Card><div className="text-xs text-muted">Días de inventario (DIO)</div><div className="mt-1 text-2xl font-bold num">{m.dio.toFixed(0)} d</div></Card>
        <Card><div className="text-xs text-muted">SKUs con baja o exceso de cobertura</div><div className="mt-1 text-2xl font-bold num">{rows.filter((r) => r.cover < 30 || r.cover > 75).length}</div></Card>
      </div>
      <Card>
        <FinancialDataTable head={['SKU', 'Producto', 'Categoría', 'Unidades', 'Costo unit.', 'Valor (M)', 'Cobertura', 'Estado']} rows={rows.map((r) => ({ key: r.id, cells: [r.id, r.name, r.category, Math.round(r.units).toLocaleString('es-CO'), money(r.cost, false), mm(r.value, 1), `${r.cover.toFixed(0)} d`, <Badge key="e" tone={r.cover < 30 ? 'red' : r.cover > 75 ? 'amber' : 'green'}>{r.cover < 30 ? 'Reponer' : r.cover > 75 ? 'Exceso' : 'Óptimo'}</Badge>] }))} />
      </Card>
    </div>
  )
}

export function Operaciones() {
  const { month } = useStore()
  const { ms } = useData()
  const m = ms[month]
  const r = ratios(ms, month)
  const ob = opexBreakdown(ms, month)
  const prod = productStats(ms, month)
  const catM = CATEGORIES.map((c) => { const p = prod.filter((q) => q.category === c); const s = p.reduce((a, q) => a + q.sales, 0); return { label: c, margen: p.reduce((a, q) => a + q.gp, 0) / s } })
  const growth = [...ob].sort((a, b) => b.growth - a.growth)
  return (
    <div className="space-y-6">
      <PageHeader title="Operaciones" sub="Eficiencia operativa: rotación, ciclo de caja y gastos que más crecen." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-xs text-muted">Rotación de inventario (anual)</div><div className="mt-1 text-2xl font-bold num">{(ltm(ms, 'cogs', month) / m.inv).toFixed(1)}x</div></Card>
        <Card><div className="text-xs text-muted">Ciclo de conversión de caja</div><div className="mt-1 text-2xl font-bold num">{r.ccc.toFixed(0)} d</div><div className="text-[11px] text-muted">DSO {m.dso.toFixed(0)} + DIO {m.dio.toFixed(0)} − DPO {m.dpo.toFixed(0)}</div></Card>
        <Card><div className="text-xs text-muted">OPEX / Ventas</div><div className="mt-1 text-2xl font-bold num">{pct(m.opex / m.revenue)}</div></Card>
        <Card><div className="text-xs text-muted">Productividad (ventas / $ OPEX)</div><div className="mt-1 text-2xl font-bold num">{(m.revenue / m.opex).toFixed(1)}x</div></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="OPEX por categoría" sub="Crecimiento anualizado desde el inicio del período" />
          <FinancialDataTable head={['Categoría', 'Tipo', 'Mes (M)', 'Crec. anualizado']} rows={growth.map((g) => ({ key: g.name, cells: [g.name, g.type, mm(g.value, 1), <VarianceIndicator key="v" value={g.growth} good={-1} />] }))} />
        </Card>
        <Card><CardHeader title="Margen bruto por categoría" />          <div className="space-y-2">{catM.map((c) => <div key={c.label}><div className="mb-1 flex justify-between text-xs"><span className="text-ink">{c.label}</span><b className="num">{pct(c.margen)}</b></div><div className="h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-violet" style={{ width: `${c.margen * 220}%` }} /></div></div>)}</div>
        </Card>
      </div>
      <p className="text-xs text-muted">Crecimiento mensual de ventas: {spct(m.revenue / ms[Math.max(0, month - 1)].revenue - 1)} · Fuente: motor DataArch (datos ficticios).</p>
    </div>
  )
}
void useMemo
