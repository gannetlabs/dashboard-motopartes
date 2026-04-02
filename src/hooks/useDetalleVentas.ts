import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { DetalleFactura } from '@/types'

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
        const [detRes, facRes] = await Promise.all([
          supabase.from('detalle_factura').select('*').limit(5000),
          supabase
            .from('facturas')
            .select('id_factura,fecha_factura,anulada')
            .limit(5000),
        ])
        if (detRes.error) throw detRes.error
        if (facRes.error) throw facRes.error

        const fechaMap = new Map<number, string>()
        for (const f of facRes.data ?? []) {
          if (!f.anulada) fechaMap.set(f.id_factura, f.fecha_factura)
        }

        const merged: DetalleConFecha[] = []
        for (const d of detRes.data ?? []) {
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
