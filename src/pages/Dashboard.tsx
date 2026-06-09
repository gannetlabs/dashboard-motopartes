import { useMemo, useState } from 'react'
import { TrendingUp, Receipt, ShoppingCart, Layers } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  ComposedChart,
  Bar,
  Line,
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
import SegmentedControl from '@/components/ui/SegmentedControl'
import { CardSkeleton, KpiGridSkeleton } from '@/components/ui/Skeleton'
import { useVentasDiarias } from '@/hooks/useVentasDiarias'
import { useVentasSemanales } from '@/hooks/useVentasSemanales'
import { useVentasHorarias } from '@/hooks/useVentasHorarias'
import { formatCurrency } from '@/lib/utils'

// ─── Gráfico diario aislado ──────────────────────────────────────────────────
// Maneja su propio estado de período y su propio fetch, de modo que al
// cambiar el período solo se re-renderiza este componente.
function DailyChartCard() {
  const [chartDays, setChartDays] = useState<7 | 30 | 90>(30)
  const { ventasDiarias, baseline, loading } = useVentasDiarias(chartDays)

  const chartData = useMemo(
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

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-700">
          Ventas diarias — últimos {chartDays} días
        </h2>
        <SegmentedControl<7 | 30 | 90>
          options={[
            { label: '7d', value: 7 },
            { label: '30d', value: 30 },
            { label: '90d', value: 90 },
          ]}
          value={chartDays}
          onChange={setChartDays}
          aria-label="Período del gráfico diario"
        />
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Comparado con el promedio móvil de 28 días
      </p>
      {loading ? (
        <div className="h-60 animate-pulse bg-gray-50 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
            <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} />
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
      )}
    </div>
  )
}

