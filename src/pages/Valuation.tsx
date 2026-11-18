import { useStore } from '../lib/store'
import { useData } from '../lib/hooks'
import { params } from '../lib/analytics'
import { dcf, SCENARIO_LABEL, ScenarioKey } from '../lib/engine'
import { mm, money, pct } from '../lib/format'
import { Card, CardHeader, Disclaimer, FinancialDataTable, KPIStatCard, PageHeader, ScenarioSlider, cn } from '../components/ui'
import { StackedBars, WaterfallChart, TimeSeries } from '../components/charts'

export function ValuationSensitivityTable({ run, wacc, g }: { run: (w: number, g: number) => number; wacc: number; g: number }) {
  const ws = [-0.02, -0.01, 0, 0.01, 0.02].map((d) => wacc + d)
  const gs = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => g + d)
  const vals = ws.map((w) => gs.map((gg) => run(w, gg)))
  const flat = vals.flat(), mn = Math.min(...flat), mx = Math.max(...flat)
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-max text-sm">
        <thead><tr className="bg-sub"><th className="px-3 py-2 text-left text-xs text-muted">WACC \ g</th>{gs.map((gg) => <th key={gg} className="px-3 py-2 text-right text-xs font-semibold text-muted">{pct(gg, 1)}</th>)}</tr></thead>
        <tbody>{ws.map((w, i) => (
          <tr key={w} className="border-t border-line"><td className="px-3 py-2 text-xs font-semibold text-muted">{pct(w, 1)}</td>
            {vals[i].map((v, j) => { const base = i === 2 && j === 2; const a = (v - mn) / (mx - mn || 1); return <td key={j} className={cn('px-3 py-2 text-right num', base && 'font-bold ring-2 ring-inset ring-violet')} style={{ background: `rgba(124,92,252,${0.04 + a * 0.2})` }}>{money(v)}</td> })}
          </tr>))}</tbody>
      </table>
    </div>
  )
}

