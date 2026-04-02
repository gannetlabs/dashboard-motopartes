import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Factura } from '@/types'

interface UseFacturasOptions {
  limit?: number
  from?: string
  to?: string
}

export function useFacturas({ limit = 100, from, to }: UseFacturasOptions = {}) {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('facturas')
          .select('*')
          .eq('anulada', false)
          .order('fecha_factura', { ascending: false })
          .limit(limit)

        if (from) query = query.gte('fecha_factura', from)
        if (to) query = query.lte('fecha_factura', to)

        const { data, error: err } = await query
        if (err) throw err
        setFacturas(data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar facturas')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [limit, from, to])

  return { facturas, loading, error }
}