// ─── Gráfico semanal aislado ──────────────────────────────────────────────────
function WeeklyChartCard() {
  const [weeks, setWeeks] = useState<8 | 16 | 32>(8)
  const { ventas: semanales, baseline, loading } = useVentasSemanales(weeks)

  const { chartData, trendColor } = useMemo(() => {
    const n = semanales.length
    if (n === 0) return { chartData: [], trendColor: '#22c55e' }

    // Regresión lineal (mínimos cuadrados)
    const sumX = (n * (n - 1)) / 2
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
    const sumY = semanales.reduce((s, v) => s + v.ventas_brutas, 0)
    const sumXY = semanales.reduce((s, v, i) => s + i * v.ventas_brutas, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    const data = semanales.map((v, i) => {
      const b = baseline.find((b) => b.semana_inicio === v.semana_inicio)
      return {
        semana: format(parseISO(v.semana_inicio), 'dd/MM', { locale: es }),
        Ventas: v.ventas_brutas,
        Baseline: b?.promedio_8s ?? null,
        Tendencia: Math.round(intercept + slope * i),
      }
    })

    return {
      chartData: data,
      trendColor: slope >= 0 ? '#22c55e' : '#ef4444',
    }
  }, [semanales, baseline])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-700">Ventas semanales</h2>
        <SegmentedControl<8 | 16 | 32>
          options={[
            { label: '8s', value: 8 },
            { label: '16s', value: 16 },
            { label: '32s', value: 32 },
          ]}
          value={weeks}
          onChange={setWeeks}
          aria-label="Cantidad de semanas"
        />
      </div>
      <p className="text-xs text-gray-400 mb-4">Últimas {weeks} semanas</p>
      {loading ? (
        <div className="h-60 animate-pulse bg-gray-50 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="semana" tick={{ fontSize: 10 }} interval={weeks > 16 ? 3 : 0} />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10 }}
              width={48}
            />
            <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} />
            <Legend />
            <Bar dataKey="Ventas" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="Baseline"
              name="Promedio histórico"
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="Tendencia"
              stroke={trendColor}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Gráfico por hora del día aislado ────────────────────────────────────────
// Muestra la distribución horaria de ventas (cantidad o monto) promediada por
// día en el período seleccionado. Útil para decisiones de RRHH (turnos).
function HourlyChartCard() {
  const [chartDays, setChartDays] = useState<7 | 30 | 90>(30)
  const [metrica, setMetrica] = useState<'cantidad' | 'monto'>('cantidad')
  const { data, loading } = useVentasHorarias(chartDays)

  const { chartData, pico, valle } = useMemo(() => {
    const key = metrica === 'cantidad' ? 'promedioCantidad' : 'promedioMonto'
    const activas = data.filter((d) => d.cantidad > 0)
    const pico = activas.reduce<typeof activas[number] | null>(
      (best, d) => (!best || d[key] > best[key] ? d : best),
      null,
    )
    const valle = activas.reduce<typeof activas[number] | null>(
      (worst, d) => (!worst || d[key] < worst[key] ? d : worst),
      null,
    )
    const chartData = data.map((d) => ({
      horaLabel: d.horaLabel,
      valor: d[key],
      promedioCantidad: d.promedioCantidad,
      promedioMonto: d.promedioMonto,
    }))
    return { chartData, pico, valle }
  }, [data, metrica])

  const formatPromCantidad = (v: number) => `${v.toFixed(1)} v/día`
  const formatPromMonto = (v: number) => formatCurrency(Math.round(v))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700">
          Ventas por hora del día
        </h2>
        <div className="flex items-center gap-3">
          <SegmentedControl<'cantidad' | 'monto'>
            options={[
              { label: 'Cantidad', value: 'cantidad' },
              { label: 'Monto', value: 'monto' },
            ]}
            value={metrica}
            onChange={setMetrica}
            aria-label="Métrica"
          />
          <SegmentedControl<7 | 30 | 90>
            options={[
              { label: '7d', value: 7 },
              { label: '30d', value: 30 },
              { label: '90d', value: 90 },
            ]}
            value={chartDays}
            onChange={setChartDays}
            aria-label="Período del gráfico horario"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Promedio por día en los últimos {chartDays} días (hora Argentina)
        {pico && valle && (
          <>
            {' · '}
            <span className="text-gray-600 font-medium">
              Pico: {pico.horaLabel} (
              {metrica === 'cantidad'
                ? formatPromCantidad(pico.promedioCantidad)
                : formatPromMonto(pico.promedioMonto)}
              )
            </span>
            {' · '}
            <span className="text-gray-600 font-medium">
              Valle: {valle.horaLabel} (
              {metrica === 'cantidad'
                ? formatPromCantidad(valle.promedioCantidad)
                : formatPromMonto(valle.promedioMonto)}
              )
            </span>
          </>
        )}
      </p>
      {loading ? (
        <div className="h-60 animate-pulse bg-gray-50 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="horaLabel" tick={{ fontSize: 10 }} interval={1} />
            <YAxis
              tickFormatter={(v: number) =>
                metrica === 'cantidad'
                  ? v.toFixed(v < 10 ? 1 : 0)
                  : `$${(v / 1000).toFixed(0)}k`
              }
              tick={{ fontSize: 11 }}
              width={52}
            />
            <Tooltip
              formatter={(_v: number, _name: string, item) => {
                const payload = item.payload as {
                  promedioCantidad: number
                  promedioMonto: number
                }
                if (metrica === 'cantidad') {
                  return [
                    `${payload.promedioCantidad.toFixed(1)} ventas/día · ${formatCurrency(
                      Math.round(payload.promedioMonto),
                    )}/día`,
                    'Promedio',
                  ]
                }
                return [
                  `${formatCurrency(Math.round(payload.promedioMonto))}/día · ${payload.promedioCantidad.toFixed(
                    1,
                  )} ventas/día`,
                  'Promedio',
                ]
              }}
              labelFormatter={(label: string) => `Hora ${label}`}
            />
            <Bar dataKey="valor" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Dashboard principal ─────────────────────────────────────────────────────
export default function Dashboard() {
  // Fetch fijo para KPIs — nunca cambia al interactuar con los gráficos
  const { today, baseline, loading: loadingKpis } = useVentasDiarias(30)

  const todayBaseline = today ? baseline.find((b) => b.fecha === today.fecha) : null
  const variacion =
    today && todayBaseline && todayBaseline.promedio_28d > 0
      ? ((today.ventas_brutas - todayBaseline.promedio_28d) / todayBaseline.promedio_28d) * 100
      : undefined

  const loading = loadingKpis

  if (loading) {
    return (
      <div className="space-y-6">
        <KpiGridSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton className="lg:col-span-2 p-5 h-72" />
          <CardSkeleton className="p-5 h-72" />
        </div>
      </div>
    )
  }

  const fechaLabel = today
    ? format(parseISO(today.fecha), "EEEE d 'de' MMMM", { locale: es })
    : '—'

  return (
    <div className="space-y-6">
      {/* KPI Cards — no se ven afectadas por el selector del gráfico */}
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
        {/* Gráfico diario aislado — solo este componente re-renderiza al cambiar período */}
        <DailyChartCard />

        {/* Gráfico semanal aislado — solo este componente re-renderiza al cambiar período */}
        <WeeklyChartCard />
      </div>

      {/* Gráfico horario aislado — ancho completo para aprovechar las 24 barras */}
      <HourlyChartCard />
    </div>
  )
}
