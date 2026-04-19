import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { LandingPage } from '@/pages/LandingPage'
import { MapPage } from '@/pages/MapPage'

// ─── QueryClient (singleton outside component) ────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 20_000),
    },
  },
})

// ─── Shell (needs router context for useLocation) ─────────────────────────

function AppShell() {
  const { pathname } = useLocation()
  const isMapPage = pathname === '/map'

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/map" element={<MapPage />} />
      </Routes>
      {!isMapPage && <Footer />}
    </>
  )
}

// ─── Root with providers ──────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
