import { describe, it, expect } from 'vitest'
import { getErrorMessage } from './utils'

describe('getErrorMessage', () => {
  it('reads the message from an Error instance', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('reads the message from a plain object (Supabase-style error)', () => {
    expect(getErrorMessage({ message: 'relation does not exist' }, 'fallback')).toBe(
      'relation does not exist',
    )
  })

  it('falls back when there is no usable message', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getErrorMessage('just a string', 'fallback')).toBe('fallback')
    expect(getErrorMessage({ code: 500 }, 'fallback')).toBe('fallback')
    expect(getErrorMessage({ message: 42 }, 'fallback')).toBe('fallback')
  })
})
