import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, BarChart3, BellRing, Bot, Boxes, Building2, Calculator, CalendarClock, ChevronDown, ChevronsLeft, ChevronsRight, CircleDollarSign, ClipboardList,
  Coins, FileSpreadsheet, Gauge, Landmark, LayoutDashboard, LineChart, Menu, Moon, Package, Percent, PlayCircle, Plug, Receipt, Scale, Search, Settings, ShoppingCart,
  SlidersHorizontal, Sparkles, Sun, Target, TrendingUp, Truck, Users, Wallet, Warehouse, Waves, Workflow, X, BookOpen, CheckCircle2, Factory,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { useData } from '../lib/hooks'
import { COMPANY } from '../lib/seed'
import { MONTH_NAMES, SCENARIO_LABEL, ScenarioKey, monthDate } from '../lib/engine'
import { cn } from './ui'

export const NAV = [
  { group: 'Executive Center', items: [
    { to: '/', label: 'Dashboard Ejecutivo', icon: LayoutDashboard, end: true },
    { to: '/copilot', label: 'AI Financial Copilot', icon: Bot },
    { to: '/alertas', label: 'Alertas y Recomendaciones', icon: BellRing },
  ] },
  { group: 'Business Operations', items: [
    { to: '/ventas', label: 'Ventas', icon: Receipt },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/compras', label: 'Compras', icon: ShoppingCart },
    { to: '/proveedores', label: 'Proveedores', icon: Truck },
    { to: '/inventarios', label: 'Inventarios', icon: Warehouse },
    { to: '/operaciones', label: 'Operaciones', icon: Factory },
  ] },
  { group: 'Finance & Accounting', items: [
    { to: '/contabilidad', label: 'Contabilidad', icon: BookOpen },
    { to: '/estados', label: 'Estados Financieros', icon: FileSpreadsheet },
    { to: '/cxc', label: 'Cuentas por Cobrar', icon: Wallet },
    { to: '/cxp', label: 'Cuentas por Pagar', icon: CircleDollarSign },
    { to: '/tesoreria', label: 'Tesorería', icon: Landmark },
    { to: '/impuestos', label: 'Impuestos', icon: Percent },
  ] },
  { group: 'Financial Intelligence', items: [
    { to: '/fpa', label: 'FP&A', icon: Target },
    { to: '/budget', label: 'Budget', icon: ClipboardList },
    { to: '/forecast', label: 'Forecast', icon: TrendingUp },
    { to: '/actual-vs-budget', label: 'Actual vs Budget', icon: BarChart3 },
    { to: '/escenarios', label: 'Escenarios', icon: Workflow },
    { to: '/simulador', label: 'Scenario Simulator', icon: SlidersHorizontal },
    { to: '/cash-flow-forecast', label: 'Cash Flow Forecast', icon: Waves },
    { to: '/working-capital', label: 'Working Capital', icon: Boxes },
    { to: '/ratios', label: 'Financial Ratios', icon: Gauge },
    { to: '/valuation', label: 'Valuation', icon: Scale },
  ] },
  { group: 'Administration', items: [
    { to: '/empresas', label: 'Empresas', icon: Building2 },
    { to: '/integraciones', label: 'Integraciones', icon: Plug },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
  ] },
]
const FLAT = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })))
void [Activity, AlertTriangle, Calculator, CalendarClock, Coins, LineChart, Package, Sparkles, CheckCircle2]

/** Marca del arco: anillo sólido lavanda (mismo path que Sitio Web / assets/arch.svg). */
export function ArchMark({ size = 40 }: { size?: number }) {
  const h = Math.round(size * 56 / 120)
  return (
    <svg width={size} height={h} viewBox="0 0 120 56" fill="none" aria-hidden="true">
      <path fill="#C5B3FF" d="M12 54C12 27.5 33.5 6 60 6s48 21.5 48 48H92c0-17.7-14.3-32-32-32S28 36.3 28 54H12z" />
    </svg>
  )
}

