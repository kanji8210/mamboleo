import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchMediaFeed, fetchTrends, type TrendsResult } from '@/lib/mediaApi'

/**
 * Paginated article feed (GraphQL cursor pagination).
 * Use `data?.pages.flatMap(p => p.articles)` to get a flat list.
 */
export function useMediaFeed(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ['media-feed', pageSize],
    queryFn: ({ pageParam }) => fetchMediaFeed(pageParam as string | null, pageSize),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,      // 1 min
    refetchInterval: 120_000, // 2 min
  })
}

/**
 * Aggregate trend snapshot. Cheap — server caches 5 min.
 */
export function useTrends(window: TrendsResult['window'] = '24h') {
  return useQuery({
    queryKey: ['media-trends', window],
    queryFn: () => fetchTrends(window),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}
