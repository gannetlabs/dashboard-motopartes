export type SortDirection = 'asc' | 'desc'
export type Sortable = string | number | boolean | null | undefined

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })

/**
 * Compares two sortable values for ascending order.
 *
 * - Numbers and booleans compare numerically (false < true).
 * - Strings compare with a Spanish locale collator: numeric-aware
 *   ("9" < "10"), case- and accent-insensitive.
 * - null/undefined are treated as equal to each other; callers that need
 *   them grouped at the end of a list should use `sortBy`, which handles it.
 */
export function compareValues(a: Sortable, b: Sortable): number {
  const aMissing = a === null || a === undefined
  const bMissing = b === null || b === undefined
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1

  if (typeof a === 'string' && typeof b === 'string') {
    return collator.compare(a, b)
  }

  const an = typeof a === 'boolean' ? Number(a) : (a as number)
  const bn = typeof b === 'boolean' ? Number(b) : (b as number)
  return an - bn
}

/**
 * Returns a new array sorted by the value produced by `getValue`. Stable for
 * equal keys, and always keeps null/undefined values last regardless of
 * direction. Never mutates the input.
 */
export function sortBy<T>(
  rows: readonly T[],
  getValue: (row: T) => Sortable,
  direction: SortDirection,
): T[] {
  const present: { row: T; index: number; value: Sortable }[] = []
  const missing: { row: T; index: number }[] = []

  rows.forEach((row, index) => {
    const value = getValue(row)
    if (value === null || value === undefined) missing.push({ row, index })
    else present.push({ row, index, value })
  })

  present.sort((a, b) => {
    const cmp = compareValues(a.value, b.value)
    if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
    return a.index - b.index // stable tiebreaker
  })

  return [...present.map((p) => p.row), ...missing.map((m) => m.row)]
}
