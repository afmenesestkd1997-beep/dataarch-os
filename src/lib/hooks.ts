import { useMemo } from 'react'
import { useStore } from './store'
import { aging, buildAlerts, buildModels } from './analytics'
import { HIST_MONTHS } from './engine'

export function useData() {
  const { invoices, tax, custom, budget, scenario, minCash } = useStore()
  const models = useMemo(() => buildModels(invoices, tax, custom, budget), [invoices, tax, custom, budget])
  const ms = models.scen[scenario]
  const ag = useMemo(() => aging(models.actual[HIST_MONTHS - 1].ar - invoices.filter((i) => i.credit).reduce((s, i) => s + i.total, 0), invoices), [models, invoices])
  const alerts = useMemo(() => buildAlerts(ms, minCash, ag), [ms, minCash, ag])
  return { models, ms, ag, alerts, scenario }
}
