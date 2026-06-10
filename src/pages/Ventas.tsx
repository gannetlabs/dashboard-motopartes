import { useState, useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, Receipt, ShoppingCart, Tag, FileX2 } from 'lucide-react'
import KpiCard from '@/components/ui/KpiCard'
import SegmentedControl from '@/components/ui/SegmentedControl'
import SortableHeader from '@/components/ui/SortableHeader'
import { useVentasDiarias } from '@/hooks/useVentasDiarias'
import { useFacturas } from '@/hooks/useFacturas'
import { useDetalleVentas, computeProductoStats } from '@/hooks/useDetalleVentas'
import { useProductos } from '@/hooks/useProductos'
import { useSortableData, type Accessors } from '@/hooks/useSortableData'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { DetalleConFecha, ProductoStats } from '@/hooks/useDetalleVentas'
import type { Producto, Factura, VentaDiaria } from '@/types'

type Period = 7 | 30 | 90
const PERIODS: { label: string; days: Period }[] = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
]

type TopProductoColumn = 'descripcion' | 'unidades' | 'ingresos' | 'margenPct'
const topProductoAccessors: Accessors<ProductoStats, TopProductoColumn> = {
  descripcion: (p) => p.descripcion,
  unidades: (p) => p.unidades,
  ingresos: (p) => p.ingresos,
  margenPct: (p) => p.margenPct,
}

