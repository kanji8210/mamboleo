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
        }
      }
    }
  }
`

function normalizeIncident(raw: RawIncident): Incident {
  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    excerpt: raw.excerpt ?? '',
    incidentFields: {
      type: raw.incidentFields.type as Incident['incidentFields']['type'],
      latitude: Number(raw.incidentFields.latitude),
      longitude: Number(raw.incidentFields.longitude),
      severity: raw.incidentFields.severity as Incident['incidentFields']['severity'],
      status: (raw.incidentFields.status as Incident['incidentFields']['status']) ?? 'unknown',
      incidentTime: raw.incidentFields.incidentTime ?? null,
      videoUrl: raw.incidentFields.videoUrl ?? null,
      reporterName: raw.incidentFields.reporterName ?? null,
      isAnonymous: raw.incidentFields.isAnonymous ?? true,
      isVerified: raw.incidentFields.isVerified ?? true,
      corroborationCount: raw.incidentFields.corroborationCount ?? 0,
    },
  }
}

export async function fetchIncidents(): Promise<Incident[]> {
  const data = await graphqlClient.request<IncidentsQueryResult>(INCIDENTS_QUERY)
  return data.incidents.nodes.map(normalizeIncident)
}
