import { useState, useMemo } from 'react'
import { Package, CheckCircle, Layers, Search } from 'lucide-react'
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
import { formatNumber } from '@/lib/utils'

export default function Productos() {
  const { productos, loading } = useProductos()
  const [search, setSearch] = useState('')
  const [rubroFilter, setRubroFilter] = useState('Todos')

  const rubros = useMemo(() => {
    const set = new Set<string>()
    for (const p of productos) {
      if (p.rubro_nombre) set.add(p.rubro_nombre)
    }
    return ['Todos', ...Array.from(set).sort()]
  }, [productos])

  const rubrosChart = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of productos) {
      const r = p.rubro_nombre ?? 'Sin rubro'
      map.set(r, (map.get(r) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([rubro, cantidad]) => ({ rubro, cantidad }))
  }, [productos])

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      const matchRubro = rubroFilter === 'Todos' || p.rubro_nombre === rubroFilter
      const matchSearch =
        !search ||
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.cod_item.toLowerCase().includes(search.toLowerCase())
      return matchRubro && matchSearch
    })
  }, [productos, search, rubroFilter])

  const kpis = useMemo(() => {
    const total = productos.length
    const habilitados = productos.filter((p) => p.habilitado).length
    const rubrosDistintos = new Set(productos.map((p) => p.rubro_nombre).filter(Boolean)).size
    const conMarca = productos.filter((p) => p.marca_nombre).length
    return { total, habilitados, rubrosDistintos, conMarca }
  }, [productos])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total productos"
          value={formatNumber(kpis.total)}
          subtitle="En catálogo"
          icon={Package}
        />
        <KpiCard
          title="Habilitados"
          value={formatNumber(kpis.habilitados)}
          subtitle={`${Math.round((kpis.habilitados / kpis.total) * 100)}% del catálogo`}
          icon={CheckCircle}
        />
        <KpiCard
          title="Rubros"
          value={kpis.rubrosDistintos}
          subtitle="Categorías distintas"
          icon={Layers}
        />
        <KpiCard
          title="Con marca"
          value={formatNumber(kpis.conMarca)}
          subtitle="Productos con marca asignada"
          icon={Package}
        />
      </div>

      {/* Rubro chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Productos por rubro
        </h2>
        <p className="text-xs text-gray-400 mb-4">Top 12 rubros por cantidad de ítems</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={rubrosChart}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="rubro"
              tick={{ fontSize: 10 }}
              width={160}
            />
            <Tooltip />
            <Bar dataKey="cantidad" name="Productos" fill="#f97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <select
            value={rubroFilter}
            onChange={(e) => setRubroFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {rubros.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{filtered.length} productos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Código</th>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Rubro</th>
                <th className="px-4 py-3 text-left font-medium">Marca</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.slice(0, 200).map((p) => (
                <tr key={p.cod_item} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">{p.cod_item}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{p.rubro_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.marca_nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        p.habilitado
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {p.habilitado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-50">
              Mostrando 200 de {filtered.length} productos. Usá el filtro para refinar.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
