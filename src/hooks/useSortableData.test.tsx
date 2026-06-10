import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSortableData } from './useSortableData'

interface Row {
  id: string
  n: number
  name: string
}

const rows: Row[] = [
  { id: 'a', n: 3, name: 'Carlos' },
  { id: 'b', n: 1, name: 'Ana' },
  { id: 'c', n: 2, name: 'Beto' },
]

const accessors = {
  n: (r: Row) => r.n,
  name: (r: Row) => r.name,
}

describe('useSortableData', () => {
  it('returns rows untouched when no sort key is active', () => {
    const { result } = renderHook(() => useSortableData(rows, accessors))
    expect(result.current.sortKey).toBeNull()
    expect(result.current.sorted.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts ascending on first requestSort of a column', () => {
    const { result } = renderHook(() => useSortableData(rows, accessors))
    act(() => result.current.requestSort('n'))
    expect(result.current.sortKey).toBe('n')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.sorted.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('toggles asc -> desc on a second requestSort of the same column', () => {
    const { result } = renderHook(() => useSortableData(rows, accessors))
    act(() => result.current.requestSort('n'))
    act(() => result.current.requestSort('n'))
    expect(result.current.sortDirection).toBe('desc')
    expect(result.current.sorted.map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('resets to asc when switching to a different column', () => {
    const { result } = renderHook(() => useSortableData(rows, accessors))
    act(() => result.current.requestSort('n'))
    act(() => result.current.requestSort('n')) // now desc
    act(() => result.current.requestSort('name'))
    expect(result.current.sortKey).toBe('name')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.sorted.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('respects the initial sort', () => {
    const { result } = renderHook(() =>
      useSortableData(rows, accessors, { key: 'name', direction: 'desc' }),
    )
    expect(result.current.sortKey).toBe('name')
    expect(result.current.sortDirection).toBe('desc')
    expect(result.current.sorted.map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('recomputes when the rows prop changes', () => {
    const { result, rerender } = renderHook(({ data }) => useSortableData(data, accessors), {
      initialProps: { data: rows },
    })
    act(() => result.current.requestSort('n'))
    const next: Row[] = [...rows, { id: 'd', n: 0, name: 'Zoe' }]
    rerender({ data: next })
    expect(result.current.sorted.map((r) => r.id)).toEqual(['d', 'b', 'c', 'a'])
  })
})
