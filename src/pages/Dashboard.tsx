import { useMemo, useState } from 'react'
import { TrendingUp, Receipt, ShoppingCart, Layers } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import KpiCard from '@/components/ui/KpiCard'
import { useVentasDiarias } from '@/hooks/useVentasDiarias'
import { useVentasSemanales } from '@/hooks/useVentasSemanales'
import { formatCurrency } from '@/lib/utils'

function SkeletonCard() {
  return <div className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse" />
}

export default function Dashboard() {
  const [chartDays, setChartDays] = useState<7 | 30 | 90>(30)
  const { ventasDiarias, baseline, today, loading: loadingDiarias } = useVentasDiarias(chartDays)
  const { ventas: semanales, loading: loadingSemanales } = useVentasSemanales(8)

  const loading = loadingDiarias || loadingSemanales

  const dailyChartData = useMemo(
    () =>
      ventasDiarias.map((v) => {
        const b = baseline.find((b) => b.fecha === v.fecha)
        return {
          fecha: format(parseISO(v.fecha), 'dd/MM', { locale: es }),
          Ventas: v.ventas_brutas,
          'Prom. 28d': b?.promedio_28d ?? null,
        }
      }),
    [ventasDiarias, baseline],
  )

  const weeklyChartData = useMemo(
    () =>
      semanales.map((v) => ({
        semana: format(parseISO(v.semana_inicio), 'dd/MM', { locale: es }),
        Ventas: v.ventas_brutas,
        Comprobantes: v.comprobantes,
      })),
    [semanales],
  )

  const todayBaseline = today ? baseline.find((b) => b.fecha === today.fecha) : null
  const variacion =
    today && todayBaseline && todayBaseline.promedio_28d > 0
      ? ((today.ventas_brutas - todayBaseline.promedio_28d) / todayBaseline.promedio_28d) * 100
      : undefined

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 h-72 animate-pulse" />
          <div className="bg-white rounded-xl border border-gray-200 p-5 h-72 animate-pulse" />
        </div>
      </div>
    )
  }

  const fechaLabel = today
    ? format(parseISO(today.fecha), "EEEE d 'de' MMMM", { locale: es })
    : '—'

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Ventas — último día"
          value={today ? formatCurrency(today.ventas_brutas) : '—'}
          subtitle={fechaLabel}
          icon={TrendingUp}
          trend={variacion}
        />
        <KpiCard
          title="Ticket promedio"
          value={today ? formatCurrency(today.ticket_promedio) : '—'}
          subtitle={fechaLabel}
          icon={Receipt}
        />
        <KpiCard
          title="Comprobantes"
          value={today?.cantidad_comprobantes ?? '—'}
          subtitle={fechaLabel}
          icon={ShoppingCart}
        />
        <KpiCard
          title="Ítems vendidos"
          value={today?.cantidad_items ?? '—'}
          subtitle={fechaLabel}
          icon={Layers}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily sales area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-700">
              Ventas diarias — últimos {chartDays} días
            </h2>
            <div className="flex gap-1">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    chartDays === d
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Comparado con el promedio móvil de 28 días
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval={4} />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                width={52}
              />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
              />
              <Legend iconType="line" />
              <Area
                type="monotone"
                dataKey="Ventas"
                stroke="#f97316"
                fill="url(#gradVentas)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="Prom. 28d"
                stroke="#94a3b8"
                fill="none"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Ventas semanales</h2>
          <p className="text-xs text-gray-400 mb-4">Últimas 8 semanas</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={weeklyChartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10 }}
                width={48}
              />
              <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} />
              <Bar dataKey="Ventas" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
