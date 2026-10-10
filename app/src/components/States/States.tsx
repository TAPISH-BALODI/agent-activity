import styles from './States.module.css'

interface EmptyStateProps {
  hasFilters: boolean
}

export function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <div className={styles.center} role="status">
      <span className={styles.icon}>🔍</span>
      <p className={styles.title}>
        {hasFilters ? 'No events match your filters' : 'No events found'}
      </p>
      <p className={styles.sub}>
        {hasFilters
          ? 'Try adjusting your search or clearing some filters.'
          : 'The API returned an empty dataset.'}
      </p>
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.center} role="alert">
      <span className={styles.icon}>⚠️</span>
      <p className={styles.title}>Something went wrong</p>
      <p className={styles.sub}>{message}</p>
      <button className={styles.retry} onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export function SlowNetworkBanner() {
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      The API is taking longer than usual…
    </div>
  )
}
