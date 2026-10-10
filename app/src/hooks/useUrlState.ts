import { useCallback, useSyncExternalStore } from 'react'
import type { EventStatus, UrlState } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

function readSearch(): string {
  return window.location.search
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('popstate', cb)
  return () => window.removeEventListener('popstate', cb)
}

function parseSearch(search: string): UrlState {
  const p = new URLSearchParams(search)
  return {
    q: p.get('q') ?? '',
    agents: p.getAll('agent'),
    status: (p.get('status') as EventStatus | null) ?? '',
    from: p.get('from') ?? '',
    to: p.get('to') ?? '',
    id: p.get('id') ?? '',
    cursor: p.get('cursor') ?? '',
  }
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useUrlState() {
  const search = useSyncExternalStore(subscribe, readSearch, readSearch)
  const state = parseSearch(search)

  /**
   * Update filter params. Always resets cursor — a new filter query starts
   * from page 1. Uses pushState so back/forward works.
   */
  const setFilters = useCallback(
    (patch: Partial<Omit<UrlState, 'cursor' | 'id'>>) => {
      const next = new URLSearchParams(window.location.search)
      // Reset cursor on any filter change
      next.delete('cursor')

      if ('q' in patch) {
        if (patch.q) next.set('q', patch.q)
        else next.delete('q')
      }
      if ('agents' in patch) {
        next.delete('agent')
        patch.agents?.forEach((a) => next.append('agent', a))
      }
      if ('status' in patch) {
        if (patch.status) next.set('status', patch.status)
        else next.delete('status')
      }
      if ('from' in patch) {
        if (patch.from) next.set('from', patch.from)
        else next.delete('from')
      }
      if ('to' in patch) {
        if (patch.to) next.set('to', patch.to)
        else next.delete('to')
      }

      const qs = next.toString()
      const newUrl = qs ? `?${qs}` : window.location.pathname
      window.history.pushState(null, '', newUrl)
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
    [],
  )

  /**
   * Advance to the next cursor page. Uses replaceState — paging forward
   * doesn't add a back-button entry.
   */
  const setCursor = useCallback((cursor: string) => {
    const next = new URLSearchParams(window.location.search)
    if (cursor) next.set('cursor', cursor)
    else next.delete('cursor')
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  /**
   * Open detail panel. Uses replaceState — doesn't pollute history.
   */
  const setId = useCallback((id: string) => {
    const next = new URLSearchParams(window.location.search)
    if (id) next.set('id', id)
    else next.delete('id')
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  return { state, setFilters, setCursor, setId }
}
