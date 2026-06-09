import { describe, it, expect } from 'vitest'
import { computeStockCritico } from './useProductosStock'
import type { ProductoStock } from '@/types'
import type { ProductoStats } from './useDetalleVentas'

function stockRow(overrides: Partial<ProductoStock> = {}): ProductoStock {
  return {
    cod_item: 'A',
    stock_disponible: 5,
    stock_real: 5,
    stock_reservado: 0,
    deposito_id: 19539,
    actualizado_at: '2026-06-05',
    ...overrides,
  }
}

function stats(cod_item: string, unidades: number): ProductoStats {
  return {
    cod_item,
    descripcion: `Producto ${cod_item}`,
    unidades,
    ingresos: 0,
    costo: 0,
    margen: 0,
    margenPct: 0,
    numFacturas: 1,
    ultimaVenta: '2026-06-01',
  }
}

// Helper: build the stats map keyed by cod_item.
function statsMap(...entries: ProductoStats[]) {
  return new Map(entries.map((s) => [s.cod_item, s]))
}

describe('computeStockCritico', () => {
  it('ignores products with no sales in the window', () => {
    const result = computeStockCritico(
      [stockRow({ cod_item: 'A', stock_disponible: 0 })],
      statsMap(), // sin stats para A → no se vende
    )
    expect(result).toEqual([])
  })

  it('ignores products with healthy stock', () => {
    // 90 uds en 90 días = 1/día; 100 de stock = 100 días > umbral 15
    const result = computeStockCritico(
      [stockRow({ cod_item: 'A', stock_disponible: 100 })],
      statsMap(stats('A', 90)),
    )
    expect(result).toEqual([])
  })

  it('flags a selling product that is out of stock as "agotado"', () => {
    const result = computeStockCritico(
      [stockRow({ cod_item: 'A', stock_disponible: 0 })],
      statsMap(stats('A', 90)),
    )
    expect(result).toHaveLength(1)
    expect(result[0].severidad).toBe('agotado')
    expect(result[0].diasRestantes).toBe(0)
  })

  it('classifies few days of stock left as "critico" (<7)', () => {
    // 90 uds/90d = 1/día; 3 de stock = 3 días
    const [item] = computeStockCritico(
      [stockRow({ cod_item: 'A', stock_disponible: 3 })],
      statsMap(stats('A', 90)),
    )
    expect(item.severidad).toBe('critico')
    expect(item.diasRestantes).toBeCloseTo(3)
    expect(item.ventaDiaria).toBeCloseTo(1)
  })

  it('classifies stock between 7 and the threshold as "bajo"', () => {
    // 1/día, 10 de stock = 10 días → bajo (7 <= 10 <= 15)
    const [item] = computeStockCritico(
      [stockRow({ cod_item: 'A', stock_disponible: 10 })],
      statsMap(stats('A', 90)),
    )
    expect(item.severidad).toBe('bajo')
  })

  it('sorts by severity then by days remaining ascending', () => {
    const result = computeStockCritico(
      [
        stockRow({ cod_item: 'BAJO', stock_disponible: 12 }),
        stockRow({ cod_item: 'AGOTADO', stock_disponible: 0 }),
        stockRow({ cod_item: 'CRITICO', stock_disponible: 2 }),
      ],
      statsMap(stats('BAJO', 90), stats('AGOTADO', 90), stats('CRITICO', 90)),
    )
    expect(result.map((r) => r.cod_item)).toEqual(['AGOTADO', 'CRITICO', 'BAJO'])
  })

  it('orders agotados by sales velocity (most lost sales first)', () => {
    const result = computeStockCritico(
      [
        stockRow({ cod_item: 'LENTO', stock_disponible: 0 }),
        stockRow({ cod_item: 'RAPIDO', stock_disponible: 0 }),
      ],
      statsMap(stats('LENTO', 9), stats('RAPIDO', 90)), // 0.1/día vs 1/día
    )
    expect(result.map((r) => r.cod_item)).toEqual(['RAPIDO', 'LENTO'])
  })

  it('skips negative stock anomalies', () => {
    const result = computeStockCritico(
      [stockRow({ cod_item: 'A', stock_disponible: -5 })],
      statsMap(stats('A', 90)),
    )
    expect(result).toEqual([])
  })
})
