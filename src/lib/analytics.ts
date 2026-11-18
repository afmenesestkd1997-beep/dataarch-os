import { Adj, Drivers, HIST, HIST_MONTHS, Month, PARAMS, ScenarioKey, SCENARIOS, runModel, sum, ltm, dcf, FIXED_CATS } from './engine'
import { AVG_BASE_MARGIN, CUSTOMERS, PRODUCTS, SUPPLIERS } from './seed'
import { Invoice, TaxParams } from './store'
import { money, pct, days, x } from './format'

export const params = (tax: TaxParams) => ({ ...PARAMS, taxRate: tax.renta })

export function invoiceAdj(invs: Invoice[]): Adj | undefined {
  if (!invs.length) return undefined
  return invs.reduce((a, i) => ({ rev: a.rev + i.net, cogs: a.cogs + i.cost, iva: a.iva + i.iva, creditGross: a.creditGross + (i.credit ? i.total : 0) }), { rev: 0, cogs: 0, iva: 0, creditGross: 0 })
}

export interface Models {
  scen: Record<ScenarioKey, Month[]>
  budget: Month[]
  actual: Month[]
}
export function buildModels(inv: Invoice[], tax: TaxParams, custom: Drivers, budgetD: Drivers): Models {
  const p = params(tax)
  const adj = invoiceAdj(inv)
  const scen = {
    base: runModel(HIST, SCENARIOS.base, p, adj), upside: runModel(HIST, SCENARIOS.upside, p, adj),
    downside: runModel(HIST, SCENARIOS.downside, p, adj), custom: runModel(HIST, custom, p, adj),
  }
  const budget = runModel(budgetD, SCENARIOS.base, { ...p, smooth: true })
  return { scen, budget, actual: scen.base }
}

// ---------- KPIs y ratios ----------
export function kpis(ms: Month[], t: number) {
  const m = ms[t], p = ms[Math.max(0, t - 1)]
  const d = (k: keyof Month) => (p[k] as number) !== 0 ? ((m[k] as number) - (p[k] as number)) / Math.abs(p[k] as number) : 0
  return {
    m,
    items: [
      { key: 'revenue', label: 'Ingresos', value: m.revenue, delta: d('revenue'), good: 1, path: '/ventas', spark: ms.slice(0, t + 1).map((r) => r.revenue) },
      { key: 'gp', label: 'Utilidad bruta', value: m.gp, delta: d('gp'), good: 1, path: '/estados', spark: ms.slice(0, t + 1).map((r) => r.gp) },
      { key: 'ebitda', label: 'EBITDA', value: m.ebitda, delta: d('ebitda'), good: 1, path: '/actual-vs-budget', spark: ms.slice(0, t + 1).map((r) => r.ebitda) },
      { key: 'margin', label: 'Margen EBITDA', value: m.ebitda / m.revenue, delta: m.ebitda / m.revenue - p.ebitda / p.revenue, good: 1, pct: true, path: '/ratios', spark: ms.slice(0, t + 1).map((r) => r.ebitda / r.revenue) },
      { key: 'ni', label: 'Utilidad neta', value: m.ni, delta: d('ni'), good: 1, path: '/estados', spark: ms.slice(0, t + 1).map((r) => r.ni) },
      { key: 'cash', label: 'Saldo de caja', value: m.cash, delta: d('cash'), good: 1, path: '/tesoreria', spark: ms.slice(0, t + 1).map((r) => r.cash) },
      { key: 'ar', label: 'Cuentas por cobrar', value: m.ar, delta: d('ar'), good: -1, path: '/cxc', spark: ms.slice(0, t + 1).map((r) => r.ar) },
      { key: 'ap', label: 'Cuentas por pagar', value: m.ap, delta: d('ap'), good: 0, path: '/cxp', spark: ms.slice(0, t + 1).map((r) => r.ap) },
      { key: 'nwc', label: 'Capital de trabajo', value: m.nwc, delta: d('nwc'), good: -1, path: '/working-capital', spark: ms.slice(0, t + 1).map((r) => r.nwc) },
      { key: 'nd', label: 'Deuda neta', value: m.debt - m.cash, delta: (m.debt - m.cash) - (p.debt - p.cash), good: -1, abs: true, path: '/ratios', spark: ms.slice(0, t + 1).map((r) => r.debt - r.cash) },
      { key: 'fcf', label: 'Flujo de caja libre', value: m.fcf, delta: d('fcf'), good: 1, path: '/cash-flow-forecast', spark: ms.slice(0, t + 1).map((r) => r.fcf) },
    ],
  }
}

