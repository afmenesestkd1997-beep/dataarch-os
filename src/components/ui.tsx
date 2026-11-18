import { ReactNode, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Inbox, Info, Minus, OctagonAlert, Sparkles, X, ArrowRight } from 'lucide-react'
import { Alert } from '../lib/analytics'
import { money, pct, spct } from '../lib/format'

export const cn = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ')

export function Card({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={cn('rounded-2xl border border-line bg-card shadow-card', pad && 'p-5', className)}>{children}</div>
}
export function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  )
}
export function PageHeader({ title, sub, right, badge }: { title: string; sub?: string; right?: ReactNode; badge?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 fade-up">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {badge && <Badge tone="violet">{badge}</Badge>}
        </div>
        {sub && <p className="mt-1 max-w-3xl text-sm text-muted">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}
type Tone = 'violet' | 'green' | 'red' | 'amber' | 'blue' | 'gray'
const tones: Record<Tone, string> = {
  violet: 'bg-violet/10 text-violet', green: 'bg-fin/10 text-fin', red: 'bg-danger/10 text-danger',
  amber: 'bg-warn/15 text-amber-600 dark:text-amber-400', blue: 'bg-electric/10 text-electric', gray: 'bg-line text-muted',
}
export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: Tone }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>{children}</span>
}
export function Btn({ children, onClick, variant = 'primary', className, disabled, type = 'button', title }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'outline' | 'dark'; className?: string; disabled?: boolean; type?: 'button' | 'submit'; title?: string }) {
  const v = {
    primary: 'bg-violet text-white hover:bg-[#6a4be8] shadow-sm', ghost: 'text-muted hover:bg-line/60 hover:text-ink',
    outline: 'border border-line bg-card text-ink hover:bg-sub', dark: 'bg-navy text-white hover:bg-deep',
  }[variant]
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={cn('inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50', v, className)}>
      {children}
    </button>
  )
}
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-sub p-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition', value === t.id ? 'bg-card text-violet shadow-sm' : 'text-muted hover:text-ink')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative max-h-[90vh] w-full overflow-auto rounded-2xl border border-line bg-card p-6 shadow-2xl fade-up', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-line"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-navy/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-auto border-l border-line bg-card p-6 shadow-2xl fade-up">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-line"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function VarianceIndicator({ value, good = 1, pctMode = true, abs }: { value: number; good?: 1 | -1 | 0; pctMode?: boolean; abs?: boolean }) {
  const flat = Math.abs(value) < 0.0005
  const positive = value > 0
  const fav = good === 0 ? null : (positive ? good === 1 : good === -1)
  const color = flat || fav === null ? 'text-muted' : fav ? 'text-fin' : 'text-danger'
  const Icon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold num', color)}>
      <Icon size={13} />
      {abs ? money(Math.abs(value)) : pctMode ? spct(value) : value.toFixed(1)}
    </span>
  )
}

