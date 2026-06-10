import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortDirection } from '@/lib/sort'

interface SortableHeaderProps<K extends string> {
  label: string
  columnKey: K
  sortKey: K | null
  sortDirection: SortDirection
  onSort: (key: K) => void
  align?: 'left' | 'right' | 'center'
}

/**
 * Clickable, accessible table header that drives `useSortableData`. Renders a
 * real <th> (so it keeps `aria-sort`) wrapping a native <button>, which gives
 * keyboard activation for free — the same approach as SegmentedControl.
 */
export default function SortableHeader<K extends string>({
  label,
  columnKey,
  sortKey,
  sortDirection,
  onSort,
  align = 'left',
}: SortableHeaderProps<K>) {
  const active = sortKey === columnKey
  const ariaSort = active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <th
      aria-sort={ariaSort}
      className={cn(
        'px-4 py-3 font-medium',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
      )}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-gray-700',
          align === 'right' ? 'flex-row-reverse' : '',
          active ? 'text-gray-700' : '',
        )}
      >
        {label}
        {active ? (
          sortDirection === 'asc' ? (
            <ArrowUp size={13} className="text-primary-600" aria-hidden="true" />
          ) : (
            <ArrowDown size={13} className="text-primary-600" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown size={13} className="text-gray-300" aria-hidden="true" />
        )}
      </button>
    </th>
  )
}
