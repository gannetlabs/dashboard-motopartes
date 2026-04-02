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
import { TrendingUp, Receipt, ShoppingCart, Tag } from 'lucide-react'
import KpiCard from '@/components/ui/KpiCard'
import { useVentasDiarias } from '@/hooks/useVentasDiarias'
import { useFacturas } from '@/hooks/useFacturas'
import { formatCurrency } from '@/lib/utils'

type Period = 7 | 30 | 90
const PERIODS: { label: string; days: Period }[] = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
]

export default function Ventas() {
  const [period, setPeriod] = useState<Period>(30)

  const { ventasDiarias, baseline, loading: loadingDiarias } = useVentasDiarias(period)

  const fromDate = useMemo(
    () => subDays(new Date(), period).toISOString().split('T')[0],
    [period],
  )
  const { facturas, loading: loadingFacturas } = useFacturas({ limit: 200, from: fromDate })

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
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            onClick={() => setPeriod(p.days)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.days
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

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

      {/* Chart */}
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

      {/* Facturas table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Facturas del período</h2>
          <span className="text-xs text-gray-400">{facturas.length} registros</span>
        </div>
        {loadingFacturas ? (
          <div className="p-8 animate-pulse bg-gray-50 rounded-b-xl h-40" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Comprobante</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium">Gravado</th>
                  <th className="px-4 py-3 text-right font-medium">IVA</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {facturas.map((f) => (
                  <tr key={f.id_factura} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600">
                      {format(parseISO(f.fecha_factura), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700 text-xs">
                      {f.tipo_comprobante} {f.letra_comprobante}{' '}
                      {String(f.nro_comprobante).padStart(8, '0')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          f.tipo_comprobante === 'FACTURA'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {f.tipo_comprobante === 'NOTA_CREDITO' ? 'N/C' : f.tipo_comprobante}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(f.monto_gravado)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatCurrency(f.monto_iva)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(f.total_factura)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
