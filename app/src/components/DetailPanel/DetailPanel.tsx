import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEvent } from '../../api/events'
import { StatusBadge } from '../StatusBadge/StatusBadge'
import styles from './DetailPanel.module.css'

interface Props {
  id: string
  onClose: () => void
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function DetailPanel({ id, onClose }: Props) {
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id),
    retry: 1,
  })

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Focus the close button when panel opens
  useEffect(() => {
    closeRef.current?.focus()
  }, [id])

  // Focus trap
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = panel!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    panel.addEventListener('keydown', handleTab)
    return () => panel.removeEventListener('keydown', handleTab)
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Event detail"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Event detail</h2>
          <button
            ref={closeRef}
            className={styles.close}
            onClick={onClose}
            aria-label="Close detail panel"
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {isLoading && (
            <div className={styles.loading} role="status">
              <div className={styles.loadingBar} />
              <div className={styles.loadingBar} style={{ width: '70%' }} />
              <div className={styles.loadingBar} style={{ width: '50%' }} />
            </div>
          )}

          {isError && (
            <div className={styles.error} role="alert">
              <p>Failed to load event: {(error as Error).message}</p>
              <button className={styles.retryBtn} onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}

          {data && (
            <div className={styles.content}>
              <div className={styles.row}>
                <span className={styles.label}>ID</span>
                <code className={styles.value}>{data.id}</code>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Time</span>
                <span className={styles.value}>
                  {new Date(data.timestamp).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Agent</span>
                <span className={styles.value}>{data.agent}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Tool</span>
                <code className={styles.value}>{data.tool}</code>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Status</span>
                <StatusBadge status={data.status} latencyMs={data.latencyMs} />
              </div>

              {data.policyMatches.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Policy matches</h3>
                  <ul className={styles.pills}>
                    {data.policyMatches.map((rule) => (
                      <li key={rule} className={styles.pill}>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Arguments</h3>
                <pre className={styles.code}>{formatJson(data.args)}</pre>
              </div>

              {data.result !== null && data.result !== undefined && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Result</h3>
                  <pre className={styles.code}>{formatJson(data.result)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
