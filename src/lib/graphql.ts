import { GraphQLClient, gql } from 'graphql-request'
import type { Incident, IncidentsQueryResult, RawIncident } from '@/types/incident'

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT

if (!endpoint || endpoint.includes('your-wordpress-site')) {
  console.warn(
    '[Mamboleo] ⚠ VITE_GRAPHQL_ENDPOINT is not configured.\n' +
      'Edit .env and set VITE_GRAPHQL_ENDPOINT to your WordPress GraphQL URL.',
  )
}

export const graphqlClient = new GraphQLClient(endpoint ?? 'http://localhost/graphql', {
  headers: {
    'Content-Type': 'application/json',
  },
})

export const INCIDENTS_QUERY = gql`
  query GetIncidents {
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
  const data = await graphqlClient.request<IncidentsQueryResult>(INCIDENTS_QUERY)
  return data.incidents.nodes
    .map(normalizeIncident)
    // Drop incidents with invalid coordinates — they can't be plotted
    .filter((i) => i.incidentFields.latitude !== 0 || i.incidentFields.longitude !== 0)
    // Hide archived incidents from the public map
    .filter((i) => i.incidentFields.lifecycle !== 'archived')
}
