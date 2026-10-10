import { useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getHistogram } from '../../api/events'
import type { UrlState } from '../../types'
import styles from './Histogram.module.css'

const CHART_HEIGHT = 80
const BAR_MIN_HEIGHT = 2

interface Props {
  state: UrlState
  onRangeSelect: (from: string, to: string) => void
  onRangeClear: () => void
}

interface DragState {
  startX: number
  startPct: number
  endPct: number
  dragging: boolean
}

export function Histogram({ state, onRangeSelect, onRangeClear }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['histogram', state.q, state.agents, state.status, state.from, state.to],
    queryFn: () =>
      getHistogram({
        q: state.q,
        agents: state.agents,
        status: state.status || undefined,
        from: state.from || undefined,
        to: state.to || undefined,
        bucket: '5m',
      }),
    staleTime: 30_000,
  })

  const buckets = data?.buckets ?? []
  const maxCount = Math.max(...buckets.map((b) => b.count), 1)

  function pctToTime(pct: number): string {
    if (buckets.length < 2) return ''
    const first = new Date(buckets[0].t).getTime()
    const last = new Date(buckets[buckets.length - 1].t).getTime()
    return new Date(first + pct * (last - first)).toISOString()
  }

  function getSvgPct(clientX: number): number {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (buckets.length < 2) return
      const pct = getSvgPct(e.clientX)
      setDrag({ startX: e.clientX, startPct: pct, endPct: pct, dragging: true })
    },
    [buckets.length],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!drag?.dragging) return
      const pct = getSvgPct(e.clientX)
      setDrag((d) => d && { ...d, endPct: pct })
    },
    [drag?.dragging],
  )

  const handleMouseUp = useCallback(() => {
    if (!drag?.dragging) return
    const lo = Math.min(drag.startPct, drag.endPct)
    const hi = Math.max(drag.startPct, drag.endPct)
    if (hi - lo > 0.01) {
      onRangeSelect(pctToTime(lo), pctToTime(hi))
    }
    setDrag(null)
  }, [drag, onRangeSelect, pctToTime])

  const hasRange = state.from || state.to

  if (isLoading || buckets.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.label}>Events over time</div>
        <div className={styles.empty}>
          {isLoading ? 'Loading chart…' : 'No data for current filters'}
        </div>
      </div>
    )
  }

  const width = 1000
  const barW = Math.max(1, width / buckets.length - 1)

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Events over time</span>
        {hasRange && (
          <button className={styles.clearRange} onClick={onRangeClear}>
            Clear time range ✕
          </button>
        )}
        <span className={styles.hint}>Click and drag to filter by time range</span>
      </div>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        aria-label="Events over time histogram"
        role="img"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Bars */}
        {buckets.map((b, i) => {
          const h = Math.max(BAR_MIN_HEIGHT, (b.count / maxCount) * CHART_HEIGHT)
          const x = (i / buckets.length) * width
          return (
            <rect
              key={b.t}
              x={x}
              y={CHART_HEIGHT - h}
              width={barW}
              height={h}
              className={styles.bar}
            />
          )
        })}

        {/* Drag selection overlay */}
        {drag && drag.dragging && (
          <rect
            x={Math.min(drag.startPct, drag.endPct) * width}
            y={0}
            width={Math.abs(drag.endPct - drag.startPct) * width}
            height={CHART_HEIGHT}
            className={styles.selection}
          />
        )}
      </svg>
    </div>
  )
}
