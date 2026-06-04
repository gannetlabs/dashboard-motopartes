interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Fetches every row of a query by paging through it. Avoids the silent
 * truncation a single hardcoded `.limit()` causes once a table outgrows it:
 * the request succeeds, no error is raised, and the missing rows go unnoticed.
 *
 * Pass a function that applies `.range(from, to)` to a fresh query each call.
 *
 * @example
 *   const rows = await fetchAllPages<Factura>((from, to) =>
 *     supabase.from('facturas').select('*').range(from, to),
 *   )
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}
