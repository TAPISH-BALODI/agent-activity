import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getEvents, getAgents } from '../api/events'
import { useUrlState } from '../hooks/useUrlState'
import { useDelayed } from '../hooks/useDelayed'
import { EventTable, SkeletonTable } from '../components/EventTable/EventTable'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { DetailPanel } from '../components/DetailPanel/DetailPanel'
import { Histogram } from '../components/Histogram/Histogram'
import { EmptyState, ErrorState, SlowNetworkBanner } from '../components/States/States'
import type { EventItem } from '../types'
import styles from './EventsPage.module.css'

export function EventsPage() {
  const { state, setFilters, setCursor, setId } = useUrlState()
  const queryClient = useQueryClient()

  // Accumulated events across pages
  const [pages, setPages] = useState<EventItem[][]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [isFetchingMore, setIsFetchingMore] = useState(false)

  // Key changes whenever filters change — resets the accumulated pages
  const filterKey = JSON.stringify({
    q: state.q,
    agents: state.agents,
    status: state.status,
    from: state.from,
    to: state.to,
  })

  const { isLoading, isError, error, refetch } = useQuery({
    queryKey: ['events', filterKey, state.cursor],
    queryFn: async () => {
      const res = await getEvents({
        q: state.q,
        agents: state.agents,
        status: state.status,
        from: state.from,
        to: state.to,
        cursor: state.cursor,
        limit: '50',
      })
      // First page: reset accumulated state
      if (!state.cursor) {
        setPages([res.items])
      } else {
        setPages((prev) => [...prev, res.items])
      }
      setNextCursor(res.nextCursor)
      setTotal(res.total)
      return res
    },
    retry: 1,
    staleTime: 30_000,
  })

  const events = pages.flat()
  const showSlowNetwork = useDelayed(3000) && isLoading

  const { data: agentList = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 5 * 60_000,
  })

  function handleLoadMore() {
    if (!nextCursor || isFetchingMore) return
    setIsFetchingMore(true)
    getEvents({
      q: state.q,
      agents: state.agents,
      status: state.status,
      from: state.from,
      to: state.to,
      cursor: nextCursor,
      limit: '50',
    })
      .then((res) => {
        setPages((prev) => [...prev, res.items])
        setNextCursor(res.nextCursor)
      })
      .finally(() => setIsFetchingMore(false))
  }

  function handleFiltersChange(patch: Parameters<typeof setFilters>[0]) {
    setPages([])
    setNextCursor(null)
    setFilters(patch)
    // Invalidate events cache on filter change
    queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const hasFilters = !!(state.q || state.agents.length || state.status || state.from || state.to)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.brand}>Agent Activity</h1>
      </header>

      <main className={styles.main}>
        <Histogram
          state={state}
          onRangeSelect={(from, to) => handleFiltersChange({ from, to })}
          onRangeClear={() => handleFiltersChange({ from: '', to: '' })}
        />

        <FilterBar
          state={state}
          agents={agentList}
          onFiltersChange={handleFiltersChange}
        />

        {showSlowNetwork && <SlowNetworkBanner />}

        {isLoading && events.length === 0 && <SkeletonTable />}

        {isError && (
          <ErrorState
            message={(error as Error).message}
            onRetry={() => {
              setPages([])
              setNextCursor(null)
              refetch()
            }}
          />
        )}

        {!isLoading && !isError && events.length === 0 && (
          <EmptyState hasFilters={hasFilters} />
        )}

        {events.length > 0 && (
          <EventTable
            events={events}
            selectedId={state.id}
            total={total}
            nextCursor={nextCursor}
            isFetchingMore={isFetchingMore}
            onRowClick={setId}
            onLoadMore={handleLoadMore}
          />
        )}
      </main>

      {state.id && (
        <DetailPanel
          id={state.id}
          onClose={() => setId('')}
        />
      )}
    </div>
  )
}
