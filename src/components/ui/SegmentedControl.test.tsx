import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SegmentedControl from './SegmentedControl'

const options = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

describe('SegmentedControl', () => {
  it('marks the selected option with aria-pressed', () => {
    render(<SegmentedControl options={options} value={30} onChange={() => {}} />)

    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onChange with the clicked value', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={options} value={30} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: '90d' }))

    expect(onChange).toHaveBeenCalledWith(90)
  })
})
