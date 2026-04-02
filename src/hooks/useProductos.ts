import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Producto } from '@/types'

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('productos')
          .select('*')
          .order('nombre', { ascending: true })
          .limit(2000)
        if (err) throw err
        setProductos(data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar productos')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return { productos, loading, error }
}
