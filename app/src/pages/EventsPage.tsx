import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getEvents, getAgents } from '../api/events'
import { useUrlState } from '../hooks/useUrlState'
import { useDelayed } from '../hooks/useDelayed'
import { EventTable, SkeletonTable } from '../components/EventTable/EventTable'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { DetailPanel } from '../components/DetailPanel/DetailPanel'
import { Histogram } from '../components/Histogram/Histogram'
import { EmptyState, ErrorState, SlowNetworkBanner } from '../components/States/States'
import styles from './EventsPage.module.css'

export function EventsPage() {
  const { state, setFilters, setId } = useUrlState()

  const filterParams = {
    q: state.q,
    agents: state.agents,
    status: state.status,
    from: state.from,
    to: state.to,
  }

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['events', filterParams],
    queryFn: ({ pageParam }) =>
      getEvents({
        ...filterParams,
        cursor: pageParam as string | undefined,
        limit: '50',
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: 1,
  })

  const events = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0
  const nextCursor = data?.pages[data.pages.length - 1]?.nextCursor ?? null

  // Show slow-network banner only if first load takes >3s
  const showSlowNetwork = useDelayed(3000) && isLoading

  const { data: agentList = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 5 * 60_000,
  })

  function handleFiltersChange(patch: Parameters<typeof setFilters>[0]) {
    setFilters(patch)
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

        {isLoading && <SkeletonTable />}

        {isError && (
          <ErrorState
            message={(error as Error).message}
            onRetry={() => refetch()}
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
            isFetchingMore={isFetchingNextPage}
            onRowClick={setId}
            onLoadMore={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage()
            }}
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
