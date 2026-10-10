import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DetailPanel } from '../components/DetailPanel/DetailPanel'

const mockEvent = {
  id: 'evt_001',
  timestamp: '2026-10-09T10:00:00Z',
  agent: 'billing-assistant',
  tool: 'http.request',
  status: 'ok' as const,
  latencyMs: 120,
  argsPreview: '{"url":"https://api.stripe.com"}',
  args: { url: 'https://api.stripe.com', method: 'GET' },
  result: { status: 200, body: 'ok' },
  policyMatches: ['pii-redaction', 'rate-limit'],
}

const server = setupServer(
  http.get('http://localhost:4000/events/evt_001', () =>
    HttpResponse.json(mockEvent),
  ),
  http.get('http://localhost:4000/events/evt_error', () =>
    HttpResponse.json({ error: 'server error' }, { status: 500 }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderPanel(id: string, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <DetailPanel id={id} onClose={onClose} />
    </QueryClientProvider>,
  )
}

describe('DetailPanel', () => {
  it('renders loading state initially', () => {
    renderPanel('evt_001')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // The close button should be present
    expect(screen.getByLabelText('Close detail panel')).toBeInTheDocument()
  })

  it('displays event data after load', async () => {
    renderPanel('evt_001')
    await waitFor(() => {
      expect(screen.getByText('billing-assistant')).toBeInTheDocument()
    })
    expect(screen.getByText('http.request')).toBeInTheDocument()
    expect(screen.getByText('pii-redaction')).toBeInTheDocument()
    expect(screen.getByText('rate-limit')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    renderPanel('evt_001', onClose)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    renderPanel('evt_001', onClose)

    fireEvent.click(screen.getByLabelText('Close detail panel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    renderPanel('evt_001', onClose)

    // Backdrop is aria-hidden, but still clickable
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows error state when API fails', async () => {
    renderPanel('evt_error')
    await waitFor(
      () => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
    expect(screen.getByText(/failed to load event/i)).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })
})
