# DataArch OS — Financial Intelligence Platform (demo)

Frontend SaaS (React + TypeScript + Tailwind + Recharts + Zustand) con motor financiero determinístico.
Empresa ficticia: **Nova Comercial S.A.S.** (12 meses reales + 24 proyectados). Sin backend, sin API keys, sin llamadas externas.

## Ejecutar
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 8 pruebas del motor (EBITDA, balance, caja, capital de trabajo, FCFF, DCF, registro de venta)
npm run build    # tsc + vite build
```
Botón **Iniciar Demo** (header) = recorrido guiado de 10 pasos (~5 min).

## Estructura
- `src/lib/engine.ts` — motor: P&L, balance, flujo, capital de trabajo, DCF (todo cuadra por construcción).
- `src/lib/analytics.ts` — KPIs, ratios, alertas verificables, aging, tesorería 13 semanas, puente de EBITDA.
- `src/lib/seed.ts` — clientes, proveedores, productos, bancos (ficticios).
- `src/lib/store.ts` — estado global (Zustand, persistencia local).
- `src/pages/*` — módulos; `src/components/*` — UI reutilizable y gráficos.

## Simplificaciones documentadas
- Vite + React Router (`BrowserRouter` + rewrites en `vercel.json`) en vez de Next.js: SPA 100% cliente; migrar a Next App Router es directo.
- Sin shadcn/ui, TanStack Table, RHF/Zod ni Framer Motion (dependencias evitadas a propósito en el MVP).
- Impuesto de renta se paga en el mes; IVA es partida transitoria; compras ≈ costo de venta + Δ inventario.
- Las ventas registradas se contabilizan en el último mes cerrado (oct-2026).
- Copilot: motor de reglas local; la integración con OpenAI/Anthropic debe ir tras un backend (FastAPI).
