type SessionResponse = {
  authenticated: boolean
  authorized: boolean
  nonce?: string
  user?: {
    id: number
    username: string
    name: string
    email: string
  } | null
}

export type AdminIncident = {
  id: number
  title: string
  content: string
  excerpt: string
  status: 'publish' | 'pending' | 'draft' | string
  date: string
  modified: string
  type: string
  severity: string
  incidentStatus: string
  incidentTime: string
  videoUrl: string
  latitude: number
  longitude: number
  locationName: string
  locationCountry: string
  locationCounty: string
  locationSubcounty: string
  locationPrecision: string
  lifecycle: string
  needsReview: boolean
  isVerified: boolean
  corroborationCount: number
  updateCount: number
  lastUpdateAt: string
  expiresAt: string
  reporterName: string
  articleUrl: string
  reviewReason: string
  classificationConfidence: number
  aiModel: string
  aiSummary: string
  aiFlags: string
  needsReanalysis: boolean
  updates?: AdminIncidentUpdate[]
}

export type AdminIncidentUpdate = {
  id: number
  incidentId: number
  incidentTitle: string
  title: string
  body: string
  status: string
  createdAt: string
  source: string
  reporter: string
}

export type AdminDashboard = {
  counts: {
    publishedIncidents: number
    pendingIncidents: number
    draftIncidents: number
    reviewQueue: number
    pendingUpdates: number
    publishedUpdates: number
    expiringSoon: number
  }
  scraper: {
    exists: boolean
    tail: string
    done: boolean
  }
  session: SessionResponse
}

type IncidentListResponse = {
  items: AdminIncident[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

type UpdatesResponse = {
  items: AdminIncidentUpdate[]
}

let restNonce = ''

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

function deriveWpRootFromGraphql(): string | null {
  const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT as string | undefined
  if (!endpoint) return null

  try {
    const url = new URL(endpoint)
    const path = url.pathname.replace(/\/$/, '')
    const wpPath = path.endsWith('/graphql') ? path.slice(0, -'/graphql'.length) : path
    return `${url.origin}${wpPath}`
  } catch {
    return null
  }
}

function apiBase() {
  const envBase = import.meta.env.VITE_WORDPRESS_REST_BASE as string | undefined
  if (envBase) {
    return trimTrailingSlash(envBase)
  }

  const wpUrl = import.meta.env.VITE_WP_URL as string | undefined
  if (wpUrl) {
    return `${trimTrailingSlash(wpUrl)}/wp-json/mamboleo/v1`
  }

  const graphqlRoot = deriveWpRootFromGraphql()
  if (graphqlRoot) {
    return `${trimTrailingSlash(graphqlRoot)}/wp-json/mamboleo/v1`
  }

  return `${window.location.origin}/wp-json/mamboleo/v1`
}

async function parseJson(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function request<T>(path: string, init: RequestInit = {}, useNonce = true): Promise<T> {
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (useNonce && restNonce) {
    headers.set('X-WP-Nonce', restNonce)
  }

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  const data = await parseJson(response)
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data as T
}

function stashNonce(session: SessionResponse) {
  restNonce = session.authorized && session.nonce ? session.nonce : ''
}

export async function getAdminSession() {
  const session = await request<SessionResponse>('/admin/session', { method: 'GET' }, false)
  stashNonce(session)
  return session
}

export async function loginAdmin(username: string, password: string, remember: boolean) {
  const session = await request<SessionResponse>(
    '/admin/session',
    {
      method: 'POST',
      body: JSON.stringify({ username, password, remember }),
    },
    false,
  )
  stashNonce(session)
  return session
}

export async function logoutAdmin() {
  await request<{ ok: boolean }>('/admin/session', { method: 'DELETE' }, false)
  restNonce = ''
}

export function getAdminDashboard() {
  return request<AdminDashboard>('/admin/dashboard')
}

export function listAdminIncidents(params: {
  status?: string
  search?: string
  needsReview?: boolean
  page?: number
  perPage?: number
}) {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.search) query.set('search', params.search)
  if (typeof params.needsReview === 'boolean') query.set('needsReview', String(params.needsReview))
  if (params.page) query.set('page', String(params.page))
  if (params.perPage) query.set('perPage', String(params.perPage))

  return request<IncidentListResponse>(`/admin/incidents?${query.toString()}`)
}

export function getAdminIncident(id: number) {
  return request<AdminIncident>(`/admin/incidents/${id}`)
}

export function saveAdminIncident(id: number, payload: Partial<AdminIncident>) {
  return request<AdminIncident>(`/admin/incidents/${id}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function reviewAdminIncident(id: number, action: 'approve' | 'reject') {
  return request<{ ok: boolean; status: string }>(`/admin/incidents/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export function addAdminIncidentUpdate(id: number, body: string, reporter = '') {
  return request<{ ok: boolean; update: AdminIncidentUpdate | null }>(`/admin/incidents/${id}/updates`, {
    method: 'POST',
    body: JSON.stringify({ body, reporter, source: 'admin' }),
  })
}

export function extendAdminIncident(id: number, body = '') {
  return request<{ ok: boolean }>(`/admin/incidents/${id}/extend`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function reanalyseAdminIncident(id: number) {
  return request<{ ok: boolean }>(`/admin/incidents/${id}/reanalyse`, {
    method: 'POST',
  })
}

export function fixAdminIncidentLocation(id: number, payload: {
  country?: string
  county?: string
  subcounty?: string
}) {
  return request(`/admin/incidents/${id}/fix-location`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listAdminUpdates(status: 'pending' | 'publish' | 'trash' = 'pending') {
  return request<UpdatesResponse>(`/admin/updates?status=${status}`)
}

export function moderateAdminUpdate(id: number, action: 'approve' | 'reject') {
  return request<{ ok: boolean; status: string }>(`/admin/updates/${id}/moderate`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export function listExpiringAdminIncidents() {
  return request<{ items: AdminIncident[] }>('/admin/expiring')
}

export function runAdminScraper() {
  return request<{ ok: boolean; message: string; scraper: { exists: boolean; tail: string; done: boolean } }>('/admin/scraper/run', {
    method: 'POST',
  })
}

export function getAdminScraperLog() {
  return request<{ exists: boolean; tail: string; done: boolean }>('/admin/scraper/log')
}

export function listAdminCounties() {
  return request<Array<{ name: string; slug: string; center: [number, number]; subs: string[] }>>('/admin/counties')
}

export function listAdminCountries() {
  return request<Array<{ name: string; slug: string; center: [number, number] }>>('/admin/countries')
}
