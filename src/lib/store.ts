import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Drivers, HIST, ScenarioKey, SCENARIOS } from './engine'

export interface Invoice {
  id: string; date: string; customerId: string; productId: string; qty: number; unitPrice: number
  credit: boolean; net: number; iva: number; total: number; cost: number
}
export interface TaxParams { iva: number; renta: number; reteFuente: number; reteIca: number }
export const BUDGET_DRIVERS: Drivers = { ...HIST, growth: 0.17, gm: 0.322, gmDrift: 0, fixedOpex: 254e6, varOpex: 0.060, dso: 42, dsoDrift: 0, dpo: 40, dio: 48, capex: 24e6, interest: 0.14 }

interface State {
  theme: 'light' | 'dark'
  collapsed: boolean
  month: number
  scenario: ScenarioKey
  minCash: number
  wacc: number
  tg: number
  custom: Drivers
  sim: Drivers
  budget: Drivers
  tax: TaxParams
  invoices: Invoice[]
  invoiceOpen: boolean
  tourStep: number | null
  paid: Record<string, boolean>
  dueDates: Record<string, string>
  integrations: Record<string, boolean>
  set: (p: Partial<State>) => void
  addInvoice: (i: Invoice) => void
  reset: () => void
}

const initial: Omit<State, 'set' | 'addInvoice' | 'reset'> = {
  theme: 'light', collapsed: false, month: 11, scenario: 'base', minCash: 450e6, wacc: 0.15, tg: 0.035,
  custom: { ...SCENARIOS.base, growth: 0.12, gm: 0.31 }, sim: { ...SCENARIOS.base }, budget: { ...BUDGET_DRIVERS },
  tax: { iva: 0.19, renta: 0.35, reteFuente: 0.025, reteIca: 0.0096 }, invoices: [], invoiceOpen: false,
  tourStep: null, paid: {}, dueDates: {}, integrations: { 'Excel / CSV': true },
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...initial,
      set: (p) => set(p),
      addInvoice: (i) => set((s) => ({ invoices: [i, ...s.invoices] })),
      reset: () => set((s) => ({ ...initial, theme: s.theme })),
    }),
    {
      name: 'dataarch-os-v2',
      partialize: (s) => ({
        theme: s.theme, collapsed: s.collapsed, minCash: s.minCash, wacc: s.wacc, tg: s.tg, custom: s.custom, budget: s.budget,
        tax: s.tax, invoices: s.invoices, paid: s.paid, dueDates: s.dueDates, integrations: s.integrations, scenario: s.scenario,
      }),
    },
  ),
)
