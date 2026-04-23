// ─── Embassy / government travel advisories ──────────────────────────────
//
// Fetches Kenya travel advisories issued by foreign ministries (UK FCDO,
// US State Dept, France MAE, Canada Global Affairs, Australia
// Smartraveller). These are stored as `article` posts in WordPress by the
// `advisories.py` scraper, with a `source` meta field identifying the
// issuer.
//
// We filter client-side by known embassy source names so the banner only
// surfaces official advisories, not general news articles.

import { gql } from 'graphql-request'
import { graphqlClient } from './graphql'

// Sources recognised as embassy / government travel advisories.
// Keep in sync with scraper/scrapers/advisories.py.
export const EMBASSY_SOURCES = [
  'UK FCDO',
  'US State Dept',
  'France MAE',
  'Canada Global Affairs',
  'Australia Smartraveller',
  'Germany Auswärtiges Amt',
  'Japan MOFA',
  'Ireland DFA',
  'New Zealand SafeTravel',
] as const

export type EmbassySource = (typeof EMBASSY_SOURCES)[number]

export interface Advisory {
  id: string
  title: string
  date: string
  excerpt: string
  source: EmbassySource | string
  articleUrl: string | null
}

interface RawArticle {
  id: string
  title: string
  date: string
  excerpt: string | null
  source: string | null
  articleUrl: string | null
}

interface ArticlesQueryResult {
  articles: {
    nodes: RawArticle[]
  }
}

const ADVISORIES_QUERY = gql`
  query GetAdvisories {
    articles(first: 50, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        date
        excerpt(format: RAW)
        source
        articleUrl
      }
    }
  }
`

// Strip HTML tags and collapse whitespace from WP excerpts.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchEmbassyAdvisories(): Promise<Advisory[]> {
  const data = await graphqlClient.request<ArticlesQueryResult>(ADVISORIES_QUERY)
  return data.articles.nodes
    .filter((a) => a.source && EMBASSY_SOURCES.includes(a.source as EmbassySource))
    .map<Advisory>((a) => ({
      id: a.id,
      title: a.title,
      date: a.date,
      excerpt: stripHtml(a.excerpt ?? '').slice(0, 280),
      source: a.source as EmbassySource,
      articleUrl: a.articleUrl,
    }))
}
