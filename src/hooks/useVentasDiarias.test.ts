import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '@/lib/supabase'
import { supabaseFrom } from '@/test/supabaseMock'
import { useVentasDiarias } from './useVentasDiarias'

const mockFrom = supabase.from as unknown as Mock

// Supabase returns rows ordered by fecha DESC; the hook reverses them to ASC.
// Factory (not a shared constant): the hook reverses the array in place, so a
// shared reference would leak mutation between tests and break isolation.
const ventasDesc = () => [
  { fecha: '2026-06-03', ventas_brutas: 30 },
  { fecha: '2026-06-02', ventas_brutas: 20 },
  { fecha: '2026-06-01', ventas_brutas: 10 },
]

describe('useVentasDiarias', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('reverses rows to ascending order', async () => {
    mockFrom.mockImplementation(
      supabaseFrom({
        ventas_diarias: { data: ventasDesc(), error: null },
        mv_baseline_ventas_diarias: { data: [], error: null },
      }),
    )

    const { result } = renderHook(() => useVentasDiarias(30))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.ventasDiarias.map((v) => v.fecha)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ])
  })

  it('exposes the most recent day as `today`', async () => {
    mockFrom.mockImplementation(
      supabaseFrom({
        ventas_diarias: { data: ventasDesc(), error: null },
        mv_baseline_ventas_diarias: { data: [], error: null },
      }),
    )

    const { result } = renderHook(() => useVentasDiarias(30))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.today?.fecha).toBe('2026-06-03')
  })

  it('surfaces an error when a query fails', async () => {
    mockFrom.mockImplementation(
      supabaseFrom({
        ventas_diarias: { data: null, error: { message: 'down' } },
        mv_baseline_ventas_diarias: { data: [], error: null },
      }),
    )

    const { result } = renderHook(() => useVentasDiarias(30))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.today).toBeNull()
  })
})
