import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '@/lib/supabase'
import { supabaseFrom } from '@/test/supabaseMock'
import { useProductos } from './useProductos'

const mockFrom = supabase.from as unknown as Mock

describe('useProductos', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('starts in a loading state with no products', () => {
    mockFrom.mockImplementation(
      supabaseFrom({ productos: { data: [], error: null } }),
    )
    const { result } = renderHook(() => useProductos())
    expect(result.current.loading).toBe(true)
    expect(result.current.productos).toEqual([])
  })

  it('exposes the products on success', async () => {
    const productos = [
      { cod_item: 'A', nombre: 'Aceite' },
      { cod_item: 'B', nombre: 'Bujía' },
    ]
    mockFrom.mockImplementation(
      supabaseFrom({ productos: { data: productos, error: null } }),
    )

    const { result } = renderHook(() => useProductos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.productos).toEqual(productos)
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error and keeps products empty', async () => {
    mockFrom.mockImplementation(
      supabaseFrom({ productos: { data: null, error: { message: 'boom' } } }),
    )

    const { result } = renderHook(() => useProductos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.productos).toEqual([])
  })
})
