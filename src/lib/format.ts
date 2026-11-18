const nf = (d: number) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d })

/** Valor monetario con escala automática: COP, M (millones) y MM (miles de millones). */
export function money(v: number, compact = true): string {
  const a = Math.abs(v)
  const s = v < 0 ? '-' : ''
  if (!compact || a < 1e6) return `${s}$${nf(0).format(a)}`
  if (a < 1e9) return `${s}$${nf(1).format(a / 1e6)} M`
  return `${s}$${nf(2).format(a / 1e9)} MM`
}
/** Millones de COP, sin símbolo (para tablas). */
export const mm = (v: number, d = 0) => {
  const r = v / 1e6
  const s = nf(d).format(Math.abs(r))
  return r < 0 && Number(Math.abs(r).toFixed(d)) !== 0 ? `(${s})` : s
}
export const pct = (v: number, d = 1) => `${nf(d).format(v * 100)}%`
export const spct = (v: number, d = 1) => `${v > 0 ? '+' : ''}${nf(d).format(v * 100)}%`
export const num = (v: number, d = 0) => nf(d).format(v)
export const days = (v: number) => `${nf(0).format(v)} d`
export const x = (v: number) => `${nf(1).format(v)}x`
export const cell = (v: number) => (v / 1e6).toFixed(1)

export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
