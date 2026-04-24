import { useQuery } from '@tanstack/react-query'
import { fetchOfficialWeatherAlerts } from '@/lib/weatherAlerts'

// Official weather warnings are refetched less often than user incidents
// because weather moves slower than on-the-ground reports. We also keep
// the poll well above Open-Meteo's free-tier limit (10 req/min/IP).
const WEATHER_REFETCH_MS = 15 * 60 * 1000 // 15 minutes

export function useWeatherAlerts(enabled = true) {
  return useQuery({
    queryKey: ['weather-alerts'],
    queryFn: () => fetchOfficialWeatherAlerts(),
    refetchInterval: WEATHER_REFETCH_MS,
    staleTime: WEATHER_REFETCH_MS - 30_000,
    gcTime: 60 * 60 * 1000,           // keep last payload for 1h across remounts
    refetchOnWindowFocus: false,      // avoid re-hitting on tab focus
    retry: 2,
    retryDelay: (attempt) => Math.min(30_000, 2_000 * 2 ** attempt),
    enabled,
  })
}