export default function Valuation() {
  const { wacc, tg, set, scenario, tax } = useStore()
  const { models, ms } = useData()
  const tr = params(tax).taxRate
  const d = dcf(ms, { wacc, g: tg }, tr)
  const sc = (['base', 'upside', 'downside'] as ScenarioKey[]).map((k) => ({ k, r: dcf(models.scen[k], { wacc, g: tg }, tr) }))
  const Y = d.years
  const row = (l: string, f: (y: typeof Y[0]) => number, bold?: boolean) => ({ key: l, bold, shade: bold, cells: [l, ...Y.map((y) => mm(f(y), 0))] })
  const pv12 = Y.slice(0, 2).reduce((s, y) => s + y.pv, 0), pv35 = Y.slice(2).reduce((s, y) => s + y.pv, 0)
  const bridge = [{ name: 'VP FCFF años 1-2', value: pv12 }, { name: 'VP FCFF años 3-5', value: pv35 }, { name: 'VP valor terminal', value: d.pvTv }, { name: 'Enterprise Value', value: d.ev, total: true }, { name: '(−) Deuda neta', value: -d.netDebt }, { name: 'Equity Value', value: d.equity, total: true }]
  // Primer paso del puente parte de 0: se muestra como acumulado
  return (
    <div className="space-y-6">
      <PageHeader title="Valuation — DCF" sub={`Valoración por flujos descontados sobre el escenario ${SCENARIO_LABEL[scenario]}. Fórmulas explícitas y auditables.`} badge="Simulado" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStatCard label="Enterprise Value" value={d.ev} delta={0} hint={`${(d.ev / (ms.slice(0, 12).reduce((s, m) => s + m.ebitda, 0))).toFixed(1)}x EBITDA LTM implícito`} />
        <KPIStatCard label="Deuda neta" value={d.netDebt} delta={0} good={-1} hint="Deuda financiera − caja (dic-26)" />
        <KPIStatCard label="Equity Value" value={d.equity} delta={0} />
        <KPIStatCard label="Valor terminal / EV" value={d.pvTv / d.ev} pct delta={0} hint="Peso del valor terminal" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Supuestos" />
          <div className="space-y-4">
            <ScenarioSlider label="WACC" value={wacc} min={0.1} max={0.25} step={0.0025} format={(v) => pct(v, 2)} base={0.15} onChange={(v) => set({ wacc: v })} />
            <ScenarioSlider label="Crecimiento terminal (g)" value={tg} min={0.01} max={0.06} step={0.0025} format={(v) => pct(v, 2)} base={0.035} onChange={(v) => set({ tg: v })} />
          </div>
          <div className="mt-4 rounded-xl bg-sub p-3 font-mono text-[11px] leading-relaxed text-muted">
            FCFF = EBIT·(1−t) + D&A − CAPEX − ΔNWC<br />
            VT = FCFF₅·(1+g) / (WACC − g)<br />
            EV = Σ FCFFₜ/(1+WACC)ᵗ + VT/(1+WACC)⁵<br />
            Equity = EV − (Deuda − Caja)
          </div>
          <p className="mt-2 text-[11px] text-muted">Años 1-2 vienen del modelo mensual; años 3-5 extrapolan márgenes y convergen a g. Intereses y deuda se excluyen del FCFF (sin doble conteo); el capital de trabajo entra solo como ΔNWC.</p>
        </Card>
        <Card className="lg:col-span-2" pad={false}>
          <div className="p-5 pb-2"><CardHeader title="Flujo de caja libre para la firma (FCFF)" sub="COP millones" /></div>
          <div className="px-3 pb-3"><FinancialDataTable head={['COP millones', ...Y.map((y) => y.label)]} rows={[
            row('Ingresos', (y) => y.revenue), row('EBITDA', (y) => y.ebitda), row('(−) D&A', (y) => -y.da), row('EBIT', (y) => y.ebit, true), row('(−) Impuestos', (y) => -y.taxes), row('NOPAT', (y) => y.nopat, true),
            row('(+) D&A', (y) => y.da), row('(−) CAPEX', (y) => -y.capex), row('(−) ΔNWC', (y) => -y.dNwc), row('FCFF', (y) => y.fcff, true), row('Valor presente', (y) => y.pv),
          ]} dense /></div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Evolución del FCFF" /><TimeSeries data={Y.map((y) => ({ label: y.label, fcff: y.fcff, pv: y.pv }))} series={[{ key: 'fcff', name: 'FCFF', color: '#7C5CFC' }, { key: 'pv', name: 'Valor presente', color: '#4F8CFF' }]} height={240} /></Card>
        <Card><CardHeader title="Enterprise Value Bridge" sub="Del valor presente de los flujos al valor del patrimonio" /><BridgeChart steps={bridge} /></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Sensibilidad: WACC vs crecimiento terminal" sub="Enterprise Value" /><ValuationSensitivityTable wacc={wacc} g={tg} run={(w, g) => dcf(ms, { wacc: w, g }, tr).ev} /></Card>
        <Card><CardHeader title="Base vs Upside vs Downside" />
          <StackedBars data={[{ label: 'Enterprise Value', ...Object.fromEntries(sc.map((s) => [s.k, s.r.ev])) }, { label: 'Equity Value', ...Object.fromEntries(sc.map((s) => [s.k, s.r.equity])) }]} keys={[{ key: 'base', name: 'Base', color: '#7C5CFC' }, { key: 'upside', name: 'Upside', color: '#10B981' }, { key: 'downside', name: 'Downside', color: '#EF4444' }]} height={230} />
        </Card>
      </div>
      <Disclaimer>Valoración ilustrativa con datos ficticios. No constituye asesoría de inversión.</Disclaimer>
    </div>
  )
}

function BridgeChart({ steps }: { steps: { name: string; value: number; total?: boolean }[] }) {
  // Acumulado: los tres primeros pasos suman hacia EV
  const s = steps.map((x, i) => (i < 3 ? { ...x } : x))
  return <WaterfallChart steps={s} height={240} />
}