export function Logo({ light = true, small }: { light?: boolean; small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <ArchMark size={small ? 32 : 40} />
      <div className="leading-none">
        <div className={cn('text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-ink')}>Data<span className="text-[#C5B3FF]">Arch</span> <span className="font-semibold opacity-70">OS</span></div>
        {!small && <div className={cn('mt-1 text-[10px] font-medium tracking-[0.14em] uppercase', light ? 'text-white/55' : 'text-muted')}>Financial Intelligence</div>}
      </div>
    </div>
  )
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { collapsed, set } = useStore()
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-navy/60 lg:hidden" onClick={onClose} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col bg-navy text-white transition-all duration-200 lg:static lg:translate-x-0', collapsed ? 'lg:w-[68px]' : 'lg:w-[262px]', 'w-[262px]', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          {collapsed ? <ArchMark size={28} /> : <Logo />}
          <button className="rounded-lg p-1 text-white/60 hover:bg-white/10 lg:hidden" onClick={onClose}><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {NAV.map((g) => (
            <div key={g.group} className="mb-3">
              {!collapsed && <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">{g.group}</div>}
              {collapsed && <div className="mx-3 mb-1 border-t border-white/10" />}
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={(it as { end?: boolean }).end} onClick={onClose} title={it.label}
                  className={({ isActive }) => cn('mb-0.5 flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium transition', isActive ? 'bg-gradient-to-r from-violet to-[#5a3fe0] text-white shadow-lg shadow-violet/30' : 'text-white/65 hover:bg-white/8 hover:text-white', collapsed && 'justify-center')}>
                  <it.icon size={17} className="shrink-0" />
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-3 lg:block">
          <button onClick={() => set({ collapsed: !collapsed })} className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs text-white/60 hover:bg-white/10">
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Contraer menú</>}
          </button>
        </div>
      </aside>
    </>
  )
}

function useOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb()
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  })
}
function Dropdown({ label, children, align = 'left', icon }: { label: ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; icon?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm font-medium text-ink hover:border-violet/40">
        {icon}{label}<ChevronDown size={14} className="text-muted" />
      </button>
      {open && <div className={cn('absolute z-40 mt-2 min-w-[220px] rounded-xl border border-line bg-card p-1.5 shadow-2xl', align === 'right' ? 'right-0' : 'left-0')}>{children(() => setOpen(false))}</div>}
    </div>
  )
}
const Opt = ({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) => (
  <button onClick={onClick} className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-violet/10', active ? 'font-semibold text-violet' : 'text-ink')}>{children}{active && <CheckCircle2 size={14} />}</button>
)

function Header({ onMenu }: { onMenu: () => void }) {
  const { month, scenario, theme, set } = useStore()
  const { alerts } = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutside(ref, () => setFocus(false))
  const results = useMemo(() => (q ? FLAT.filter((i) => (i.label + i.group).toLowerCase().includes(q.toLowerCase())).slice(0, 7) : []), [q])
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-card/85 px-4 backdrop-blur lg:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-muted hover:bg-line lg:hidden"><Menu size={20} /></button>
      <div className="relative hidden w-72 md:block" ref={ref}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} placeholder="Buscar módulo…" className="w-full rounded-xl border border-line bg-sub py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-violet" />
        {focus && results.length > 0 && (
          <div className="absolute mt-2 w-full rounded-xl border border-line bg-card p-1.5 shadow-2xl">
            {results.map((r) => (
              <button key={r.to} onClick={() => { nav(r.to); setQ(''); setFocus(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-violet/10">
                <r.icon size={15} className="text-violet" /><span className="text-ink">{r.label}</span><span className="ml-auto text-[10px] text-muted">{r.group}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden xl:block">
          <Dropdown icon={<Building2 size={15} className="text-violet" />} label={<span className="max-w-[150px] truncate">{COMPANY.name}</span>}>
            {(close) => (<>
              <Opt active onClick={close}><span><b>{COMPANY.name}</b><br /><span className="text-xs text-muted">{COMPANY.city} · {COMPANY.currency}</span></span></Opt>
              <div className="px-3 py-2 text-[11px] text-muted">Empresa 100% ficticia. Multi-empresa en Administración → Empresas.</div>
            </>)}
          </Dropdown>
        </div>
        <Dropdown label={(() => { const d = monthDate(month); return `${MONTH_NAMES[d.month]} ${d.year}` })()} icon={<CalendarClock size={15} className="text-violet" />}>
          {(close) => Array.from({ length: 12 }, (_, i) => 11 - i).map((t) => { const d = monthDate(t); return <Opt key={t} active={t === month} onClick={() => { set({ month: t }); close() }}>{MONTH_NAMES[d.month]} {d.year}</Opt> })}
        </Dropdown>
        <div className="hidden sm:block">
          <Dropdown label={SCENARIO_LABEL[scenario]} icon={<Workflow size={15} className="text-violet" />}>
            {(close) => (['base', 'upside', 'downside', 'custom'] as ScenarioKey[]).map((s) => <Opt key={s} active={s === scenario} onClick={() => { set({ scenario: s }); close() }}>{SCENARIO_LABEL[s]}</Opt>)}
          </Dropdown>
        </div>
        <button onClick={() => { set({ tourStep: 0 }); nav('/') }} className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet to-electric px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet/25 hover:opacity-90 md:flex">
          <PlayCircle size={16} /> Iniciar Demo
        </button>
        <Dropdown align="right" label={<span className="relative"><BellRing size={16} />{alerts.length > 0 && <i className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold not-italic text-white">{alerts.length}</i>}</span>}>
          {(close) => (
            <div className="w-80">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">Alertas activas</div>
              {alerts.slice(0, 5).map((a) => <button key={a.id} onClick={() => { nav(a.path); close() }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-violet/10"><div className="text-sm font-semibold text-ink">{a.title}</div><div className="text-xs text-muted">{a.indicator}: {a.value}</div></button>)}
              <button onClick={() => { nav('/alertas'); close() }} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-violet hover:bg-violet/10">Ver todas</button>
            </div>
          )}
        </Dropdown>
        <button onClick={() => set({ theme: theme === 'dark' ? 'light' : 'dark' })} className="rounded-xl border border-line bg-card p-2.5 text-muted hover:text-ink" title="Modo claro / oscuro">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet to-electric text-xs font-bold text-white" title="Alexis Meneses (demo)">AM</div>
      </div>
    </header>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(false)
  const { theme } = useStore()
  const loc = useLocation()
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark') }, [theme])
  useEffect(() => { document.getElementById('main')?.scrollTo({ top: 0 }) }, [loc.pathname])
  return (
    <div className="flex h-full">
      <Sidebar mobileOpen={mobile} onClose={() => setMobile(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMobile(true)} />
        <main id="main" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1500px] p-4 lg:p-6">{children}</div>
          <footer className="px-6 pb-6 text-center text-[11px] text-muted">DataArch OS · Finanzas + IA para Pymes · Todos los datos de Nova Comercial S.A.S. son ficticios y con fines de demostración · M = millones · MM = miles de millones (COP)</footer>
        </main>
      </div>
    </div>
  )
}
