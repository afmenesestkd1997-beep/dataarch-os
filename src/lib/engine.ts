// Motor financiero determinístico de DataArch OS. Todas las cifras en COP.
export const HIST_MONTHS = 12
export const TOTAL_MONTHS = 36
export const START = { y: 2026, m: 0 } // Ene-2026 (m es 0-index)

export interface Drivers {
  growth: number      // crecimiento anual de ventas
  gm: number          // margen bruto
  gmDrift: number     // deriva mensual del margen (solo histórico)
  fixedOpex: number   // OPEX fijo mensual (nivel inicial)
  varOpex: number     // OPEX variable % ventas
  dso: number; dsoDrift: number; dpo: number; dio: number
  capex: number       // CAPEX mensual
  interest: number    // tasa anual deuda
  revMult: number     // multiplicador de ventas proyectadas
}
export interface Params { smooth?: boolean; taxRate: number; daRate: number; amort: number; openCash: number; openDebt: number; openFA: number; rev0: number }
export interface Adj { rev: number; cogs: number; iva: number; creditGross: number }
export interface Month {
  t: number; label: string; short: string; year: number; isActual: boolean
  revenue: number; cogs: number; gp: number; fixedOpex: number; varOpex: number; opex: number
  ebitda: number; da: number; ebit: number; interest: number; ebt: number; tax: number; ni: number
  ar: number; inv: number; ap: number; ivaPay: number; cash: number; fa: number; debt: number; equity: number
  cfo: number; cfi: number; cff: number; netCf: number; capex: number; openCash: number
  nwc: number; fcf: number; dso: number; dio: number; dpo: number
  collections: number; supplierPay: number; purchases: number
}

export const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const SEASON = [0.93, 0.92, 0.99, 1.0, 1.02, 1.0, 1.03, 1.01, 1.0, 1.04, 1.07, 1.12]
// Categorías de OPEX fijo: participación y crecimiento mensual histórico
export const FIXED_CATS = [
  { key: 'Nómina administrativa', type: 'Administrativo', share: 0.27, gr: 0.004 },
  { key: 'Nómina comercial', type: 'Comercial', share: 0.22, gr: 0.006 },
  { key: 'Arriendos y servicios', type: 'Administrativo', share: 0.17, gr: 0.002 },
  { key: 'Marketing y publicidad', type: 'Comercial', share: 0.14, gr: 0.021 },
  { key: 'Tecnología y software', type: 'Administrativo', share: 0.09, gr: 0.014 },
  { key: 'Honorarios y otros', type: 'Administrativo', share: 0.11, gr: 0.003 },
]
export const FC_OPEX_INFLATION = 0.004

export const HIST: Drivers = {
  growth: 0.155, gm: 0.318, gmDrift: -0.0017, fixedOpex: 262e6, varOpex: 0.062,
  dso: 43, dsoDrift: 0.75, dpo: 38, dio: 50, capex: 22e6, interest: 0.145, revMult: 1,
}
export const PARAMS: Params = { taxRate: 0.35, daRate: 0.10, amort: 32e6, openCash: 1150e6, openDebt: 2300e6, openFA: 1450e6, rev0: 1560e6 }

export type ScenarioKey = 'base' | 'upside' | 'downside' | 'custom'
export const SCENARIOS: Record<Exclude<ScenarioKey, 'custom'>, Drivers> = {
  base: { ...HIST, growth: 0.10, gm: 0.305, gmDrift: 0, fixedOpex: 330e6, varOpex: 0.062, dso: 50, dsoDrift: 0, dpo: 40, dio: 49, capex: 28e6, interest: 0.145 },
  upside: { ...HIST, growth: 0.18, gm: 0.318, gmDrift: 0, fixedOpex: 335e6, varOpex: 0.060, dso: 45, dsoDrift: 0, dpo: 42, dio: 45, capex: 35e6, interest: 0.135 },
  downside: { ...HIST, growth: 0.03, gm: 0.295, gmDrift: 0, fixedOpex: 325e6, varOpex: 0.064, dso: 55, dsoDrift: 0, dpo: 37, dio: 53, capex: 20e6, interest: 0.16 },
}
export const SCENARIO_LABEL: Record<ScenarioKey, string> = { base: 'Base Case', upside: 'Upside Case', downside: 'Downside Case', custom: 'Custom Scenario' }