// ─── Top 10 Productos del período ─────────────────────────────────────────────
function TopProductosCard({
  detalles,
  period,
  loading,
}: {
  detalles: DetalleConFecha[]
  period: Period
  loading: boolean
}) {
  const top10 = useMemo(
    () => computeProductoStats(detalles, period).slice(0, 10),
    [detalles, period],
  )
  const { sorted, sortKey, sortDirection, requestSort } = useSortableData(
    top10,
    topProductoAccessors,
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">
          Top Productos del período
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Productos que más ingresos generaron en el período. Usalo para identificar tus productos estrella y asegurar su stock.
        </p>
      </div>
      {loading ? (
        <div className="p-5 h-64 animate-pulse bg-gray-50 rounded-b-xl" />
      ) : top10.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">Sin datos en el período</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-8">#</th>
                <SortableHeader label="Producto" columnKey="descripcion" sortKey={sortKey} sortDirection={sortDirection} onSort={requestSort} />
                <SortableHeader label="Uds." columnKey="unidades" sortKey={sortKey} sortDirection={sortDirection} onSort={requestSort} align="right" />
                <SortableHeader label="Ingresos" columnKey="ingresos" sortKey={sortKey} sortDirection={sortDirection} onSort={requestSort} align="right" />
                <SortableHeader label="Margen %" columnKey="margenPct" sortKey={sortKey} sortDirection={sortDirection} onSort={requestSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((p, i) => (
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
      )}
    </div>
  )
}

// ─── Composición de ventas por Rubro ──────────────────────────────────────────
function ComposicionRubroCard({
  detalles,
  productos,
  period,
  loading,
}: {
  detalles: DetalleConFecha[]
  productos: Producto[]
  period: Period
  loading: boolean
}) {
  const rubroData = useMemo(() => {
    const cutoff = new Date(Date.now() - period * 86400000)
    const rubroByItem = new Map<string, string>()
    for (const p of productos) {
      rubroByItem.set(p.cod_item, p.rubro_nombre ?? 'Sin rubro')
    }

    const rubroMap = new Map<string, number>()
    let total = 0
    for (const d of detalles) {
      if (new Date(d.fecha_factura) < cutoff) continue
      const ingresos =
        d.precio_unitario * d.cantidad * (1 - d.porc_descuento / 100)
      const rubro = rubroByItem.get(d.cod_item) ?? 'Sin rubro'
      rubroMap.set(rubro, (rubroMap.get(rubro) ?? 0) + ingresos)
      total += ingresos
    }

    return Array.from(rubroMap.entries())
      .map(([rubro, ingresos]) => ({
        rubro: rubro.length > 20 ? rubro.slice(0, 20) + '…' : rubro,
        porcentaje: total > 0 ? (ingresos / total) * 100 : 0,
        ingresos,
      }))
      .filter((r) => r.ingresos > 0)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 8)
  }, [detalles, productos, period])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-0.5">
        Composición por Rubro
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Distribución de ventas por categoría. Te ayuda a ver en qué rubros se concentra tu facturación y detectar oportunidades de diversificación.
      </p>
      {loading ? (
        <div className="h-64 animate-pulse bg-gray-50 rounded-lg" />
      ) : rubroData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">Sin datos</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={rubroData}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fontSize: 11 }}
              domain={[0, 'auto']}
            />
            <YAxis type="category" dataKey="rubro" tick={{ fontSize: 10 }} width={150} />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'Participación']}
            />
            <Bar dataKey="porcentaje" name="Participación" fill="#f97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Distribución de Tickets ──────────────────────────────────────────────────
function DistribucionTicketsCard({
  facturas,
  loading,
}: {
  facturas: Factura[]
  loading: boolean
}) {
  const histogramData = useMemo(() => {
    const soloFacturas = facturas.filter(
      (f) => f.tipo_comprobante !== 'NOTA_CREDITO',
    )
    const ranges = [
      { label: '<$5k', min: 0, max: 5000 },
      { label: '$5k-$15k', min: 5000, max: 15000 },
      { label: '$15k-$50k', min: 15000, max: 50000 },
      { label: '$50k-$100k', min: 50000, max: 100000 },
      { label: '>$100k', min: 100000, max: Infinity },
    ]
    return ranges.map((r) => ({
      rango: r.label,
      cantidad: soloFacturas.filter(
        (f) => f.total_factura >= r.min && f.total_factura < r.max,
      ).length,
    }))
  }, [facturas])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-0.5">
        Distribución de Tickets
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Cómo se distribuyen tus ventas por monto. Si tenés muchas ventas chicas, podés pensar en estrategias para aumentar el ticket promedio.
      </p>
      {loading ? (
        <div className="h-52 animate-pulse bg-gray-50 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={histogramData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip
              formatter={(v: number) => [formatNumber(v), 'Facturas']}
            />
            <Bar dataKey="cantidad" name="Facturas" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Ventas por Día de la Semana ──────────────────────────────────────────────
function VentasPorDiaCard({
  ventasDiarias,
  loading,
}: {
  ventasDiarias: VentaDiaria[]
  loading: boolean
}) {
  const dayData = useMemo(() => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const sums = new Array(7).fill(0)
    const counts = new Array(7).fill(0)

    for (const v of ventasDiarias) {
      const day = parseISO(v.fecha).getDay()
      sums[day] += v.ventas_brutas
      counts[day] += 1
    }

    // Reorder to start from Monday
    const ordered = [1, 2, 3, 4, 5, 6, 0]
    return ordered.map((d) => ({
      dia: dayNames[d],
      promedio: counts[d] > 0 ? Math.round(sums[d] / counts[d]) : 0,
    }))
  }, [ventasDiarias])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-0.5">
        Ventas por Día de la Semana
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Promedio de ventas según el día de la semana. Útil para planificar personal, stock y promociones en los días de mayor y menor actividad.
      </p>
      {loading ? (
        <div className="h-52 animate-pulse bg-gray-50 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dayData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11 }}
              width={52}
            />
            <Tooltip
              formatter={(v: number) => [formatCurrency(v), 'Promedio']}
            />
            <Bar dataKey="promedio" name="Promedio" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Notas de Crédito ─────────────────────────────────────────────────────────
function NotasCreditoCard({
  facturas,
  loading,
}: {
  facturas: Factura[]
  loading: boolean
}) {
  const ncStats = useMemo(() => {
    const facs = facturas.filter((f) => f.tipo_comprobante !== 'NOTA_CREDITO')
    const ncs = facturas.filter((f) => f.tipo_comprobante === 'NOTA_CREDITO')
    const totalFac = facs.reduce((s, f) => s + f.total_factura, 0)
    const totalNC = ncs.reduce((s, f) => s + f.total_factura, 0)
    const ratio = totalFac > 0 ? (totalNC / totalFac) * 100 : 0
    return {
      cantidadNC: ncs.length,
      montoNC: totalNC,
      cantidadFac: facs.length,
      montoFac: totalFac,
      ratio,
    }
  }, [facturas])

  const ratioColor =
    ncStats.ratio < 5
      ? 'text-green-600 bg-green-50'
      : ncStats.ratio < 10
        ? 'text-amber-600 bg-amber-50'
        : 'text-red-600 bg-red-50'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-gray-100 text-gray-500">
          <FileX2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-700 mb-0.5">
            Notas de Crédito
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Proporción de devoluciones sobre el total facturado. Un ratio alto puede indicar problemas de calidad o errores en la venta.
          </p>
          {loading ? (
            <div className="h-8 animate-pulse bg-gray-50 rounded" />
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-lg font-bold text-gray-900">
                  {ncStats.cantidadNC}
                </span>
                <span className="text-xs text-gray-400 ml-1">notas de crédito</span>
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(ncStats.montoNC)}
                </span>
                <span className="text-xs text-gray-400 ml-1">monto total NC</span>
              </div>
              <div>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-sm font-semibold ${ratioColor}`}
                >
                  {ncStats.ratio.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  sobre {formatCurrency(ncStats.montoFac)} facturado
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Ventas() {
  const [period, setPeriod] = useState<Period>(30)

  const { ventasDiarias, baseline, loading: loadingDiarias } = useVentasDiarias(period)

  const fromDate = useMemo(
    () => subDays(new Date(), period).toISOString().split('T')[0],
    [period],
  )
  const { facturas, loading: loadingFacturas } = useFacturas({ limit: 500, from: fromDate })
  const { detalles, loading: loadingDetalles } = useDetalleVentas()
  const { productos, loading: loadingProductos } = useProductos()

  const kpis = useMemo(() => {
    const total = ventasDiarias.reduce((s, v) => s + v.ventas_brutas, 0)
    const comprobantes = ventasDiarias.reduce((s, v) => s + v.cantidad_comprobantes, 0)
    const items = ventasDiarias.reduce((s, v) => s + v.cantidad_items, 0)
    const ticket = comprobantes > 0 ? total / comprobantes : 0
    return { total, comprobantes, items, ticket }
  }, [ventasDiarias])

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
    <div className="space-y-6">
      {/* Period selector */}
      <SegmentedControl<Period>
        options={PERIODS.map((p) => ({ label: p.label, value: p.days }))}
        value={period}
        onChange={setPeriod}
        size="md"
        aria-label="Período"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Ventas totales"
          value={formatCurrency(kpis.total)}
          subtitle={`Últimos ${period} días`}
          icon={TrendingUp}
        />
        <KpiCard
          title="Ticket promedio"
          value={formatCurrency(kpis.ticket)}
          subtitle="Por factura"
          icon={Tag}
        />
        <KpiCard
          title="Comprobantes"
          value={kpis.comprobantes}
          subtitle={`Últimos ${period} días`}
          icon={Receipt}
        />
        <KpiCard
          title="Ítems vendidos"
          value={kpis.items}
          subtitle={`Últimos ${period} días`}
          icon={ShoppingCart}
        />
      </div>

      {/* Daily chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Ventas diarias vs. promedio 28d
        </h2>
        <p className="text-xs text-gray-400 mb-4">Período seleccionado</p>
        {loadingDiarias ? (
          <div className="h-52 animate-pulse bg-gray-50 rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10 }}
                interval={period > 14 ? 3 : 0}
              />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                width={52}
              />
              <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} />
              <Legend />
              <Bar dataKey="Ventas" fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Prom. 28d" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Analytics Row 1: Top Productos + Composición por Rubro */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <TopProductosCard
            detalles={detalles}
            period={period}
            loading={loadingDetalles}
          />
        </div>
        <div className="lg:col-span-2">
          <ComposicionRubroCard
            detalles={detalles}
            productos={productos}
            period={period}
            loading={loadingDetalles || loadingProductos}
          />
        </div>
      </div>

      {/* Analytics Row 2: Distribución Tickets + Ventas por Día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistribucionTicketsCard facturas={facturas} loading={loadingFacturas} />
        <VentasPorDiaCard ventasDiarias={ventasDiarias} loading={loadingDiarias} />
      </div>

      {/* Analytics Row 3: Notas de Crédito */}
      <NotasCreditoCard facturas={facturas} loading={loadingFacturas} />
    </div>
  )
}