export function ratios(ms: Month[], t: number) {
  const m = ms[t]
  const e = ltm(ms, 'ebitda', t), ebit = ltm(ms, 'ebit', t), ni = ltm(ms, 'ni', t), int = ltm(ms, 'interest', t), rev = ltm(ms, 'revenue', t)
  const ca = m.cash + m.ar + m.inv
  const cl = m.ap + m.ivaPay + Math.min(m.debt, PARAMS.amort * 12)
  const assets = m.cash + m.ar + m.inv + m.fa
  return {
    current: ca / cl, quick: (m.cash + m.ar) / cl, cashRatio: m.cash / cl,
    debtEquity: m.debt / m.equity, netDebtEbitda: (m.debt - m.cash) / e, interestCov: ebit / int, debtAssets: (m.debt + m.ap) / assets,
    roe: ni / m.equity, roa: ni / assets, gm: m.gp / m.revenue, em: m.ebitda / m.revenue, nm: m.ni / m.revenue,
    ltmEbitda: e, ltmRev: rev, ccc: m.dso + m.dio - m.dpo, assetTurn: rev / assets,
  }
}

// ---------- Cartera (aging) ----------
export const BUCKETS = ['Al día', '1-30', '31-60', '61-90', '>90']
const RISK_SPLIT = [[0.82, 0.14, 0.04, 0, 0], [0.45, 0.25, 0.15, 0.1, 0.05], [0.2, 0.2, 0.2, 0.2, 0.2]]
export interface AgingRow { id: string; name: string; terms: number; risk: number; buckets: number[]; total: number; overdue: number }
export function aging(arBase: number, invs: Invoice[]): AgingRow[] {
  const adjW = CUSTOMERS.map((c) => c.weight * (1 + 0.6 * c.risk))
  const sw = adjW.reduce((a, b) => a + b, 0)
  return CUSTOMERS.map((c, i) => {
    const base = (arBase * adjW[i]) / sw
    const b = RISK_SPLIT[c.risk].map((s) => s * base)
    const extra = invs.filter((v) => v.credit && v.customerId === c.id).reduce((s, v) => s + v.total, 0)
    b[0] += extra
    const total = b.reduce((s, v) => s + v, 0)
    return { id: c.id, name: c.name, terms: c.terms, risk: c.risk, buckets: b, total, overdue: total - b[0] }
  })
}

// ---------- Tesorería 13 semanas ----------
export interface Week { w: number; label: string; opening: number; collections: number; suppliers: number; payroll: number; otherOpex: number; taxes: number; debt: number; capex: number; ending: number }
export function treasury13(ms: Month[]): Week[] {
  const weeks: Week[] = []
  let cash = ms[HIST_MONTHS - 1].cash
  const mi = (w: number) => HIST_MONTHS + Math.floor((w * 3) / 13)
  for (let w = 0; w < 13; w++) {
    const k = mi(w)
    const ws = Array.from({ length: 13 }, (_, i) => i).filter((i) => mi(i) === k)
    const n = ws.length, first = ws[0], last = ws[n - 1]
    const m = ms[k], prev = ms[k - 1]
    const payroll = 0.55 * m.fixedOpex
    const ivaPaid = prev.ivaPay - m.ivaPay
    const row = {
      collections: m.collections / n, suppliers: m.supplierPay / n, otherOpex: (m.opex - payroll) / n,
      payroll: w === first || w === last ? payroll / (n > 1 ? 2 : 1) : 0,
      taxes: w === last ? m.tax + ivaPaid : 0,
      debt: w === first ? m.interest + (prev.debt - m.debt) : 0, capex: m.capex / n,
    }
    const ending = cash + row.collections - row.suppliers - row.payroll - row.otherOpex - row.taxes - row.debt - row.capex
    weeks.push({ w, label: `S${w + 1}`, opening: cash, ...row, ending })
    cash = ending
  }
  return weeks
}

