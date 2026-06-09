import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllPages } from '@/lib/fetchAll'
import type { ProductoStock } from '@/types'
import type { ProductoStats } from './useDetalleVentas'

export type Severidad = 'agotado' | 'critico' | 'bajo'

export interface StockCritico {
  cod_item: string
  descripcion: string
  stockDisponible: number
  ventaDiaria: number
  diasRestantes: number | null // null/0 cuando ya está agotado
  severidad: Severidad
}

/**
 * Fetches the per-product stock table (depósito MOTO REPUESTOS SUR). Paginated
 * via fetchAllPages so it never truncates as the catalogue grows.
 */
export function useProductosStock() {
  const [stock, setStock] = useState<ProductoStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchAllPages<ProductoStock>((from, to) =>
          supabase.from('productos_stock').select('*').range(from, to),
        )
        setStock(rows)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar stock')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return { stock, loading, error }
}

const SEVERITY_ORDER: Record<Severidad, number> = {
  agotado: 0,
  critico: 1,
  bajo: 2,
}

/**
 * Cross stock with sales velocity to surface ONLY actionable items: products
 * that actually sell AND are out of stock or about to run out. A raw "stock < N"
 * threshold is noise here — most SKUs normally hold few units. The real signal
 * is "days of stock left at the current sales rate".
 *
 * @param stock        rows from productos_stock
 * @param statsByItem  per-product stats whose `unidades` is summed over `ventanaDias`
 * @param ventanaDias  the window (in days) `statsByItem.unidades` covers — used to derive daily rate
 * @param umbralDias   flag items with fewer than this many days of stock left
 */
export function computeStockCritico(
  stock: ProductoStock[],
  statsByItem: Map<string, ProductoStats>,
  ventanaDias = 90,
  umbralDias = 15,
): StockCritico[] {
  const result: StockCritico[] = []

  for (const s of stock) {
    const stats = statsByItem.get(s.cod_item)
    if (!stats) continue // sin ventas en la ventana → no es riesgo de quiebre

    const ventaDiaria = stats.unidades / ventanaDias
    if (ventaDiaria <= 0) continue

    const disp = s.stock_disponible
    if (disp < 0) continue // guard ante datos anómalos

    if (disp === 0) {
      result.push({
        cod_item: s.cod_item,
        descripcion: stats.descripcion,
        stockDisponible: 0,
        ventaDiaria,
        diasRestantes: 0,
        severidad: 'agotado',
      })
      continue
    }

    const diasRestantes = disp / ventaDiaria
    if (diasRestantes > umbralDias) continue // stock sano → fuera de la lista

    result.push({
      cod_item: s.cod_item,
      descripcion: stats.descripcion,
      stockDisponible: disp,
      ventaDiaria,
      diasRestantes,
      severidad: diasRestantes < 7 ? 'critico' : 'bajo',
    })
  }

  return result.sort((a, b) => {
    if (SEVERITY_ORDER[a.severidad] !== SEVERITY_ORDER[b.severidad]) {
      return SEVERITY_ORDER[a.severidad] - SEVERITY_ORDER[b.severidad]
    }
    // Entre agotados, primero el que más vende (más ventas perdidas).
    if (a.severidad === 'agotado') return b.ventaDiaria - a.ventaDiaria
    // Entre críticos/bajos, primero el que menos días de stock le queda.
    return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0)
  })
}
