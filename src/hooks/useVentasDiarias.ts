import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { VentaDiaria, BaselineVentaDiaria } from '@/types'

export function useVentasDiarias(days = 30) {
  const [ventasDiarias, setVentasDiarias] = useState<VentaDiaria[]>([])
  const [baseline, setBaseline] = useState<BaselineVentaDiaria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [ventas, base] = await Promise.all([
          supabase
            .from('ventas_diarias')
            .select('*')
            .order('fecha', { ascending: false })
            .limit(days),
          supabase
            .from('mv_baseline_ventas_diarias')
            .select('*')
            .order('fecha', { ascending: false })
            .limit(days),
        ])
        if (ventas.error) throw ventas.error
        if (base.error) throw base.error
        setVentasDiarias((ventas.data ?? []).reverse())
        setBaseline((base.data ?? []).reverse())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar ventas')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  const today = ventasDiarias.length > 0 ? ventasDiarias[ventasDiarias.length - 1] : null

  return { ventasDiarias, baseline, today, loading, error }
}
