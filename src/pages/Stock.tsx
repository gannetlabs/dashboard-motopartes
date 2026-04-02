import { useState, useMemo } from 'react'
import { Package, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import KpiCard from '@/components/ui/KpiCard'
import { useProductos } from '@/hooks/useProductos'
import { useDetalleVentas, computeProductoStats } from '@/hooks/useDetalleVentas'
import { formatCurrency, formatNumber } from '@/lib/utils'

type FilterTab = 'todos' | 'activos' | 'lentos' | 'sin_movimiento'
const TABS: { key: FilterTab; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'activos', label: 'Con ventas 30d' },
  { key: 'lentos', label: 'Sin ventas 30–60d' },
  { key: 'sin_movimiento', label: 'Sin ventas 60d+' },
]

export default function Stock() {
  const { productos, loading: loadingProductos } = useProductos()
  const { detalles, loading: loadingDetalles } = useDetalleVentas()
  const [tab, setTab] = useState<FilterTab>('todos')

  const loading = loadingProductos || loadingDetalles

  // Stats per product (all time)
  const statsMap = useMemo(() => {
    const all = computeProductoStats(detalles)
    const map = new Map(all.map((s) => [s.cod_item, s]))
    return map
  }, [detalles])

  // Days since last sale for each product
  const today = new Date()
  const enriched = useMemo(() => {
    return productos
      .filter((p) => p.habilitado)
      .map((p) => {
        const stats = statsMap.get(p.cod_item)
        const daysSince = stats
          ? Math.floor(
              (today.getTime() - new Date(stats.ultimaVenta).getTime()) / 86400000,
            )
          : null
        return { ...p, stats, daysSince }
      })
  }, [productos, statsMap])

  // KPIs
  const kpis = useMemo(() => {
    const total = enriched.length
    const conVentas30 = enriched.filter((p) => p.daysSince !== null && p.daysSince <= 30).length
    const sinVentas30_60 = enriched.filter(
      (p) => p.daysSince !== null && p.daysSince > 30 && p.daysSince <= 60,
    ).length
    const sinVentas60 = enriched.filter(
      (p) => p.daysSince === null || p.daysSince > 60,
    ).length
    return { total, conVentas30, sinVentas30_60, sinVentas60 }
  }, [enriched])

  // Top 10 products by units sold (last 30 days)
  const top10Chart = useMemo(() => {
    return computeProductoStats(detalles, 30)
      .slice(0, 10)
      .map((s) => ({
        nombre: s.descripcion.length > 22 ? s.descripcion.slice(0, 22) + '…' : s.descripcion,
        Unidades: s.unidades,
        Ingresos: s.ingresos,
      }))
  }, [detalles])

  // Filtered table
  const tableData = useMemo(() => {
    let data = enriched
    if (tab === 'activos') data = data.filter((p) => p.daysSince !== null && p.daysSince <= 30)
    else if (tab === 'lentos')
      data = data.filter((p) => p.daysSince !== null && p.daysSince > 30 && p.daysSince <= 60)
    else if (tab === 'sin_movimiento')
      data = data.filter((p) => p.daysSince === null || p.daysSince > 60)
    return data.sort((a, b) => {
      if (a.daysSince === null && b.daysSince === null) return 0
      if (a.daysSince === null) return 1
      if (b.daysSince === null) return -1
      return b.daysSince - a.daysSince
    })
  }, [enriched, tab])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 h-64 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Productos activos"
          value={formatNumber(kpis.total)}
          subtitle="Habilitados en catálogo"
          icon={Package}
        />
        <KpiCard
          title="Con ventas (30d)"
          value={formatNumber(kpis.conVentas30)}
          subtitle={`${Math.round((kpis.conVentas30 / kpis.total) * 100)}% del catálogo activo`}
          icon={TrendingUp}
        />
        <KpiCard
          title="Rotación lenta (30–60d)"
          value={formatNumber(kpis.sinVentas30_60)}
          subtitle="Sin ventas entre 30 y 60 días"
          icon={Clock}
        />
        <KpiCard
          title="Sin movimiento (60d+)"
          value={formatNumber(kpis.sinVentas60)}
          subtitle="Sin ventas en más de 60 días"
          icon={AlertTriangle}
        />
      </div>

      {/* Top 10 por unidades vendidas */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Top 10 productos más vendidos — últimos 30 días
        </h2>
        <p className="text-xs text-gray-400 mb-4">Por unidades vendidas</p>
        {top10Chart.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={top10Chart}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fontSize: 10 }}
                width={175}
              />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === 'Ingresos' ? [formatCurrency(v), name] : [v, name]
                }
              />
              <Bar dataKey="Unidades" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rotation table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Rotación por producto
          </h2>
          <div className="flex gap-2 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400 self-center">
              {tableData.length} productos
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Producto</th>
                <th className="px-4 py-3 text-left font-medium">Rubro</th>
                <th className="px-4 py-3 text-right font-medium">Uds. vendidas</th>
                <th className="px-4 py-3 text-right font-medium">Ingresos total</th>
                <th className="px-4 py-3 text-right font-medium">Última venta</th>
                <th className="px-4 py-3 text-center font-medium">Rotación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tableData.slice(0, 150).map((p) => {
                const dias = p.daysSince
                let badge = { label: 'Sin ventas', color: 'bg-red-50 text-red-600' }
                if (dias !== null && dias <= 7)
                  badge = { label: 'Alta', color: 'bg-green-50 text-green-700' }
                else if (dias !== null && dias <= 30)
                  badge = { label: 'Normal', color: 'bg-blue-50 text-blue-600' }
                else if (dias !== null && dias <= 60)
                  badge = { label: 'Lenta', color: 'bg-yellow-50 text-yellow-700' }

                return (
                  <tr key={p.cod_item} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs leading-tight">{p.nombre}</p>
                      <p className="text-gray-400 font-mono text-xs mt-0.5">{p.cod_item}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.rubro_nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {p.stats ? formatNumber(p.stats.unidades) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {p.stats ? formatCurrency(p.stats.ingresos) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {p.stats ? (
                        <>
                          {p.stats.ultimaVenta}
                          {dias !== null && (
                            <span className="text-gray-400 ml-1">({dias}d)</span>
                          )}
                        </>
                      ) : (
                        'Nunca'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {tableData.length > 150 && (
            <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-50">
              Mostrando 150 de {tableData.length}. Filtrá por pestaña para ver más.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
