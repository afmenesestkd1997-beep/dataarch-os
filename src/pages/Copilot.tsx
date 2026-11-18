import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Send, Sparkles, User } from 'lucide-react'
import { useStore } from '../lib/store'
import { useData } from '../lib/hooks'
import { answerQuestion, INTENT_GROUPS, Answer } from '../lib/assistant'
import { Badge, Card, CardHeader, PageHeader, cn } from '../components/ui'

interface Msg { from: 'user' | 'ai'; text?: string; a?: Answer }

export default function Copilot() {
  const D = useData()
  const { month, tax, wacc, tg, minCash, invoices } = useStore()
  const [open, setOpen] = useState(INTENT_GROUPS[0].group)
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ai', text: 'Hola, soy DataArch Intelligence. Respondo con reglas y cifras reales del modelo de Nova Comercial (datos ficticios): sin respuestas aleatorias ni cifras inventadas. ¿Qué quieres analizar?' }])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const answer = (text: string): Answer => answerQuestion(text, { ms: D.ms, models: D.models, ag: D.ag, alerts: D.alerts, month, tax, wacc, tg, minCash, invoices })
  const ask = (t: string) => {
    if (!t.trim() || busy) return
    setMsgs((m) => [...m, { from: 'user', text: t }]); setQ(''); setBusy(true)
    setTimeout(() => { setMsgs((m) => [...m, { from: 'ai', a: answer(t) }]); setBusy(false) }, 450)
  }
  const last = [...msgs].reverse().find((m) => m.a)?.a
  return (
    <div>
      <PageHeader title="AI Financial Copilot" sub="DataArch Intelligence · respuestas basadas en reglas y en las cifras reales del modelo (versión simulada)." badge="Simulado" />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card pad={false} className="flex h-[calc(100vh-230px)] min-h-[480px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex gap-3', m.from === 'user' && 'flex-row-reverse')}>
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white', m.from === 'ai' ? 'bg-gradient-to-br from-violet to-electric' : 'bg-navy')}>{m.from === 'ai' ? <Bot size={16} /> : <User size={16} />}</div>
                <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm', m.from === 'user' ? 'bg-violet text-white' : 'border border-line bg-sub text-ink')}>
                  {m.text && <p>{m.text}</p>}
                  {m.a && <AnswerView a={m.a} />}
                </div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-muted"><Sparkles size={14} className="animate-pulse text-violet" /> Analizando el modelo financiero…</div>}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(q) }} className="flex gap-2 border-t border-line p-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pregunta sobre tu salud financiera…" className="flex-1 rounded-xl border border-line bg-sub px-4 py-2.5 text-sm text-ink outline-none focus:border-violet" />
            <button className="rounded-xl bg-violet px-4 text-white hover:bg-[#6a4be8] disabled:opacity-50" disabled={busy}><Send size={16} /></button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card><CardHeader title="Preguntas sugeridas" sub="Escríbelas con tus palabras o elige una" /><div className="space-y-2">{INTENT_GROUPS.map((g) => (<div key={g.group}><button onClick={() => setOpen(open === g.group ? "" : g.group)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-violet hover:bg-violet/5">{g.group}<span>{open === g.group ? "−" : "+"}</span></button>{open === g.group && <div className="mt-1 space-y-1.5">{g.questions.map((q) => <button key={q} onClick={() => ask(q)} className="w-full rounded-xl border border-line bg-sub px-3 py-2 text-left text-sm text-ink transition hover:border-violet/50 hover:bg-violet/5">{q}</button>)}</div>}</div>))}</div></Card>
          {last && last.indicators.length > 0 && <Card><CardHeader title="Indicadores vinculados" /><ul className="space-y-2">{last.indicators.map((i) => <li key={i.label} className="flex justify-between text-sm"><span className="text-muted">{i.label}</span><b className="num">{i.value}</b></li>)}</ul></Card>}
          <Card><CardHeader title="Arquitectura" /><p className="text-xs leading-relaxed text-muted">Hoy: motor de reglas local. Mañana: el navegador llama a un backend FastAPI que consulta PostgreSQL y a OpenAI/Anthropic con claves del lado servidor. Nunca hay API keys en el cliente.</p></Card>
        </div>
      </div>
    </div>
  )
}

function AnswerView({ a }: { a: Answer }) {
  const sec = (t: string, c: React.ReactNode) => <div className="mt-3"><div className="text-[10px] font-bold uppercase tracking-wider text-violet">{t}</div><div className="mt-1 text-[13px] leading-relaxed">{c}</div></div>
  return (
    <div>
      <div className="font-semibold">{a.finding}</div>
      {sec('Evidencia cuantitativa', <ul className="list-inside list-disc space-y-0.5 text-muted">{a.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>)}
      {sec('Impacto financiero', a.impact)}
      {sec('Recomendación', a.recommendation)}
      <Link to={a.path} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet/10 px-3 py-1.5 text-xs font-semibold text-violet hover:bg-violet/20">{a.action} <ArrowRight size={12} /></Link>
      <Badge tone="gray">{a.module}</Badge>
    </div>
  )
}
