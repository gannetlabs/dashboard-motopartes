import { vi } from 'vitest'

export interface TableResponse {
  data: unknown[] | null
  error: { message: string } | null
}

/**
 * Builds a chainable Supabase query-builder double for a single table's
 * response. Every filter/order method returns the same builder (so chains like
 * `.select().eq().order().limit()` work), the builder is thenable (so `await`
 * resolves to the response), and `.range()` resolves directly (used by
 * fetchAllPages).
 */
function queryBuilder(response: TableResponse) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  for (const method of ['select', 'order', 'limit', 'eq', 'neq', 'gte', 'lte']) {
    builder[method] = vi.fn(chain)
  }
  builder.range = vi.fn(() => Promise.resolve(response))
  builder.then = (resolve: (v: TableResponse) => unknown) => resolve(response)
  return builder
}

/**
 * Returns a `from(table)` implementation that serves a preconfigured response
 * per table name. Unlisted tables resolve to an empty success.
 *
 * @example
 *   vi.mocked(supabase.from).mockImplementation(
 *     supabaseFrom({ productos: { data: [...], error: null } }),
 *   )
 */
export function supabaseFrom(responses: Record<string, TableResponse>) {
  return (table: string) =>
    queryBuilder(responses[table] ?? { data: [], error: null })
}