export function monthDate(t: number) {
  const idx = START.m + t
  return { year: START.y + Math.floor(idx / 12), month: idx % 12 }
}
const mr = (a: number) => Math.pow(1 + a, 1 / 12) - 1

export function fixedHist(t: number, base: number) {
  return FIXED_CATS.reduce((s, c) => s + base * c.share * Math.pow(1 + c.gr, t), 0)
}

function revenueAt(t: number, hist: Drivers, fc: Drivers, p: Params) {
  const { month } = monthDate(t)
  const mh = mr(hist.growth), mf = mr(fc.growth)
  const wig = t < HIST_MONTHS && !p.smooth ? 1 + 0.022 * Math.sin(t * 2.3 + 1) : 1
  const trend = t < HIST_MONTHS
    ? p.rev0 * Math.pow(1 + mh, t)
    : p.rev0 * Math.pow(1 + mh, HIST_MONTHS - 1) * Math.pow(1 + mf, t - HIST_MONTHS + 1) * fc.revMult
  return trend * SEASON[month] * wig
}

export function runModel(hist: Drivers, fc: Drivers, p: Params = PARAMS, adj?: Adj): Month[] {
  const out: Month[] = []
  // Saldos de apertura (t = -1)
  const rev_1 = p.rev0 / (1 + mr(hist.growth)) * SEASON[(START.m + 11) % 12]
  const cogs_1 = rev_1 * (1 - (hist.gm - hist.gmDrift))
  let ar = rev_1 * (hist.dso - hist.dsoDrift) / 30
  let inv = cogs_1 * hist.dio / 30
  let ap = cogs_1 * hist.dpo / 30
  let ivaPay = 0
  let cash = p.openCash, fa = p.openFA, debt = p.openDebt
  let equity = cash + ar + inv + fa - ap - debt
  let dso = hist.dso - hist.dsoDrift, dio = hist.dio, dpo = hist.dpo
  for (let t = 0; t < TOTAL_MONTHS; t++) {
    const isA = t < HIST_MONTHS
    const d = isA ? hist : fc
    const { year, month } = monthDate(t)
    let revenue = revenueAt(t, hist, fc, p)
    const gm = isA ? hist.gm + hist.gmDrift * t : fc.gm
    let cogs = revenue * (1 - gm)
    const fixedOpex = isA ? fixedHist(t, hist.fixedOpex) : fc.fixedOpex * Math.pow(1 + FC_OPEX_INFLATION, t - HIST_MONTHS)
    const varOpex = revenue * d.varOpex
    const a = adj && t === HIST_MONTHS - 1 ? adj : undefined
    if (a) { revenue += a.rev; cogs += a.cogs }
    const vo = varOpex + (a ? a.rev * d.varOpex : 0)
    // Días de capital de trabajo (rampa hacia el objetivo en proyección)
    if (isA) { dso = hist.dso + hist.dsoDrift * t; dio = hist.dio; dpo = hist.dpo }
    else { dso += (fc.dso - dso) * 0.25; dio += (fc.dio - dio) * 0.25; dpo += (fc.dpo - dpo) * 0.25 }
    const baseRev = revenue - (a?.rev ?? 0), baseCogs = cogs - (a?.cogs ?? 0)
    const gp = revenue - cogs
    const ebitda = gp - fixedOpex - vo
    const da = fa * p.daRate / 12
    const ebit = ebitda - da
    const interest = debt * d.interest / 12
    const ebt = ebit - interest
    const tax = Math.max(0, ebt) * p.taxRate
    const ni = ebt - tax
    const nAr = baseRev * dso / 30 + (a?.creditGross ?? 0)
    const nInv = baseCogs * dio / 30 - (a?.cogs ?? 0)
    const nAp = baseCogs * dpo / 30
    const nIva = a?.iva ?? 0
    const capex = d.capex
    const amort = Math.min(p.amort, debt)
    const cfo = ni + da - (nAr - ar) - (nInv - inv) + (nAp - ap) + (nIva - ivaPay)
    const cfi = -capex
    const cff = -amort
    const netCf = cfo + cfi + cff
    const openCash = cash
    cash += netCf
    fa = fa + capex - da
    debt -= amort
    equity += ni
    const collections = revenue - (nAr - ar)
    const purchases = cogs + (nInv - inv)
    const supplierPay = purchases - (nAp - ap)
    ar = nAr; inv = nInv; ap = nAp; ivaPay = nIva
    const nwc = ar + inv - ap - ivaPay
    out.push({
      t, label: `${MONTH_NAMES[month]} ${String(year).slice(2)}`, short: MONTH_NAMES[month], year, isActual: isA,
      revenue, cogs, gp, fixedOpex, varOpex: vo, opex: fixedOpex + vo, ebitda, da, ebit, interest, ebt, tax, ni,
      ar, inv, ap, ivaPay, cash, fa, debt, equity, cfo, cfi, cff, netCf, capex, openCash,
      nwc, fcf: cfo + cfi, dso, dio, dpo, collections, supplierPay, purchases,
    })
  }
  return out
}

