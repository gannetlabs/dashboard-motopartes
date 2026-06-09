import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string | number> {
  label: string
  value: T
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  'aria-label'?: string
}

/**
 * Segmented button group for mutually-exclusive choices (period selectors,
 * metric toggles). Replaces the active/inactive ternary that was copy-pasted
 * across the charts and the Ventas page, and adds the `aria-pressed` state the
 * hand-rolled versions were missing.
 */
export default function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'sm',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex gap-1" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'font-medium transition-colors',
              size === 'md'
                ? 'px-4 py-2 rounded-lg text-sm'
                : 'px-2.5 py-1 rounded-md text-xs',
              active
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
