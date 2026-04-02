import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { VentaSemanal, BaselineVentaSemanal } from '@/types'

export function useVentasSemanales(weeks = 8) {
  const [ventas, setVentas] = useState<VentaSemanal[]>([])
  const [baseline, setBaseline] = useState<BaselineVentaSemanal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [v, b] = await Promise.all([
          supabase
            .from('mv_ventas_semanales')
            .select('*')
            .order('semana_inicio', { ascending: false })
            .limit(weeks),
          supabase
            .from('mv_baseline_ventas_semanales')
            .select('*')
            .order('semana_inicio', { ascending: false })
            .limit(weeks),
        ])
        if (v.error) throw v.error
        if (b.error) throw b.error
        setVentas((v.data ?? []).reverse())
        setBaseline((b.data ?? []).reverse())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar ventas semanales')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [weeks])

  return { ventas, baseline, loading, error }
}
