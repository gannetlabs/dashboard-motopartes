import { useMemo, useState } from 'react'
import { sortBy, type Sortable, type SortDirection } from '@/lib/sort'

export type Accessors<T, K extends string> = Record<K, (row: T) => Sortable>

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

interface UseSortableDataResult<T, K extends string> {
  sorted: T[]
  sortKey: K | null
  sortDirection: SortDirection
  requestSort: (key: K) => void
}

/**
 * Manages click-to-sort state for a table. While no column is active the rows
 * are returned untouched, preserving each page's curated default order.
 * Clicking a column sorts ascending; clicking the same column again toggles to
 * descending; clicking a different column resets to ascending.
 */
export function useSortableData<T, K extends string>(
  rows: readonly T[],
  accessors: Accessors<T, K>,
  initial?: SortState<K>,
): UseSortableDataResult<T, K> {
  const [sort, setSort] = useState<SortState<K> | null>(initial ?? null)

  const requestSort = (key: K) => {
    setSort((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const sorted = useMemo(() => {
    if (!sort) return [...rows]
    return sortBy(rows, accessors[sort.key], sort.direction)
  }, [rows, accessors, sort])

  return {
    sorted,
    sortKey: sort?.key ?? null,
    sortDirection: sort?.direction ?? 'asc',
    requestSort,
  }
}
