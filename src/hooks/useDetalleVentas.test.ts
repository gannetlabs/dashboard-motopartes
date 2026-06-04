import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeProductoStats, type DetalleConFecha } from './useDetalleVentas'

// Factory: a DetalleConFecha with sensible defaults, override per test.
function detalle(overrides: Partial<DetalleConFecha> = {}): DetalleConFecha {
  return {
    id_detalle: 1,
    id_factura: 1,
    cod_item: 'A',
    descripcion_item: 'Producto A',
    cantidad: 1,
    precio_unitario: 100,
    porc_iva: 21,
    porc_descuento: 0,
    costo_unitario: 60,
    moneda: 'ARS',
    cotizacion_moneda: 1,
    cotizacion_dolar: 1,
    id_lista_precio: null,
    fecha_factura: '2026-06-01',
    ...overrides,
  }
}

describe('computeProductoStats', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('aggregates multiple lines of the same product', () => {
    const stats = computeProductoStats([
      detalle({ cod_item: 'A', cantidad: 2, id_detalle: 1 }),
      detalle({ cod_item: 'A', cantidad: 3, id_detalle: 2 }),
    ])

    expect(stats).toHaveLength(1)
    expect(stats[0].cod_item).toBe('A')
    expect(stats[0].unidades).toBe(5)
    expect(stats[0].numFacturas).toBe(2)
  })

  it('computes revenue, cost and margin correctly', () => {
    // 2 uds * $100 = $200 ingresos; 2 * $60 = $120 costo; margen $80 = 40%
    const [stat] = computeProductoStats([
      detalle({ cantidad: 2, precio_unitario: 100, costo_unitario: 60 }),
    ])

    expect(stat.ingresos).toBe(200)
    expect(stat.costo).toBe(120)
    expect(stat.margen).toBe(80)
    expect(stat.margenPct).toBeCloseTo(40)
  })

  it('applies the line discount to revenue', () => {
    // $100 * 1 ud con 10% descuento = $90
    const [stat] = computeProductoStats([
      detalle({ precio_unitario: 100, cantidad: 1, porc_descuento: 10 }),
    ])

    expect(stat.ingresos).toBeCloseTo(90)
  })

  it('sorts products by revenue descending', () => {
    const stats = computeProductoStats([
      detalle({ cod_item: 'LOW', precio_unitario: 10, cantidad: 1 }),
      detalle({ cod_item: 'HIGH', precio_unitario: 1000, cantidad: 1 }),
    ])

    expect(stats.map((s) => s.cod_item)).toEqual(['HIGH', 'LOW'])
  })

  it('keeps the latest sale date per product', () => {
    const [stat] = computeProductoStats([
      detalle({ cod_item: 'A', fecha_factura: '2026-05-01', id_detalle: 1 }),
      detalle({ cod_item: 'A', fecha_factura: '2026-06-03', id_detalle: 2 }),
    ])

    expect(stat.ultimaVenta).toBe('2026-06-03')
  })

  it('excludes rows older than the `days` window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T12:00:00Z'))

    const stats = computeProductoStats(
      [
        detalle({ cod_item: 'RECENT', fecha_factura: '2026-06-01' }),
        detalle({ cod_item: 'OLD', fecha_factura: '2020-01-01' }),
      ],
      30,
    )

    expect(stats.map((s) => s.cod_item)).toEqual(['RECENT'])
  })

  it('returns an empty array for no input', () => {
    expect(computeProductoStats([])).toEqual([])
  })
})
