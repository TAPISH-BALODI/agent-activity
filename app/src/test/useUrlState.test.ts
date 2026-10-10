import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUrlState } from '../hooks/useUrlState'

beforeEach(() => {
  // Reset URL before each test
  window.history.replaceState(null, '', '/')
})

describe('useUrlState', () => {
  it('reads initial empty state from URL', () => {
    const { result } = renderHook(() => useUrlState())
    expect(result.current.state.q).toBe('')
    expect(result.current.state.agents).toEqual([])
    expect(result.current.state.status).toBe('')
    expect(result.current.state.id).toBe('')
    expect(result.current.state.cursor).toBe('')
  })

  it('reads state from existing URL params', () => {
    window.history.replaceState(null, '', '/?q=billing&status=ok&agent=billing-assistant')
    const { result } = renderHook(() => useUrlState())
    expect(result.current.state.q).toBe('billing')
    expect(result.current.state.status).toBe('ok')
    expect(result.current.state.agents).toEqual(['billing-assistant'])
  })

  it('setFilters updates URL and resets cursor', () => {
    window.history.replaceState(null, '', '/?cursor=abc123')
    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setFilters({ q: 'http.request' })
    })

    expect(result.current.state.q).toBe('http.request')
    // Cursor must be cleared when filters change
    expect(result.current.state.cursor).toBe('')
    expect(window.location.search).not.toContain('cursor')
  })

  it('setFilters with multiple agents produces repeatable agent params', () => {
    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setFilters({ agents: ['billing-assistant', 'support-triage'] })
    })

    expect(result.current.state.agents).toEqual(['billing-assistant', 'support-triage'])
    const params = new URLSearchParams(window.location.search)
    expect(params.getAll('agent')).toEqual(['billing-assistant', 'support-triage'])
  })

  it('setId opens detail panel without affecting filter state', () => {
    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setFilters({ q: 'sql' })
    })
    act(() => {
      result.current.setId('evt_abc')
    })

    expect(result.current.state.id).toBe('evt_abc')
    // Filter state is preserved
    expect(result.current.state.q).toBe('sql')
  })

  it('setId with empty string clears id from URL', () => {
    window.history.replaceState(null, '', '/?id=evt_abc')
    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setId('')
    })

    expect(result.current.state.id).toBe('')
    expect(window.location.search).not.toContain('id')
  })

  it('setFilters with from/to sets time range params', () => {
    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setFilters({
        from: '2026-10-09T00:00:00Z',
        to: '2026-10-09T12:00:00Z',
      })
    })

    expect(result.current.state.from).toBe('2026-10-09T00:00:00Z')
    expect(result.current.state.to).toBe('2026-10-09T12:00:00Z')
  })

  it('clearing filters removes params from URL', () => {
    window.history.replaceState(null, '', '/?q=foo&status=error')
    const { result } = renderHook(() => useUrlState())

    act(() => {
      result.current.setFilters({ q: '', status: '' })
    })

    expect(result.current.state.q).toBe('')
    expect(result.current.state.status).toBe('')
    expect(window.location.search).not.toContain('q=')
    expect(window.location.search).not.toContain('status=')
  })
})
