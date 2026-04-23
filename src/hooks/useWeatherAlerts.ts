import { useQuery } from '@tanstack/react-query'
import { fetchOfficialWeatherAlerts } from '@/lib/weatherAlerts'

// Official weather warnings are refetched less often than user incidents
// because weather moves slower than on-the-ground reports.
const WEATHER_REFETCH_MS = 10 * 60 * 1000 // 10 minutes

export function useWeatherAlerts(enabled = true) {
  return useQuery({
    queryKey: ['weather-alerts'],
    queryFn: () => fetchOfficialWeatherAlerts(),
    refetchInterval: WEATHER_REFETCH_MS,
    staleTime: WEATHER_REFETCH_MS - 30_000,
    retry: 1,
    enabled,
  })
}
