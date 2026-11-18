import { describe, expect, it } from 'vitest'
import { ALL_INTENT_QUESTIONS, answerQuestion, matchIntent } from '../lib/assistant'
import { aging, buildAlerts, buildModels, invoiceAdj } from '../lib/analytics'
import { BUDGET_DRIVERS } from '../lib/store'
import { SCENARIOS } from '../lib/engine'

const tax = { iva: 0.19, renta: 0.35, reteFuente: 0.025, reteIca: 0.0096 }
const models = buildModels([], tax, SCENARIOS.base, BUDGET_DRIVERS)
const ms = models.scen.base
const ag = aging(ms[11].ar, [])
const ctx = { ms, models, ag, alerts: buildAlerts(ms, 450e6, ag), month: 11, tax, wacc: 0.15, tg: 0.035, minCash: 450e6, invoices: [] }
void invoiceAdj

describe('asistente', () => {
  it('cada pregunta de ejemplo se reconoce con su intención', () => {
    const bad = ALL_INTENT_QUESTIONS.filter((x) => matchIntent(x.q) !== x.id).map((x) => `${x.id}: ${x.q} -> ${matchIntent(x.q)}`)
    expect(bad).toEqual([])
  })
  it('variaciones coloquiales', () => {
    const cases: [string, string][] = [['oye quien me debe plata', 'debtors'], ['voy a poder pagar la nomina', 'payroll'], ['estoy ganando plata o no', 'profit_or_loss'], ['cuanto vendo para no quedar en rojo, el equilibrio', 'breakeven'], ['si pido un credito de 800 millones', 'loan'], ['y si los clientes pagan 20 dias mas tarde', 'dso_shock']]
    for (const [q, id] of cases) expect(matchIntent(q), q).toBe(id)
  })
  it('todas las respuestas son finitas y completas', () => {
    for (const { q } of ALL_INTENT_QUESTIONS) {
      const a = answerQuestion(q, ctx)
      const txt = JSON.stringify(a)
      expect(txt, q).not.toMatch(/NaN|Infinity|undefined/)
      expect(a.evidence.length, q).toBeGreaterThan(0)
    }
  })
  it('extrae números de la pregunta', () => {
    expect(answerQuestion('que pasa si le vendo 30 millones mas al mes', ctx).finding).toContain('30')
  })
})
