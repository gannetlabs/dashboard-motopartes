import { describe, it, expect } from 'vitest'
import { compareValues, sortBy } from './sort'

describe('compareValues', () => {
  it('compares numbers numerically', () => {
    expect(compareValues(2, 10)).toBeLessThan(0)
    expect(compareValues(10, 2)).toBeGreaterThan(0)
    expect(compareValues(5, 5)).toBe(0)
  })

  it('compares numeric strings naturally ("9" < "10")', () => {
    expect(compareValues('9', '10')).toBeLessThan(0)
    expect(compareValues('10', '9')).toBeGreaterThan(0)
  })

  it('compares strings case-insensitively', () => {
    expect(compareValues('abc', 'ABC')).toBe(0)
    expect(compareValues('a', 'b')).toBeLessThan(0)
  })

  it('orders Spanish accents as expected', () => {
    // á sorts next to a, before b
    expect(compareValues('ánodo', 'bujía')).toBeLessThan(0)
  })

  it('compares booleans (false < true)', () => {
    expect(compareValues(false, true)).toBeLessThan(0)
    expect(compareValues(true, false)).toBeGreaterThan(0)
    expect(compareValues(true, true)).toBe(0)
  })

  it('treats null/undefined as equal to each other', () => {
    expect(compareValues(null, undefined)).toBe(0)
    expect(compareValues(null, null)).toBe(0)
  })
})

describe('sortBy', () => {
  const rows = [
    { id: 'a', n: 3 },
    { id: 'b', n: 1 },
    { id: 'c', n: 2 },
  ]

  it('sorts ascending by accessor', () => {
    const out = sortBy(rows, (r) => r.n, 'asc')
    expect(out.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('sorts descending by accessor', () => {
    const out = sortBy(rows, (r) => r.n, 'desc')
    expect(out.map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('does not mutate the input array', () => {
    const input = [...rows]
    const snapshot = input.map((r) => r.id)
    sortBy(input, (r) => r.n, 'desc')
    expect(input.map((r) => r.id)).toEqual(snapshot)
  })

  it('keeps null/undefined values last in ascending order', () => {
    const data = [
      { id: 'a', v: 5 as number | null },
      { id: 'b', v: null },
      { id: 'c', v: 2 },
    ]
    const out = sortBy(data, (r) => r.v, 'asc')
    expect(out.map((r) => r.id)).toEqual(['c', 'a', 'b'])
  })

  it('keeps null/undefined values last in descending order too', () => {
    const data = [
      { id: 'a', v: 5 as number | null },
      { id: 'b', v: null },
      { id: 'c', v: 2 },
    ]
    const out = sortBy(data, (r) => r.v, 'desc')
    expect(out.map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('is stable for equal keys (preserves original order)', () => {
    const data = [
      { id: 'a', v: 1 },
      { id: 'b', v: 1 },
      { id: 'c', v: 1 },
    ]
    const out = sortBy(data, (r) => r.v, 'asc')
    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts ISO date strings chronologically (lexical order matches)', () => {
    const data = [
      { id: 'a', d: '2025-08-22' },
      { id: 'b', d: '2025-01-05' },
      { id: 'c', d: '2025-12-31' },
    ]
    const out = sortBy(data, (r) => r.d, 'asc')
    expect(out.map((r) => r.id)).toEqual(['b', 'a', 'c'])
  })
})
