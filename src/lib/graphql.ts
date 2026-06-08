import { GraphQLClient, gql } from 'graphql-request'
import type { Incident, IncidentsQueryResult, RawIncident } from '@/types/incident'

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

function withGraphqlPath(base: string): string {
  return `${trimTrailingSlash(base)}/graphql`
}

function buildGraphqlEndpoints(): string[] {
  const endpoints: string[] = []
  const explicit = (import.meta.env.VITE_GRAPHQL_ENDPOINT as string | undefined)?.trim()
  const wpUrl = (import.meta.env.VITE_WP_URL as string | undefined)?.trim()

  if (explicit && !explicit.includes('your-wordpress-site')) {
    endpoints.push(trimTrailingSlash(explicit))
  }
  if (wpUrl) {
    endpoints.push(withGraphqlPath(wpUrl))
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    endpoints.push(withGraphqlPath(window.location.origin))
  }

  // Common production mismatch: endpoint configured without www, but site is on www.
  if (endpoints.length > 0) {
    try {
      const first = new URL(endpoints[0])
      if (!first.hostname.startsWith('www.')) {
        const www = new URL(first.toString())
        www.hostname = `www.${first.hostname}`
        endpoints.push(www.toString())
      }
    } catch {
      // Ignore malformed fallback candidate
    }
  }

  return Array.from(new Set(endpoints.filter(Boolean)))
}

const endpointCandidates = buildGraphqlEndpoints()
const primaryEndpoint = endpointCandidates[0] ?? 'http://localhost/graphql'

if (endpointCandidates.length === 0) {
  console.warn(
    '[Mamboleo] ⚠ GraphQL endpoint is not configured. ' +
      'Set VITE_GRAPHQL_ENDPOINT or VITE_WP_URL in .env.',
  )
}

async function resilientGraphqlFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestedUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url

  const orderedCandidates = Array.from(new Set([requestedUrl, ...endpointCandidates]))

  let lastResponse: Response | null = null
  let lastError: unknown = null

  for (const candidate of orderedCandidates) {
    try {
      const response = await fetch(candidate, init)
      if (response.ok) return response
      lastResponse = response
    } catch (err) {
      lastError = err
    }
  }

  if (lastResponse) return lastResponse
  throw lastError instanceof Error ? lastError : new Error('GraphQL network request failed')
}

export const graphqlClient = new GraphQLClient(primaryEndpoint, {
  headers: {
    'Content-Type': 'application/json',
  },
  fetch: resilientGraphqlFetch,
})

export const INCIDENTS_QUERY = gql`
  query GetIncidents {
    incidents(first: 100, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        date
        excerpt(format: RAW)
        content(format: RAW)
        incidentFields {
          type
          latitude
          longitude
          severity
          status
          incidentTime
          videoUrl
          reporterName
          isAnonymous
          isVerified
          corroborationCount
          lifecycle
          lastUpdateAt
          updateCount
        }
      }
    }
  }
`

const INCIDENTS_QUERY_LEGACY = gql`
  query GetIncidentsLegacy {
    incidents(first: 100, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        date
        excerpt(format: RAW)
        incidentFields {
          type
          latitude
          longitude
          severity
          status
          incidentTime
          videoUrl
          reporterName
          isAnonymous
          isVerified
          corroborationCount
          lifecycle
          lastUpdateAt
          updateCount
        }
      }
    }
  }
`

const KNOWN_TYPES = new Set(['fire', 'accident', 'police', 'weather', 'protest', 'flood', 'medical', 'military', 'info', 'health', 'environmental', 'homicide', 'femicide'])

function normalizeIncident(raw: RawIncident): Incident {
  const rawType = String(raw.incidentFields.type ?? '').toLowerCase()
  const type = (KNOWN_TYPES.has(rawType) ? rawType : 'accident') as Incident['incidentFields']['type']

  const rawSev = String(raw.incidentFields.severity ?? 'medium').toLowerCase()
  const severity = (['low', 'medium', 'high'].includes(rawSev) ? rawSev : 'medium') as Incident['incidentFields']['severity']

  const lat = Number(raw.incidentFields.latitude)
  const lng = Number(raw.incidentFields.longitude)

  const KNOWN_LIFECYCLES = new Set(['active', 'developing', 'resolved', 'archived'])
  const rawLife = String(raw.incidentFields.lifecycle ?? 'active').toLowerCase()
  const lifecycle = (KNOWN_LIFECYCLES.has(rawLife) ? rawLife : 'active') as Incident['incidentFields']['lifecycle']

  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    excerpt: raw.excerpt ?? '',
    content: raw.content ?? '',
    incidentFields: {
      type,
      latitude: Number.isFinite(lat) ? lat : 0,
      longitude: Number.isFinite(lng) ? lng : 0,
      severity,
      status: (raw.incidentFields.status as Incident['incidentFields']['status']) ?? 'unknown',
      incidentTime: raw.incidentFields.incidentTime ?? null,
      videoUrl: raw.incidentFields.videoUrl ?? null,
      reporterName: raw.incidentFields.reporterName ?? null,
      isAnonymous: raw.incidentFields.isAnonymous ?? true,
      isVerified: raw.incidentFields.isVerified ?? true,
      corroborationCount: raw.incidentFields.corroborationCount ?? 0,
      lifecycle,
      lastUpdateAt: raw.incidentFields.lastUpdateAt ?? null,
      updateCount: raw.incidentFields.updateCount ?? 0,
    },
  }
}

export async function fetchIncidents(): Promise<Incident[]> {
  let data: IncidentsQueryResult
  try {
    data = await graphqlClient.request<IncidentsQueryResult>(INCIDENTS_QUERY)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('Cannot query field "content"')) {
      data = await graphqlClient.request<IncidentsQueryResult>(INCIDENTS_QUERY_LEGACY)
    } else {
      throw err
    }
  }

  return data.incidents.nodes
    .map(normalizeIncident)
    // Drop incidents with invalid coordinates — they can't be plotted
    .filter((i) => i.incidentFields.latitude !== 0 || i.incidentFields.longitude !== 0)
    // Hide archived incidents from the public map
    .filter((i) => i.incidentFields.lifecycle !== 'archived')
}
