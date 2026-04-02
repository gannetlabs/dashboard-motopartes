import { useMemo } from 'react'
import { TrendingUp, DollarSign, Percent, Award } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import KpiCard from '@/components/ui/KpiCard'
import { useVentasSemanales } from '@/hooks/useVentasSemanales'
import { useDetalleVentas, computeProductoStats } from '@/hooks/useDetalleVentas'
import { useProductos } from '@/hooks/useProductos'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function Reportes() {
  const { ventas: semanales, baseline: baselineS, loading: loadingSemanales } =
    useVentasSemanales(12)
  const { detalles, loading: loadingDetalles } = useDetalleVentas()
  const { productos, loading: loadingProductos } = useProductos()

  const loading = loadingSemanales || loadingDetalles || loadingProductos

  // Weekly chart: actual vs baseline
  const weeklyChart = useMemo(
    () =>
      semanales.map((v) => {
        const b = baselineS.find((b) => b.semana_inicio === v.semana_inicio)
        return {
          semana: format(parseISO(v.semana_inicio), "'S' w · dd/MM", { locale: es }),
          Ventas: v.ventas_brutas,
          Baseline: b?.promedio_8s ?? null,
        }
      }),
    [semanales, baselineS],
  )

  // Margin by rubro
  const margenRubroChart = useMemo(() => {
    const rubroMap = new Map<string, { ingresos: number; costo: number }>()

    // Build cod_item → rubro map
    const rubroByItem = new Map<string, string>()
    for (const p of productos) {
      rubroByItem.set(p.cod_item, p.rubro_nombre ?? 'Sin rubro')
    }

    for (const d of detalles) {
      const rubro = rubroByItem.get(d.cod_item) ?? 'Sin rubro'
      const ingresos =
        d.precio_unitario * d.cantidad * (1 - (d.porc_descuento ?? 0) / 100)
      const costo = (d.costo_unitario ?? 0) * d.cantidad
      const existing = rubroMap.get(rubro)
      if (!existing) {
        rubroMap.set(rubro, { ingresos, costo })
      } else {
        existing.ingresos += ingresos
        existing.costo += costo
      }
    }

    return Array.from(rubroMap.entries())
      .map(([rubro, { ingresos, costo }]) => ({
        rubro: rubro.length > 20 ? rubro.slice(0, 20) + '…' : rubro,
        margenPct: ingresos > 0 ? ((ingresos - costo) / ingresos) * 100 : 0,
        ingresos,
        margenARS: ingresos - costo,
      }))
      .filter((r) => r.ingresos > 0)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 12)
  }, [detalles, productos])

  // Top 10 by margin ARS
  const top10Margen = useMemo(
    () => computeProductoStats(detalles).slice(0, 10),
    [detalles],
  )

  // Global KPIs
  const globalKpis = useMemo(() => {
    const totalIngresos = detalles.reduce(
      (s, d) =>
        s + d.precio_unitario * d.cantidad * (1 - (d.porc_descuento ?? 0) / 100),
      0,
    )
    const totalCosto = detalles.reduce(
      (s, d) => s + (d.costo_unitario ?? 0) * d.cantidad,
      0,
    )
    const margenTotal = totalIngresos - totalCosto
    const margenPct = totalIngresos > 0 ? (margenTotal / totalIngresos) * 100 : 0
    const totalUnidades = detalles.reduce((s, d) => s + d.cantidad, 0)
    return { totalIngresos, margenTotal, margenPct, totalUnidades }
  }, [detalles])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ingresos totales"
          value={formatCurrency(globalKpis.totalIngresos)}
          subtitle="Historial completo"
          icon={TrendingUp}
        />
        <KpiCard
          title="Margen bruto total"
          value={formatCurrency(globalKpis.margenTotal)}
          subtitle="Precio − costo"
          icon={DollarSign}
        />
        <KpiCard
          title="Margen bruto %"
          value={`${globalKpis.margenPct.toFixed(1)}%`}
          subtitle="Sobre ingresos"
          icon={Percent}
        />
        <KpiCard
          title="Unidades vendidas"
          value={formatNumber(globalKpis.totalUnidades)}
          subtitle="Historial completo"
          icon={Award}
        />
      </div>

      {/* Weekly vs baseline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Ventas semanales vs. baseline histórico
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Últimas 12 semanas comparadas con el promedio de las 8 semanas anteriores
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weeklyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="semana" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={40} />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11 }}
              width={52}
            />
            <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} />
            <Legend />
            <Bar dataKey="Ventas" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Baseline" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Margin by rubro */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Margen bruto por rubro
        </h2>
        <p className="text-xs text-gray-400 mb-4">% sobre ingresos · top 12 rubros por volumen</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={margenRubroChart}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fontSize: 11 }}
              domain={[0, 60]}
            />
            <YAxis type="category" dataKey="rubro" tick={{ fontSize: 10 }} width={165} />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === 'Margen %' ? [`${v.toFixed(1)}%`, name] : [formatCurrency(v), name]
              }
            />
            <ReferenceLine x={20} stroke="#f97316" strokeDasharray="4 4" opacity={0.5} />
            <Bar
              dataKey="margenPct"
              name="Margen %"
              fill="#f97316"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 by margin ARS */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Top 10 productos por margen bruto
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Historial completo · Precio − costo</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-8">#</th>
                <th className="px-4 py-3 text-left font-medium">Producto</th>
                <th className="px-4 py-3 text-right font-medium">Uds.</th>
                <th className="px-4 py-3 text-right font-medium">Ingresos</th>
                <th className="px-4 py-3 text-right font-medium">Margen ARS</th>
                <th className="px-4 py-3 text-right font-medium">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {top10Margen.map((p, i) => (
                <tr key={p.cod_item} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 text-xs leading-tight">
                      {p.descripcion}
                    </p>
                    <p className="text-gray-400 font-mono text-xs mt-0.5">{p.cod_item}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatNumber(p.unidades)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(p.ingresos)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(p.margen)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-xs font-medium ${
                        p.margenPct >= 20 ? 'text-green-600' : 'text-amber-600'
                      }`}
                    >
                      {p.margenPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
