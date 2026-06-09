import { cn } from '@/lib/utils'

/** A single pulsing placeholder card. Pass `className` to set height/padding. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 animate-pulse',
        className,
      )}
    />
  )
}

/** The 4-up KPI card row skeleton shared by every page's loading state. */
export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} className="p-5 h-28" />
      ))}
    </div>
  )
}
