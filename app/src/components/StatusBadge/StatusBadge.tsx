import type { EventStatus } from '../../types'
import styles from './StatusBadge.module.css'

interface Props {
  status: EventStatus
  latencyMs?: number
}

export function StatusBadge({ status, latencyMs }: Props) {
  const latencyClass =
    latencyMs === undefined
      ? ''
      : latencyMs < 200
        ? styles.fast
        : latencyMs < 1000
          ? styles.medium
          : styles.slow

  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {status}
      {latencyMs !== undefined && (
        <span className={`${styles.latency} ${latencyClass}`}>{latencyMs} ms</span>
      )}
    </span>
  )
}
