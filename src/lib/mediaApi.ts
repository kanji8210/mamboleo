// ─── Media Monitor — article feed + trend aggregates ─────────────────────
//
// Reads from:
//   • WPGraphQL  for the article feed (supports pagination + filtering)
//   • REST /wp-json/mamboleo/v1/trends  for aggregate counts
//
// GraphQL is used for the feed because WPGraphQL already proxies cleanly
// through Vercel /graphql → WordPress. REST is fine for /trends because
// the numbers are cached server-side for 5 minutes and the response is tiny.

import { gql } from 'graphql-request'
import { graphqlClient } from './graphql'

// ─── Types ────────────────────────────────────────────────────────────────

export type Sentiment = 'positive' | 'neutral' | 'negative'

export interface MediaArticle {
  id: string
  title: string
  date: string
  publishedAt: string | null
  excerpt: string
  source: string
  articleUrl: string | null
  tier: number
  sentiment: Sentiment
  sentimentScore: number
  biasScore: number          // -100 (left) .. +100 (right)
  topics: string[]
  keywords: string[]
  entities: { persons: string[]; orgs: string[]; places: string[] }
}

export interface TrendBucket {
  name: string
  count: number
}

export interface TrendsResult {
  window: '1h' | '24h' | '7d' | '30d'
  total: number
  by_source: TrendBucket[]
  by_topic: TrendBucket[]
  by_sentiment: { positive: number; neutral: number; negative: number }
  by_tier: Record<'1' | '2' | '3' | '4' | '5', number>
  top_entities: {
    persons: TrendBucket[]
    orgs: TrendBucket[]
    places: TrendBucket[]
  }
  timeline: { date: string; count: number }[]
}

// ─── Feed (GraphQL) ───────────────────────────────────────────────────────

interface RawArticle {
  id: string
  title: string
  date: string
  publishedAt: string | null
  excerpt: string | null
  source: string | null
  articleUrl: string | null
  tier: number | null
  sentiment: string | null
  sentimentScore: number | null
  biasScore: number | null
  topics: string[] | null
  keywords: string[] | null
  entitiesJson: string | null
}

interface FeedQueryResult {
  articles: {
    nodes: RawArticle[]
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
  }
}

const FEED_QUERY = gql`
  query GetMediaFeed($first: Int!, $after: String) {
    articles(first: $first, after: $after, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        date
        excerpt(format: RAW)
        source
        articleUrl
        tier
        publishedAt
        sentiment
        sentimentScore
        biasScore
        topics
        keywords
        entitiesJson
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normaliseSentiment(s: string | null): Sentiment {
  if (s === 'positive' || s === 'negative') return s
  return 'neutral'
}

function parseEntities(json: string | null): MediaArticle['entities'] {
  if (!json) return { persons: [], orgs: [], places: [] }
  try {
    const parsed = JSON.parse(json)
    return {
      persons: Array.isArray(parsed.persons) ? parsed.persons : [],
      orgs:    Array.isArray(parsed.orgs)    ? parsed.orgs    : [],
      places:  Array.isArray(parsed.places)  ? parsed.places  : [],
    }
  } catch {
    return { persons: [], orgs: [], places: [] }
  }
}

function normaliseArticle(raw: RawArticle): MediaArticle {
  return {
    id: raw.id,
    title: raw.title,
    date: raw.date,
    publishedAt: raw.publishedAt ?? null,
    excerpt: stripHtml(raw.excerpt ?? '').slice(0, 320),
    source: raw.source ?? 'Unknown',
    articleUrl: raw.articleUrl ?? null,
    tier: raw.tier ?? 3,
    sentiment: normaliseSentiment(raw.sentiment),
    sentimentScore: raw.sentimentScore ?? 0,
    biasScore: raw.biasScore ?? 0,
    topics: raw.topics ?? [],
    keywords: raw.keywords ?? [],
    entities: parseEntities(raw.entitiesJson),
  }
}

export interface MediaFeedPage {
  articles: MediaArticle[]
  nextCursor: string | null
}

export async function fetchMediaFeed(
  cursor: string | null = null,
  first = 20,
): Promise<MediaFeedPage> {
  const data = await graphqlClient.request<FeedQueryResult>(FEED_QUERY, {
    first,
    after: cursor,
  })
  return {
    articles: data.articles.nodes.map(normaliseArticle),
    nextCursor: data.articles.pageInfo.hasNextPage ? data.articles.pageInfo.endCursor : null,
  }
}

// ─── Trends (REST) ────────────────────────────────────────────────────────

// Resolve the REST base from the GraphQL endpoint — avoids a second env var.
function trendsUrl(window: TrendsResult['window']): string {
  const gql = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? ''
  const base = gql.replace(/\/graphql\/?$/, '')
  return `${base}/wp-json/mamboleo/v1/trends?window=${window}`
}

export async function fetchTrends(
  window: TrendsResult['window'] = '24h',
): Promise<TrendsResult> {
  const resp = await fetch(trendsUrl(window), { headers: { Accept: 'application/json' } })
  if (!resp.ok) {
    throw new Error(`Trends fetch failed: HTTP ${resp.status}`)
  }
  return resp.json()
}
