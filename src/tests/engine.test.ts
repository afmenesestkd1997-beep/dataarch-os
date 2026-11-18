import { describe, expect, it } from 'vitest'
import { HIST, SCENARIOS, PARAMS, runModel, checks, dcf } from '../lib/engine'
import { invoiceAdj } from '../lib/analytics'

const base = runModel(HIST, SCENARIOS.base)
describe('motor financiero', () => {
  it('EBITDA = utilidad bruta − OPEX', () => {
    for (const m of base) expect(m.ebitda).toBeCloseTo(m.gp - m.fixedOpex - m.varOpex, 3)
  })
  it('Balance: Activos = Pasivos + Patrimonio en los 36 meses', () => {
    for (const k of ['base', 'upside', 'downside'] as const) for (const m of runModel(HIST, SCENARIOS[k])) expect(Math.abs(checks(m).balanceDiff)).toBeLessThan(1)
  })
  it('Flujo de caja: caja final = inicial + flujo neto', () => {
    for (const m of base) expect(Math.abs(checks(m).cashDiff)).toBeLessThan(1)
  })
  it('Capital de trabajo = CxC + inventario − CxP − IVA', () => {
    for (const m of base) expect(m.nwc).toBeCloseTo(m.ar + m.inv - m.ap - m.ivaPay, 3)
  })
  it('FCFF = NOPAT + D&A − CAPEX − ΔNWC', () => {
    const d = dcf(base, { wacc: 0.15, g: 0.035 })
    for (const y of d.years) expect(y.fcff).toBeCloseTo(y.nopat + y.da - y.capex - y.dNwc, 3)
  })
  it('DCF: EV = VP flujos + VP valor terminal; Equity = EV − deuda neta', () => {
    const d = dcf(base, { wacc: 0.15, g: 0.035 })
    expect(d.ev).toBeCloseTo(d.pvFcff + d.pvTv, 3)
    expect(d.equity).toBeCloseTo(d.ev - d.netDebt, 3)
    expect(dcf(base, { wacc: 0.12, g: 0.035 }).ev).toBeGreaterThan(d.ev)
  })
  it('Registro de venta a crédito mantiene el balance y mueve ventas, CxC e inventario', () => {
    const net = 100e6, iva = net * 0.19
    const adj = invoiceAdj([{ id: 'x', date: '', customerId: 'C001', productId: 'SKU-11', qty: 1, unitPrice: net, credit: true, net, iva, total: net + iva, cost: 70e6 }])!
    const withSale = runModel(HIST, SCENARIOS.base, PARAMS, adj)
    expect(withSale[11].revenue - base[11].revenue).toBeCloseTo(net, 3)
    expect(withSale[11].ar - base[11].ar).toBeCloseTo(net + iva, 3)
    expect(base[11].inv - withSale[11].inv).toBeCloseTo(70e6, 3)
    for (const m of withSale) expect(Math.abs(checks(m).balanceDiff)).toBeLessThan(1)
  })
  it('Registro de venta de contado aumenta la caja', () => {
    const net = 100e6, iva = net * 0.19
    const adj = invoiceAdj([{ id: 'x', date: '', customerId: 'C001', productId: 'SKU-11', qty: 1, unitPrice: net, credit: false, net, iva, total: net + iva, cost: 70e6 }])!
    const w = runModel(HIST, SCENARIOS.base, PARAMS, adj)
    expect(w[11].cash).toBeGreaterThan(base[11].cash)
    for (const m of w) expect(Math.abs(checks(m).balanceDiff)).toBeLessThan(1)
  })
})
