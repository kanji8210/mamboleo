import { useQuery } from '@tanstack/react-query'
import { useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { fetchIncidents } from '@/lib/graphql'
import type { Incident, FilterOption } from '@/types/incident'
import { INCIDENT_LABELS } from '@/types/incident'

interface UseIncidentsOptions {
  filter: FilterOption
  onNewIncidents?: (ids: string[]) => void
}

export function useIncidents({ filter, onNewIncidents }: UseIncidentsOptions) {
  const prevIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  const query = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
    refetchInterval: 30_000,
    staleTime: 20_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
  })

  // Detect new incidents on each successful fetch
  useEffect(() => {
    if (!query.data) return

    const currentIds = new Set(query.data.map((i) => i.id))

    if (isFirstLoadRef.current) {
      // Seed the previous-ID set on first load — don't fire notifications
      isFirstLoadRef.current = false
      prevIdsRef.current = currentIds
      return
    }

    const newIds = [...currentIds].filter((id) => !prevIdsRef.current.has(id))

    if (newIds.length > 0) {
      const newIncidents = query.data.filter((i) => newIds.includes(i.id))

      newIncidents.slice(0, 3).forEach((incident) => {
        const label = INCIDENT_LABELS[incident.incidentFields.type]
        toast(`🚨 New ${label} incident`, {
          description: incident.title,
          duration: 5000,
        })
      })

      if (newIncidents.length > 3) {
        toast(`+${newIncidents.length - 3} more new incidents`, { duration: 4000 })
      }

      onNewIncidents?.(newIds)
    }

    prevIdsRef.current = currentIds
  }, [query.data, onNewIncidents])

  const incidents: Incident[] =
    query.data?.filter((i) => filter === 'all' || i.incidentFields.type === filter) ?? []

  return {
    incidents,
    allIncidents: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
