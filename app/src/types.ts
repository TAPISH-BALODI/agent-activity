export type EventStatus = 'ok' | 'blocked' | 'error'

export interface EventItem {
  id: string
  timestamp: string
  agent: string
  tool: string
  status: EventStatus
  latencyMs: number
  argsPreview: string
}

export interface EventDetail extends EventItem {
  args: unknown
  result: unknown
  policyMatches: string[]
}

export interface EventListResponse {
  items: EventItem[]
  nextCursor: string | null
  total: number
}

export interface HistogramBucket {
  t: string
  count: number
}

export interface HistogramResponse {
  bucket: '1m' | '5m' | '1h'
  buckets: HistogramBucket[]
}

export interface UrlState {
  q: string
  agents: string[]
  status: EventStatus | ''
  from: string
  to: string
  id: string
  cursor: string
}
