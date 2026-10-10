import { useEffect, useRef, useState } from 'react'
import type { EventStatus, UrlState } from '../../types'
import styles from './FilterBar.module.css'

interface Props {
  state: UrlState
  agents: string[]
  onFiltersChange: (patch: Partial<Omit<UrlState, 'cursor' | 'id'>>) => void
}

export function FilterBar({ state, agents, onFiltersChange }: Props) {
  // Local search value with debounce
  const [searchValue, setSearchValue] = useState(state.q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync when URL state changes externally (e.g. back/forward)
  useEffect(() => {
    setSearchValue(state.q)
  }, [state.q])

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearchValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ q: val })
    }, 250)
  }

  function handleAgentToggle(agent: string) {
    const next = state.agents.includes(agent)
      ? state.agents.filter((a) => a !== agent)
      : [...state.agents, agent]
    onFiltersChange({ agents: next })
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onFiltersChange({ status: e.target.value as EventStatus | '' })
  }

  function handleClearAll() {
    setSearchValue('')
    onFiltersChange({ q: '', agents: [], status: '', from: '', to: '' })
  }

  const hasActiveFilters =
    state.q || state.agents.length > 0 || state.status || state.from || state.to

  return (
    <div className={styles.bar} role="search">
      <input
        className={styles.search}
        type="search"
        placeholder="Search events…"
        aria-label="Search events"
        value={searchValue}
        onChange={handleSearchChange}
      />

      <select
        className={styles.select}
        value={state.status}
        onChange={handleStatusChange}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="ok">OK</option>
        <option value="blocked">Blocked</option>
        <option value="error">Error</option>
      </select>

      {agents.length > 0 && (
        <details className={styles.agentDropdown}>
          <summary className={styles.agentSummary}>
            Agents
            {state.agents.length > 0 && (
              <span className={styles.agentCount}>{state.agents.length}</span>
            )}
          </summary>
          <div className={styles.agentList}>
            {agents.map((agent) => (
              <label key={agent} className={styles.agentOption}>
                <input
                  type="checkbox"
                  checked={state.agents.includes(agent)}
                  onChange={() => handleAgentToggle(agent)}
                />
                {agent}
              </label>
            ))}
          </div>
        </details>
      )}

      {hasActiveFilters && (
        <button className={styles.clear} onClick={handleClearAll} aria-label="Clear all filters">
          Clear filters
        </button>
      )}
    </div>
  )
}
