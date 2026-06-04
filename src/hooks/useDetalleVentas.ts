import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllPages } from '@/lib/fetchAll'
import type { DetalleFactura, Factura } from '@/types'

type FacturaRef = Pick<
  Factura,
  'id_factura' | 'fecha_factura' | 'anulada' | 'tipo_comprobante'
>

export interface DetalleConFecha extends DetalleFactura {
  fecha_factura: string
}

export interface ProductoStats {
  cod_item: string
  descripcion: string
  unidades: number
  ingresos: number
  costo: number
  margen: number
  margenPct: number
  numFacturas: number
  ultimaVenta: string
}

export function useDetalleVentas() {
  const [detalles, setDetalles] = useState<DetalleConFecha[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // Paginate instead of a hardcoded .limit(): detalle_factura already
        // exceeds 5000 rows, so a fixed cap would silently drop the overflow.
        const [detalleRows, facturaRows] = await Promise.all([
          fetchAllPages<DetalleFactura>((from, to) =>
            supabase.from('detalle_factura').select('*').range(from, to),
          ),
          fetchAllPages<FacturaRef>((from, to) =>
            supabase
              .from('facturas')
              .select('id_factura,fecha_factura,anulada,tipo_comprobante')
              .range(from, to),
          ),
        ])

        const fechaMap = new Map<number, string>()
        for (const f of facturaRows) {
          // Exclude credit notes: they are refunds, not sales (DUX business rule).
          // Their detalle rows are dropped because their id_factura never enters the map.
          if (!f.anulada && f.tipo_comprobante !== 'NOTA_CREDITO') {
            fechaMap.set(f.id_factura, f.fecha_factura)
          }
        }

        const merged: DetalleConFecha[] = []
        for (const d of detalleRows) {
          const fecha = fechaMap.get(d.id_factura)
          if (fecha) merged.push({ ...d, fecha_factura: fecha })
        }

        setDetalles(merged)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar detalles')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return { detalles, loading, error }
}

export function computeProductoStats(
  detalles: DetalleConFecha[],
  days?: number,
): ProductoStats[] {
  const cutoff = days
    ? new Date(Date.now() - days * 86400000)
    : null

  const map = new Map<string, ProductoStats>()

  for (const d of detalles) {
    if (cutoff && new Date(d.fecha_factura) < cutoff) continue

    const ingresos = d.precio_unitario * d.cantidad * (1 - (d.porc_descuento ?? 0) / 100)
    const costo = (d.costo_unitario ?? 0) * d.cantidad
    const margen = ingresos - costo
    const fecha = d.fecha_factura.substring(0, 10)

    const existing = map.get(d.cod_item)
    if (!existing) {
      map.set(d.cod_item, {
        cod_item: d.cod_item,
        descripcion: d.descripcion_item,
        unidades: d.cantidad,
        ingresos,
        costo,
        margen,
        margenPct: ingresos > 0 ? (margen / ingresos) * 100 : 0,
        numFacturas: 1,
        ultimaVenta: fecha,
      })
    } else {
      existing.unidades += d.cantidad
      existing.ingresos += ingresos
      existing.costo += costo
      existing.margen += margen
      existing.margenPct =
        existing.ingresos > 0 ? (existing.margen / existing.ingresos) * 100 : 0
      existing.numFacturas += 1
      if (fecha > existing.ultimaVenta) existing.ultimaVenta = fecha
    }
  }

  return Array.from(map.values()).sort((a, b) => b.ingresos - a.ingresos)
}
