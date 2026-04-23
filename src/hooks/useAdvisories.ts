import { useQuery } from '@tanstack/react-query'
import { fetchEmbassyAdvisories } from '@/lib/advisories'

// Embassy advisories change infrequently — refetch every 30 minutes.
const ADVISORY_REFETCH_MS = 30 * 60 * 1000

export function useAdvisories(enabled = true) {
  return useQuery({
    queryKey: ['embassy-advisories'],
    queryFn: () => fetchEmbassyAdvisories(),
    refetchInterval: ADVISORY_REFETCH_MS,
    staleTime: ADVISORY_REFETCH_MS - 60_000,
    retry: 1,
    enabled,
  })
}
