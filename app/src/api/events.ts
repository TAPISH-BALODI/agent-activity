import { apiFetch } from './client'
import type { EventDetail, EventListResponse, HistogramResponse } from '../types'

interface GetEventsParams {
  q?: string
  agents?: string[]
  status?: string
  from?: string
  to?: string
  cursor?: string
  limit?: string
}

export function getEvents(params: GetEventsParams): Promise<EventListResponse> {
  const p: Record<string, string | string[]> = {}
  if (params.q) p.q = params.q
  if (params.agents?.length) p.agent = params.agents
  if (params.status) p.status = params.status
  if (params.from) p.from = params.from
  if (params.to) p.to = params.to
  if (params.cursor) p.cursor = params.cursor
  if (params.limit) p.limit = params.limit
  return apiFetch<EventListResponse>('/events', p)
}

export function getEvent(id: string): Promise<EventDetail> {
  return apiFetch<EventDetail>(`/events/${id}`)
}

export function getAgents(): Promise<string[]> {
  return apiFetch<string[]>('/agents')
}

interface GetHistogramParams {
  q?: string
  agents?: string[]
  status?: string
  from?: string
  to?: string
  bucket?: '1m' | '5m' | '1h'
}

export function getHistogram(params: GetHistogramParams): Promise<HistogramResponse> {
  const p: Record<string, string | string[]> = {}
  if (params.q) p.q = params.q
  if (params.agents?.length) p.agent = params.agents
  if (params.status) p.status = params.status
  if (params.from) p.from = params.from
  if (params.to) p.to = params.to
  if (params.bucket) p.bucket = params.bucket
  return apiFetch<HistogramResponse>('/events/histogram', p)
}