export function Sparkline({ data, color = '#7C5CFC' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const w = 96, h = 30
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - mn) / r) * (h - 6)}`).join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function KPIStatCard({ label, value, delta, good = 1, pct: isPct, abs, spark, to, hint }: { label: string; value: number; delta: number; good?: number; pct?: boolean; abs?: boolean; spark?: number[]; to?: string; hint?: string }) {
  const body = (
    <div className="group h-full rounded-2xl border border-line bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-violet/40">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {to && <ArrowRight size={14} className="text-muted opacity-0 transition group-hover:opacity-100" />}
      </div>
      <div className="mt-1.5 text-[22px] font-bold leading-tight tracking-tight text-ink num">{isPct ? pct(value) : money(value)}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="flex items-center gap-1.5">
          <VarianceIndicator value={delta} good={good as 1 | -1 | 0} abs={abs} pctMode={!isPct} />
          <span className="text-[11px] text-muted">{isPct ? 'pp vs mes ant.' : 'vs mes ant.'}</span>
        </div>
        {spark && <Sparkline data={spark.slice(-12)} />}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

const sev = {
  critical: { icon: OctagonAlert, cls: 'border-danger/30 bg-danger/5', ic: 'text-danger', badge: 'red' as Tone, label: 'Crítica' },
  warning: { icon: AlertTriangle, cls: 'border-warn/30 bg-warn/5', ic: 'text-warn', badge: 'amber' as Tone, label: 'Atención' },
  info: { icon: Info, cls: 'border-electric/30 bg-electric/5', ic: 'text-electric', badge: 'blue' as Tone, label: 'Info' },
}
export function FinancialAlert({ a, compact }: { a: Alert; compact?: boolean }) {
  const s = sev[a.severity]
  const Icon = s.icon
  return (
    <div className={cn('rounded-xl border p-4', s.cls)}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={cn('mt-0.5 shrink-0', s.ic)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{a.title}</span>
            <Badge tone={s.badge}>{s.label}</Badge>
          </div>
          {!compact && <p className="mt-1 text-sm text-muted">{a.detail}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-muted">{a.indicator}: <b className="text-ink num">{a.value}</b> <span className="text-muted">(umbral {a.threshold})</span></span>
            {!compact && <span className="font-mono text-[11px] text-muted">regla: {a.rule}</span>}
          </div>
          <Link to={a.path} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet hover:underline">{a.action} <ArrowRight size={12} /></Link>
        </div>
      </div>
    </div>
  )
}

export function AIInsightCard({ a, rank }: { a: Alert; rank: number }) {
  return (
    <Link to={a.path} className="block rounded-xl border border-line bg-sub p-4 transition hover:border-violet/50">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet">
        <Sparkles size={13} /> Insight {rank}
      </div>
      <div className="mt-1 text-sm font-semibold text-ink">{a.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{a.detail}</p>
      <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-[11px] text-muted">
        {a.indicator}: <b className="text-ink num">{a.value}</b>
      </div>
    </Link>
  )
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-violet/10 p-3 text-violet"><Inbox size={22} /></div>
      <div className="font-semibold text-ink">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function ErrorState({ title = 'No pudimos cargar esta vista', text, onRetry }: { title?: string; text: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <OctagonAlert className="mb-2 text-danger" />
      <div className="font-semibold text-ink">{title}</div>
      <p className="mt-1 text-sm text-muted">{text}</p>
      {onRetry && <Btn className="mt-4" variant="outline" onClick={onRetry}>Reintentar</Btn>}
    </div>
  )
}
export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-5 rounded-lg" style={{ width: `${95 - i * 12}%` }} />)}
    </div>
  )
}

export function ScenarioSlider({ label, value, min, max, step, onChange, format, base, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; base?: number; hint?: string }) {
  const changed = base !== undefined && Math.abs(base - value) > step / 2
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold text-ink">{label}</label>
        <span className={cn('rounded-md px-1.5 py-0.5 text-xs font-bold num', changed ? 'bg-violet/10 text-violet' : 'text-muted')}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="flex justify-between text-[10px] text-muted"><span>{format(min)}</span>{hint && <span>{hint}</span>}<span>{format(max)}</span></div>
    </div>
  )
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-2.5 text-xs text-muted"><b className="text-ink">Aviso: </b>{children}</div>
}
export function CheckPill({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs', ok ? 'border-fin/30 bg-fin/5' : 'border-danger/30 bg-danger/5')}>
      <span className={cn('h-2 w-2 rounded-full', ok ? 'bg-fin' : 'bg-danger')} />
      <b className="text-ink">{label}</b><span className="text-muted num">{detail}</span>
    </div>
  )
}

/** Tabla simple con formato financiero: la primera columna es etiqueta. */
export function FinancialDataTable({ head, rows, onRow, dense, stickyFirst = true }: { head: ReactNode[]; rows: { key: string; cells: ReactNode[]; bold?: boolean; sub?: boolean; shade?: boolean }[]; onRow?: (key: string) => void; dense?: boolean; stickyFirst?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-sub">
            {head.map((h, i) => (
              <th key={i} className={cn('whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-muted', i === 0 ? cn('text-left', stickyFirst && 'sticky left-0 z-10 bg-sub') : 'text-right')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} onClick={onRow ? () => onRow(r.key) : undefined} className={cn('border-t border-line', onRow && 'cursor-pointer hover:bg-violet/5', r.bold && 'font-semibold', r.shade && 'bg-sub/70')}>
              {r.cells.map((c, i) => (
                <td key={i} className={cn('whitespace-nowrap px-3 num', dense ? 'py-1.5' : 'py-2', i === 0 ? cn('text-left', stickyFirst && 'sticky left-0 z-10 bg-card', r.sub && 'pl-7 text-muted') : 'text-right')}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
