import { describe, it, expect } from 'vitest'
import { fetchAllPages } from './fetchAll'

// Fake paginated source: holds `total` rows and records every range requested.
function makeSource(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }))
  const calls: Array<[number, number]> = []
  const page = (from: number, to: number) => {
    calls.push([from, to])
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
  }
  return { page, calls }
}

describe('fetchAllPages', () => {
  it('fetches every row across multiple pages', async () => {
    const { page, calls } = makeSource(5)

    const rows = await fetchAllPages(page, 2)

    expect(rows).toHaveLength(5)
    expect(calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ])
  })

  it('stops after a short page without an extra request', async () => {
    const { page, calls } = makeSource(3)

    const rows = await fetchAllPages(page, 5)

    expect(rows).toHaveLength(3)
    expect(calls).toEqual([[0, 4]])
  })

  it('makes a final empty request when total is a multiple of pageSize', async () => {
    const { page, calls } = makeSource(4)

    const rows = await fetchAllPages(page, 2)

    expect(rows).toHaveLength(4)
    // [0,1] full, [2,3] full, [4,5] empty -> stop
    expect(calls).toHaveLength(3)
  })

  it('returns an empty array when there are no rows', async () => {
    const { page, calls } = makeSource(0)

    const rows = await fetchAllPages(page, 1000)

    expect(rows).toEqual([])
    expect(calls).toEqual([[0, 999]])
  })

  it('throws when the query returns an error', async () => {
    const page = () =>
      Promise.resolve({ data: null, error: { message: 'boom' } })

    await expect(fetchAllPages(page, 100)).rejects.toThrow('boom')
  })
})