// ---------- Alertas verificables ----------
export interface Alert { id: string; severity: 'critical' | 'warning' | 'info'; title: string; detail: string; indicator: string; value: string; threshold: string; rule: string; path: string; action: string }
export function buildAlerts(ms: Month[], minCash: number, ag: AgingRow[]): Alert[] {
  const t = HIST_MONTHS - 1
  const out: Alert[] = []
  const m = ms[t]
  if (m.dso >= 50) out.push({ id: 'dso', severity: m.dso >= 55 ? 'critical' : 'warning', title: 'Incremento de cartera: DSO por encima del umbral', detail: `El DSO subió de ${days(ms[0].dso)} a ${days(m.dso)} en 12 meses; ${money(m.ar)} están inmovilizados en clientes.`, indicator: 'DSO (días de venta en cartera)', value: days(m.dso), threshold: '< 50 d', rule: 'DSO = CxC / Ventas × 30 ≥ 50', path: '/cxc', action: 'Ver cartera por cliente' })
  const overdue = ag.reduce((s, r) => s + r.overdue, 0) / ag.reduce((s, r) => s + r.total, 0)
  if (overdue > 0.3) out.push({ id: 'overdue', severity: 'warning', title: 'Cartera vencida elevada', detail: `${pct(overdue)} de la cartera supera su fecha de vencimiento (${money(overdue * m.ar)}).`, indicator: 'Cartera vencida / Cartera total', value: pct(overdue), threshold: '≤ 30%', rule: 'Saldo vencido ÷ saldo total CxC > 30%', path: '/cxc', action: 'Priorizar cobranza' })
  const gm0 = ms.slice(0, 3).reduce((s, r) => s + r.gp / r.revenue, 0) / 3, gm1 = ms.slice(t - 2, t + 1).reduce((s, r) => s + r.gp / r.revenue, 0) / 3
  if (gm0 - gm1 > 0.01) out.push({ id: 'gm', severity: 'warning', title: 'Deterioro del margen bruto', detail: `El margen bruto promedio de los últimos 3 meses (${pct(gm1)}) cae ${((gm0 - gm1) * 100).toFixed(1)} pp frente a los primeros 3 meses (${pct(gm0)}).`, indicator: 'Margen bruto (prom. 3m)', value: pct(gm1), threshold: `caída ≤ 1,0 pp (base ${pct(gm0)})`, rule: 'Δ margen bruto 3m vs. 3m inicial > 1 pp', path: '/actual-vs-budget', action: 'Analizar puente de EBITDA' })
  const fc = ms.slice(12)
  const lowest = fc.reduce((a, b) => (b.cash < a.cash ? b : a))
  if (lowest.cash < minCash) out.push({ id: 'cash', severity: lowest.cash < 0 ? 'critical' : 'critical', title: 'Riesgo de déficit de caja', detail: `La caja proyectada toca ${money(lowest.cash)} en ${lowest.label}, por debajo del mínimo configurado de ${money(minCash)}.`, indicator: 'Caja mínima proyectada', value: money(lowest.cash), threshold: `≥ ${money(minCash)}`, rule: 'min(caja fin de mes, 24m) < saldo mínimo', path: '/cash-flow-forecast', action: 'Abrir flujo de caja' })
  const top3 = CUSTOMERS.slice(0, 3).reduce((s, c) => s + c.weight, 0)
  if (top3 > 0.35) out.push({ id: 'conc', severity: 'info', title: 'Concentración de ventas', detail: `Los 3 principales clientes aportan ${pct(top3)} de las ventas (${CUSTOMERS[0].name} ${pct(CUSTOMERS[0].weight)}).`, indicator: 'Participación Top-3 clientes', value: pct(top3), threshold: '≤ 35%', rule: 'Σ ventas top-3 ÷ ventas totales > 35%', path: '/clientes', action: 'Ver ranking de clientes' })
  const o0 = ms.slice(0, 3).reduce((s, r) => s + r.opex, 0), o1 = ms.slice(t - 2, t + 1).reduce((s, r) => s + r.opex, 0)
  const r0 = ms.slice(0, 3).reduce((s, r) => s + r.revenue, 0), r1 = ms.slice(t - 2, t + 1).reduce((s, r) => s + r.revenue, 0)
  if (o1 / o0 > r1 / r0) out.push({ id: 'opex', severity: 'warning', title: 'Costos creciendo más rápido que las ventas', detail: `OPEX (3m) crece ${pct(o1 / o0 - 1)} vs. ventas ${pct(r1 / r0 - 1)}; el apalancamiento operativo se erosiona.`, indicator: 'Crec. OPEX vs. crec. ventas (3m vs 3m)', value: `${pct(o1 / o0 - 1)} vs ${pct(r1 / r0 - 1)}`, threshold: 'OPEX ≤ ventas', rule: 'Δ% OPEX > Δ% Ventas', path: '/budget', action: 'Revisar gastos por categoría' })
  const r = ratios(ms, t)
  if (r.netDebtEbitda > 3) out.push({ id: 'lev', severity: 'warning', title: 'Apalancamiento alto', detail: `Deuda neta / EBITDA LTM = ${x(r.netDebtEbitda)}.`, indicator: 'Deuda neta / EBITDA', value: x(r.netDebtEbitda), threshold: '≤ 3,0x', rule: '(Deuda − Caja) ÷ EBITDA LTM > 3', path: '/ratios', action: 'Ver razones financieras' })
  return out
}

