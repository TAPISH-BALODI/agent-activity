import type { EventItem } from '../../types'
import { StatusBadge } from '../StatusBadge/StatusBadge'
import styles from './EventTable.module.css'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow} aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i}>
          <span className={styles.skeletonCell} style={{ width: `${60 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

interface SkeletonTableProps {
  rows?: number
}

export function SkeletonTable({ rows = 12 }: SkeletonTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table} aria-busy="true" aria-label="Loading events">
        <thead>
          <TableHead />
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Table head (shared) ───────────────────────────────────────────────────────

function TableHead() {
  return (
    <tr>
      <th>Time</th>
      <th>Agent</th>
      <th>Tool</th>
      <th>Status</th>
      <th>Latency</th>
      <th>Preview</th>
    </tr>
  )
}

// ── Event row ─────────────────────────────────────────────────────────────────

interface RowProps {
  event: EventItem
  selected: boolean
  onClick: () => void
}

function EventRow({ event, selected, onClick }: RowProps) {
  const time = new Date(event.timestamp).toLocaleTimeString('en-GB', {
    hour12: false,
    timeZone: 'UTC',
  })
  const date = new Date(event.timestamp).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <tr
      className={`${styles.row} ${selected ? styles.selected : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`Event ${event.id}: ${event.agent} called ${event.tool}`}
    >
      <td className={styles.time}>
        <span className={styles.timeMain}>{time}</span>
        <span className={styles.timeDate}>{date}</span>
      </td>
      <td className={styles.agent}>{event.agent}</td>
      <td className={styles.tool}>{event.tool}</td>
      <td>
        <StatusBadge status={event.status} />
      </td>
      <td className={styles.latency}>
        <span
          className={
            event.latencyMs < 200
              ? styles.fast
              : event.latencyMs < 1000
                ? styles.medium
                : styles.slow
          }
        >
          {event.latencyMs} ms
        </span>
      </td>
      <td className={styles.preview} title={event.argsPreview}>
        {event.argsPreview}
      </td>
    </tr>
  )
}

// ── Main table ────────────────────────────────────────────────────────────────

interface Props {
  events: EventItem[]
  selectedId: string
  total: number
  nextCursor: string | null
  isFetchingMore: boolean
  onRowClick: (id: string) => void
  onLoadMore: () => void
}

export function EventTable({
  events,
  selectedId,
  total,
  nextCursor,
  isFetchingMore,
  onRowClick,
  onLoadMore,
}: Props) {
  return (
    <div>
      <div className={styles.meta}>
        <span className={styles.count}>
          {total.toLocaleString()} events
        </span>
        <span className={styles.showing}>showing {events.length.toLocaleString()}</span>
      </div>

      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <TableHead />
          </thead>
          <tbody>
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                selected={event.id === selectedId}
                onClick={() => onRowClick(event.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className={styles.loadMore}>
          <button
            className={styles.loadMoreBtn}
            onClick={onLoadMore}
            disabled={isFetchingMore}
            aria-busy={isFetchingMore}
          >
            {isFetchingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
