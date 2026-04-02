import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  className?: string
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel = 'vs promedio 28d',
  className,
}: KpiCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4', className)}>
      <div className="p-2.5 bg-primary-50 rounded-lg">
        <Icon size={22} className="text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {trend !== undefined && (
          <p className={cn('text-xs mt-1 font-medium', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% {trendLabel}
          </p>
        )}
      </div>
    </div>
  )
}
