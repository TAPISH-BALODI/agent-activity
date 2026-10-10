import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { getEvents, getEvent } from '../api/events'
import { ApiError } from '../api/client'

const server = setupServer(
  http.get('http://localhost:4000/events', () =>
    HttpResponse.json({
      items: [
        {
          id: 'evt_001',
          timestamp: '2026-10-09T10:00:00Z',
          agent: 'billing-assistant',
          tool: 'http.request',
          status: 'ok',
          latencyMs: 120,
          argsPreview: '{"url":"https://api.stripe.com"}',
        },
      ],
      nextCursor: null,
      total: 1,
    }),
  ),

  http.get('http://localhost:4000/events/evt_001', () =>
    HttpResponse.json({
      id: 'evt_001',
      timestamp: '2026-10-09T10:00:00Z',
      agent: 'billing-assistant',
      tool: 'http.request',
      status: 'ok',
      latencyMs: 120,
      argsPreview: '{"url":"https://api.stripe.com"}',
      args: { url: 'https://api.stripe.com' },
      result: { status: 200 },
      policyMatches: [],
    }),
  ),

  http.get('http://localhost:4000/events/evt_500', () =>
    HttpResponse.json({ error: 'internal server error' }, { status: 500 }),
  ),

  http.get('http://localhost:4000/events/evt_404', () =>
    HttpResponse.json({ error: 'not found' }, { status: 404 }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('API client', () => {
  it('getEvents returns a list response', async () => {
    const result = await getEvents({})
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('evt_001')
    expect(result.total).toBe(1)
    expect(result.nextCursor).toBeNull()
  })

  it('getEvents passes q param to request', async () => {
    let capturedUrl: string | undefined

    server.use(
      http.get('http://localhost:4000/events', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ items: [], nextCursor: null, total: 0 })
      }),
    )

    await getEvents({ q: 'billing', agents: ['billing-assistant'], status: 'ok' })

    const url = new URL(capturedUrl!)
    expect(url.searchParams.get('q')).toBe('billing')
    expect(url.searchParams.getAll('agent')).toEqual(['billing-assistant'])
    expect(url.searchParams.get('status')).toBe('ok')
  })

  it('getEvent returns full event detail', async () => {
    const event = await getEvent('evt_001')
    expect(event.id).toBe('evt_001')
    expect(event.policyMatches).toEqual([])
    expect(event.args).toEqual({ url: 'https://api.stripe.com' })
  })

  it('throws ApiError with status code on server error', async () => {
    await expect(getEvent('evt_500')).rejects.toThrow(ApiError)
    await expect(getEvent('evt_500')).rejects.toMatchObject({ status: 500 })
  })

  it('throws ApiError on 404', async () => {
    await expect(getEvent('evt_404')).rejects.toThrow(ApiError)
    await expect(getEvent('evt_404')).rejects.toMatchObject({ status: 404 })
  })

  it('ApiError has meaningful message', async () => {
    try {
      await getEvent('evt_500')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).message).toContain('500')
    }
  })
})
