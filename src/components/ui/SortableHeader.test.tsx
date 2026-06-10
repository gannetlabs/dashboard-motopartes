import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SortableHeader from './SortableHeader'

function renderHeader(props: Partial<React.ComponentProps<typeof SortableHeader>> = {}) {
  const onSort = vi.fn()
  render(
    <table>
      <thead>
        <tr>
          <SortableHeader
            label="Nombre"
            columnKey="nombre"
            sortKey={null}
            sortDirection="asc"
            onSort={onSort}
            {...props}
          />
        </tr>
      </thead>
    </table>,
  )
  return { onSort }
}

describe('SortableHeader', () => {
  it('exposes aria-sort="none" when its column is not the active one', () => {
    renderHeader({ sortKey: null })
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'none')
  })

  it('exposes aria-sort="ascending" when active and ascending', () => {
    renderHeader({ sortKey: 'nombre', sortDirection: 'asc' })
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending')
  })

  it('exposes aria-sort="descending" when active and descending', () => {
    renderHeader({ sortKey: 'nombre', sortDirection: 'desc' })
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending')
  })

  it('calls onSort with the column key on click', async () => {
    const { onSort } = renderHeader()
    await userEvent.click(screen.getByRole('button', { name: /nombre/i }))
    expect(onSort).toHaveBeenCalledWith('nombre')
  })

  it('calls onSort when activated with the keyboard (native button)', async () => {
    const { onSort } = renderHeader()
    screen.getByRole('button', { name: /nombre/i }).focus()
    await userEvent.keyboard('{Enter}')
    expect(onSort).toHaveBeenCalledWith('nombre')
  })
})