// ---------- Gastos, clientes, productos ----------
export function opexBreakdown(ms: Month[], t: number) {
  const m = ms[t]
  const base = ms[0]
  const fixed = FIXED_CATS.map((c) => {
    const v = (m.fixedOpex * c.share * Math.pow(1 + c.gr, t)) / FIXED_CATS.reduce((s, k) => s + k.share * Math.pow(1 + k.gr, t), 0)
    const v0 = (base.fixedOpex * c.share) / FIXED_CATS.reduce((s, k) => s + k.share, 0)
    return { name: c.key, type: c.type, value: v, growth: v0 ? Math.pow(v / v0, 12 / Math.max(1, t)) - 1 : 0 }
  })
  const vr = m.varOpex
  return [...fixed, { name: 'Comisiones de venta', type: 'Comercial', value: vr * 0.5, growth: ms[t].revenue / ms[0].revenue - 1 }, { name: 'Logística y fletes', type: 'Comercial', value: vr * 0.5, growth: ms[t].revenue / ms[0].revenue - 1 }]
}

export function customerStats(ms: Month[], t: number, ag: AgingRow[]) {
  const l = ltm(ms, 'revenue', t)
  return CUSTOMERS.map((c, i) => ({ ...c, sales: l * c.weight, ar: ag[i].total, overdue: ag[i].overdue, invoices: Math.round(14 * c.weight * 30 + 4), ticket: (l * c.weight) / (Math.round(14 * c.weight * 30 + 4) * 1) }))
}
export function productStats(ms: Month[], t: number) {
  const m = ms[t]
  const gm = m.gp / m.revenue
  return PRODUCTS.map((p) => {
    const margin = gm + (p.unitMargin - AVG_BASE_MARGIN)
    const sales = m.revenue * p.weight
    return { ...p, sales, margin, gp: sales * margin, units: sales / p.price }
  })
}
export function supplierStats(ms: Month[], t: number) {
  const m = ms[t]
  return SUPPLIERS.map((s) => ({ ...s, purchases: m.purchases * s.weight, ap: m.ap * s.weight, overdue: s.id === 'P004' || s.id === 'P011' ? m.ap * s.weight * 0.18 : 0 }))
}

// ---------- Waterfall de EBITDA: presupuesto → real ----------
export function ebitdaBridge(actual: Month[], budget: Month[], from = 0, to = HIST_MONTHS - 1) {
  const A = actual.slice(from, to + 1), B = budget.slice(from, to + 1)
  const rA = sum(A, 'revenue'), rB = sum(B, 'revenue')
  const gmA = sum(A, 'gp') / rA, gmB = sum(B, 'gp') / rB
  const steps = [
    { name: 'EBITDA Budget', value: sum(B, 'ebitda'), total: true },
    { name: 'Volumen de ventas', value: (rA - rB) * gmB },
    { name: 'Margen bruto', value: rA * (gmA - gmB) },
    { name: 'OPEX fijo', value: -(sum(A, 'fixedOpex') - sum(B, 'fixedOpex')) },
    { name: 'OPEX variable', value: -(sum(A, 'varOpex') - sum(B, 'varOpex')) },
    { name: 'EBITDA Real', value: sum(A, 'ebitda'), total: true },
  ]
  return steps
}

export function simCompare(base: Month[], sim: Month[], tax = PARAMS.taxRate, w = 0.15, g = 0.035) {
  const f = (ms: Month[]) => {
    const y = ms.slice(12, 24)
    const d = dcf(ms, { wacc: w, g }, tax)
    return { revenue: sum(y, 'revenue'), ebitda: sum(y, 'ebitda'), margin: sum(y, 'ebitda') / sum(y, 'revenue'), ni: sum(y, 'ni'), nwc: y[11].nwc, fcf: sum(y, 'fcf'), cash: y[11].cash, ev: d.ev }
  }
  return { base: f(base), sim: f(sim) }
}

// ---------- Inventario por SKU (cobertura distinta por producto, total = balance) ----------
export function inventoryRows(ms: Month[], t: number, invs: Invoice[]) {
  const m = ms[t]
  const prod = productStats(ms, t)
  const isLast = t === HIST_MONTHS - 1
  const cogsShare = prod.map((p) => p.weight * (1 - p.margin))
  const cs = cogsShare.reduce((a, b) => a + b, 0)
  const mult = prod.map((_, i) => 0.5 + ((i * 7) % 11) / 10)
  const w = cogsShare.map((c, i) => (c / cs) * mult[i])
  const sw = w.reduce((a, b) => a + b, 0)
  const total = m.inv + (isLast ? invs.reduce((s, i) => s + i.cost, 0) : 0)
  return prod.map((p, i) => {
    const cost = p.price * (1 - p.margin)
    const sold = isLast ? invs.filter((v) => v.productId === p.id).reduce((s, v) => s + v.cost, 0) : 0
    const value = (total * w[i]) / sw - sold
    const cogsDay = (m.cogs * cogsShare[i]) / cs / 30
    return { ...p, cost, value, units: value / cost, cover: value / cogsDay }
  })
}
