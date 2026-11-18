// Datos maestros FICTICIOS de Nova Comercial S.A.S. (deterministas).
export const COMPANY = {
  id: 'nova-comercial', name: 'Nova Comercial S.A.S.', industry: 'Comercialización y distribución de productos',
  city: 'Bogotá, Colombia', currency: 'COP', nit: '900.000.000-0 (ficticio)', version: 'v1.0-demo',
}

const SECTORS = ['Supermercados', 'Droguerías', 'Ferretería', 'Distribuidora', 'Hoteles', 'Cafeterías', 'Almacenes', 'Tiendas', 'Colegios', 'Clínica', 'Restaurantes', 'Gimnasios', 'Panaderías', 'Mini Mercados', 'Cooperativa']
const PLACES = ['La Sabana', 'Andina', 'El Constructor', 'Tequendama', 'Salitre', 'Monserrate', 'Usaquén', 'Candelaria', 'Horizonte', 'Santa Elena', 'Chapinero', 'Kennedy', 'Suba', 'Fontibón', 'Teusaquillo', 'Engativá', 'Bosa', 'Techo', 'Cedritos', 'Modelia', 'Zipaquirá', 'Chía', 'Cajicá', 'Soacha', 'Funza', 'Mosquera', 'Madrid', 'Tocancipá', 'Sopó', 'La Calera']

export interface Customer { id: string; name: string; weight: number; terms: number; risk: 0 | 1 | 2; city: string }
const rawW = Array.from({ length: 30 }, (_, i) => 1 / Math.pow(i + 1, 0.85))
const sw = rawW.reduce((a, b) => a + b, 0)
const RISK: (0 | 1 | 2)[] = [0, 0, 1, 0, 2, 0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 2, 0, 1]
export const CUSTOMERS: Customer[] = rawW.map((w, i) => ({
  id: `C${String(i + 1).padStart(3, '0')}`, name: `${SECTORS[i % 15]} ${PLACES[i]}`, weight: w / sw,
  terms: [30, 45, 60][i % 3], risk: RISK[i], city: 'Bogotá y Cundinamarca',
}))

export interface Supplier { id: string; name: string; weight: number; terms: number; category: string }
const SUP = ['Alimentos Andinos', 'Bebidas del Valle', 'Aseo Total', 'Cuidado Natural', 'Snacks Colombia', 'Empaques Sabana', 'Lácteos del Norte', 'Granos y Cereales', 'Importadora Pacífico', 'Químicos del Centro', 'Logística Express', 'Papeles Nacionales', 'Dulces Tropicales', 'Aceites Premium', 'Hogar & Más']
const sRaw = Array.from({ length: 15 }, (_, i) => 1 / Math.pow(i + 1, 0.8))
const ss = sRaw.reduce((a, b) => a + b, 0)
export const SUPPLIERS: Supplier[] = sRaw.map((w, i) => ({
  id: `P${String(i + 1).padStart(3, '0')}`, name: `${SUP[i]} (ficticio)`.replace(' (ficticio)', ' S.A.'), weight: w / ss, terms: [30, 45, 60, 30, 90][i % 5],
  category: ['Abarrotes', 'Bebidas', 'Aseo y Hogar', 'Cuidado Personal', 'Snacks'][i % 5],
}))

export const CATEGORIES = ['Abarrotes', 'Bebidas', 'Aseo y Hogar', 'Cuidado Personal', 'Snacks'] as const
export interface Product { id: string; name: string; category: string; price: number; unitMargin: number; weight: number }
const PROD: Record<string, string[]> = {
  Abarrotes: ['Arroz 500g', 'Aceite 1L', 'Pasta 250g', 'Azúcar 1kg', 'Café molido 250g'],
  Bebidas: ['Gaseosa 1.5L', 'Agua 600ml', 'Jugo 1L', 'Té frío 400ml', 'Cerveza 330ml'],
  'Aseo y Hogar': ['Detergente 1kg', 'Jabón loza', 'Suavizante 1L', 'Limpiador 900ml', 'Papel higiénico x12'],
  'Cuidado Personal': ['Shampoo 400ml', 'Jabón de tocador', 'Crema dental', 'Desodorante', 'Toallas húmedas'],
  Snacks: ['Papas 150g', 'Galletas x6', 'Chocolatina', 'Maní 200g', 'Barras de cereal'],
}
const CAT_W = [0.30, 0.24, 0.19, 0.15, 0.12]
const BASE_M = [0.26, 0.30, 0.34, 0.40, 0.36]
export const PRODUCTS: Product[] = CATEGORIES.flatMap((c, ci) => PROD[c].map((n, i) => {
  const w = 1 / (i + 1.4)
  const tot = PROD[c].reduce((a, _, k) => a + 1 / (k + 1.4), 0)
  return {
    id: `SKU-${ci + 1}${i + 1}`, name: n, category: c, price: [4200, 14900, 3600, 5200, 11800][ci] * (1 + i * 0.18),
    unitMargin: BASE_M[ci] + (2 - i) * 0.012, weight: CAT_W[ci] * (w / tot),
  }
}))
export const AVG_BASE_MARGIN = PRODUCTS.reduce((s, p) => s + p.weight * p.unitMargin, 0)

export const BANKS = [
  { name: 'Banco Andino (ficticio)', type: 'Cuenta corriente', share: 0.46 },
  { name: 'Banco Capital (ficticio)', type: 'Cuenta de ahorros', share: 0.27 },
  { name: 'Fiduciaria Sabana (ficticia)', type: 'Fondo de liquidez', share: 0.22 },
  { name: 'Caja menor', type: 'Efectivo', share: 0.05 },
]
export const BANK_SHARES = BANKS.map((b) => b.share)
