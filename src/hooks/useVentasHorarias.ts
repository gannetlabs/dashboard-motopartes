import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface VentaPorHora {
  hora: number
  horaLabel: string
  cantidad: number
  monto: number
  promedioCantidad: number
  promedioMonto: number
}

interface FacturaRow {
  fecha_registro: string
  total_factura: number
}

const TZ = 'America/Argentina/Buenos_Aires'

const hourFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ,
  hour: '2-digit',
  hour12: false,
})

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function useVentasHorarias(days = 30) {
  const [data, setData] = useState<VentaPorHora[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const from = new Date()
        from.setDate(from.getDate() - days)
        const fromIso = from.toISOString()

        const { data: rows, error: err } = await supabase
          .from('facturas')
          .select('fecha_registro,total_factura')
          .eq('anulada', false)
          // Exclude credit notes: they are refunds, not sales (DUX business rule)
          .neq('tipo_comprobante', 'NOTA_CREDITO')
          .gte('fecha_registro', fromIso)
          .limit(5000)

        if (err) throw err

        const buckets: Array<{
          cantidad: number
          monto: number
          dias: Set<string>
        }> = Array.from({ length: 24 }, () => ({
          cantidad: 0,
          monto: 0,
          dias: new Set<string>(),
        }))

        for (const row of (rows ?? []) as FacturaRow[]) {
          // fecha_registro viene como "YYYY-MM-DDTHH:mm:ss" sin sufijo de zona.
          // Sin "Z", JS lo interpretaría como hora local del navegador y la
          // conversión a ART no haría nada. Lo forzamos a UTC agregando "Z".
          const raw = row.fecha_registro
          const iso = raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`
          const d = new Date(iso)
          const hora = parseInt(hourFormatter.format(d), 10)
          if (Number.isNaN(hora)) continue
          const fechaLocal = dateFormatter.format(d)
          const bucket = buckets[hora]
          bucket.cantidad += 1
          bucket.monto += Number(row.total_factura) || 0
          bucket.dias.add(fechaLocal)
        }

        const result: VentaPorHora[] = buckets.map((b, hora) => {
          const diasObs = b.dias.size || 1
          return {
            hora,
            horaLabel: `${String(hora).padStart(2, '0')}h`,
            cantidad: b.cantidad,
            monto: b.monto,
            promedioCantidad: b.cantidad / diasObs,
            promedioMonto: b.monto / diasObs,
          }
        })

        setData(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar ventas horarias')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  return { data, loading, error }
}
