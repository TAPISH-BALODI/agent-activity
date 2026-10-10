import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EventsPage } from './pages/EventsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EventsPage />
    </QueryClientProvider>
  )
}

export default App