export const sum = (ms: Month[], k: keyof Month) => ms.reduce((s, m) => s + (m[k] as number), 0)
export const ltm = (ms: Month[], k: keyof Month, t = HIST_MONTHS - 1) => sum(ms.slice(Math.max(0, t - 11), t + 1), k)

export function checks(m: Month) {
  const assets = m.cash + m.ar + m.inv + m.fa
  const le = m.ap + m.ivaPay + m.debt + m.equity
  return { assets, le, balanceDiff: assets - le, cashDiff: m.openCash + m.netCf - m.cash }
}

// ---- Valoración DCF ----
export interface DCFInput { wacc: number; g: number }
export interface DCFYear { label: string; revenue: number; ebitda: number; ebit: number; taxes: number; nopat: number; da: number; capex: number; dNwc: number; fcff: number; df: number; pv: number }
export interface DCFResult {
  years: DCFYear[]
  pvFcff: number; tv: number; pvTv: number; ev: number; netDebt: number; equity: number; wacc: number; g: number
}
export function dcf(ms: Month[], { wacc, g }: DCFInput, taxRate = PARAMS.taxRate): DCFResult {
  const y1 = ms.slice(12, 24), y2 = ms.slice(24, 36)
  const nwc0 = ms[11].nwc
  const base = [y1, y2].map((y) => ({
    revenue: sum(y, 'revenue'), ebitda: sum(y, 'ebitda'), da: sum(y, 'da'), capex: sum(y, 'capex'), nwcEnd: y[11].nwc,
  }))
  const rows: { revenue: number; ebitda: number; da: number; capex: number; nwcEnd: number }[] = [...base]
  const last = base[1]
  const gy2 = base[1].revenue / base[0].revenue - 1
  let rev = last.revenue
  for (let i = 0; i < 3; i++) {
    const gi = gy2 + (g - gy2) * ((i + 1) / 3)
    rev *= 1 + gi
    const k = rev / last.revenue
    rows.push({ revenue: rev, ebitda: last.ebitda * k, da: last.da * k, capex: last.capex * k, nwcEnd: last.nwcEnd * k })
  }
  let prevN = nwc0
  let pvF = 0
  const years: DCFYear[] = rows.map((r, i) => {
    const ebit = r.ebitda - r.da
    const taxes = Math.max(0, ebit) * taxRate
    const nopat = ebit - taxes
    const dNwc = r.nwcEnd - prevN
    prevN = r.nwcEnd
    const fcff = nopat + r.da - r.capex - dNwc
    const df = 1 / Math.pow(1 + wacc, i + 1)
    pvF += fcff * df
    return { label: `Año ${i + 1}`, revenue: r.revenue, ebitda: r.ebitda, ebit, taxes, nopat, da: r.da, capex: r.capex, dNwc, fcff, df, pv: fcff * df }
  })
  const lastF = years[4].fcff
  const tv = (lastF * (1 + g)) / (wacc - g)
  const pvTv = tv * years[4].df
  const ev = pvF + pvTv
  const netDebt = ms[11].debt - ms[11].cash
  return { years, pvFcff: pvF, tv, pvTv, ev, netDebt, equity: ev - netDebt, wacc, g }
}
