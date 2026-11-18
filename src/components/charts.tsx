import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { money, pct } from '../lib/format'

export const COLORS = ['#7C5CFC', '#4F8CFF', '#10B981', '#F59E0B', '#EF4444', '#94A3B8', '#EC4899']

export interface Series { key: string; name: string; type?: 'bar' | 'line' | 'area'; color?: string; axis?: 'l' | 'r'; dashed?: boolean; stack?: string }

const TT = ({ active, payload, label, asPct }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; asPct?: string[] }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-ink">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-muted"><i className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <b className="text-ink num">{asPct?.includes(p.dataKey) ? pct(p.value) : money(p.value)}</b>
        </div>
      ))}
    </div>
  )
}
const axisFmt = (v: number) => (Math.abs(v) >= 1e9 ? `${(v / 1e9).toFixed(1)}MM` : Math.abs(v) >= 1e6 ? `${Math.round(v / 1e6)}M` : String(v))
const pFmt = (v: number) => `${(v * 100).toFixed(0)}%`

export function TimeSeries({ data, series, height = 280, forecastFrom, pctKeys, refLine, rightPct }: { data: Record<string, number | string>[]; series: Series[]; height?: number; forecastFrom?: string; pctKeys?: string[]; refLine?: { y: number; label: string }; rightPct?: boolean }) {
  const hasR = series.some((s) => s.axis === 'r')
  const last = data[data.length - 1]?.label as string
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} />
        <YAxis yAxisId="l" tickLine={false} axisLine={false} tickFormatter={pctKeys && series.every((s) => pctKeys.includes(s.key)) ? pFmt : axisFmt} width={48} />
        {hasR && <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} tickFormatter={rightPct ? pFmt : axisFmt} width={44} />}
        <Tooltip content={<TT asPct={pctKeys} />} cursor={{ fill: 'rgba(124,92,252,.06)' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {forecastFrom && <ReferenceArea yAxisId="l" x1={forecastFrom} x2={last} fill="#7C5CFC" fillOpacity={0.06} label={{ value: 'Proyección', fontSize: 10, fill: '#7C5CFC', position: 'insideTopRight' }} />}
        {refLine && <ReferenceLine yAxisId="l" y={refLine.y} stroke="#EF4444" strokeDasharray="4 4" label={{ value: refLine.label, fontSize: 10, fill: '#EF4444', position: 'insideBottomLeft' }} />}
        {series.map((s, i) => {
          const color = s.color ?? COLORS[i % COLORS.length]
          const yAxisId = s.axis ?? 'l'
          if (s.type === 'line') return <Line key={s.key} yAxisId={yAxisId} type="monotone" dataKey={s.key} name={s.name} stroke={color} strokeWidth={2.5} dot={false} strokeDasharray={s.dashed ? '5 4' : undefined} />
          if (s.type === 'area') return <Area key={s.key} yAxisId={yAxisId} type="monotone" dataKey={s.key} name={s.name} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2.5} stackId={s.stack} />
          return <Bar key={s.key} yAxisId={yAxisId} dataKey={s.key} name={s.name} fill={color} radius={[5, 5, 0, 0]} stackId={s.stack} maxBarSize={30} />
        })}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function WaterfallChart({ steps, height = 280 }: { steps: { name: string; value: number; total?: boolean }[]; height?: number }) {
  let run = 0
  const data = steps.map((s) => {
    if (s.total) { run = s.value; return { name: s.name, base: 0, up: s.value, down: 0, total: true, raw: s.value } }
    const start = run
    run += s.value
    return { name: s.name, base: Math.min(start, run), up: s.value >= 0 ? s.value : 0, down: s.value < 0 ? -s.value : 0, total: false, raw: s.value }
  })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={axisFmt} width={48} />
        <Tooltip cursor={{ fill: 'rgba(124,92,252,.06)' }} content={({ active, payload }) => active && payload?.length ? (
          <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-xl"><div className="font-semibold text-ink">{payload[0].payload.name}</div><b className="num text-ink">{money(payload[0].payload.raw)}</b></div>
        ) : null} />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="up" stackId="a" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.total ? '#14213D' : '#10B981'} />)}
        </Bar>
        <Bar dataKey="down" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex items-center gap-4">
      <div style={{ width: height, height }} className="shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.length ? (
              <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-xl"><b className="text-ink">{payload[0].name}</b><div className="num text-muted">{money(payload[0].value as number)} · {pct((payload[0].value as number) / total)}</div></div>
            ) : null} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-muted"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="truncate">{d.name}</span></span>
            <b className="num text-ink">{pct(d.value / total)}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HBar({ data, height = 260, color = '#7C5CFC' }: { data: { name: string; value: number }[]; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={axisFmt} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={150} tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ fill: 'rgba(124,92,252,.06)' }} content={<TT />} />
        <Bar dataKey="value" name="Valor" fill={color} radius={[0, 5, 5, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function StackedBars({ data, keys, height = 260 }: { data: Record<string, number | string>[]; keys: { key: string; name: string; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={axisFmt} width={48} />
        <Tooltip content={<TT />} cursor={{ fill: 'rgba(124,92,252,.06)' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => <Bar key={k.key} dataKey={k.key} name={k.name} stackId="s" fill={k.color} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}
