import { FormEvent, ReactNode, useState } from 'react'
import { Lock } from 'lucide-react'
import { Logo } from './Layout'

// Acceso de DEMOSTRACIÓN (verificación en el cliente, no es seguridad real).
const USER = 'Demo', PASS = '12345'
const KEY = 'dataarch-demo-auth'
const read = () => { try { return sessionStorage.getItem(KEY) === '1' } catch { return false } }

export default function Login({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(read)
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState(false)
  if (ok) return <>{children}</>
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (u.trim().toLowerCase() === USER.toLowerCase() && p === PASS) { try { sessionStorage.setItem(KEY, '1') } catch { /* ignore */ } setOk(true) }
    else setErr(true)
  }
  const f = 'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#A78BFA]'
  return (
    <div className="grad-brand flex min-h-full items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-white/10 bg-navy/70 p-8 shadow-2xl backdrop-blur">
        <Logo />
        <h1 className="mt-8 text-2xl font-extrabold text-white">Lleva tu empresa al siguiente nivel con <span className="grad-text">Finanzas e IA</span></h1>
        <p className="mt-2 text-sm text-white/60">Ingresa a la demostración de DataArch OS.</p>
        <div className="mt-6 space-y-3">
          <input className={f} placeholder="Usuario" value={u} onChange={(e) => { setU(e.target.value); setErr(false) }} autoFocus />
          <input className={f} type="password" placeholder="Contraseña" value={p} onChange={(e) => { setP(e.target.value); setErr(false) }} />
          {err && <div className="text-sm text-red-300">Usuario o contraseña incorrectos.</div>}
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet py-3 text-sm font-semibold text-white hover:bg-[#6a4be8]"><Lock size={15} /> Ingresar</button>
        </div>
        <p className="mt-5 text-center text-[11px] text-white/40">Datos ficticios · Nova Comercial S.A.S.</p>
      </form>
    </div>
  )
}
