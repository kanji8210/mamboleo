import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, LogOut, Play, RefreshCw, Search, ShieldCheck, TimerReset } from 'lucide-react'
import { toast, Toaster } from 'sonner'

import {
  addAdminIncidentUpdate,
  extendAdminIncident,
  fixAdminIncidentLocation,
  getAdminDashboard,
  getAdminIncident,
  getAdminScraperLog,
  getAdminSession,
  listAdminCounties,
  listAdminCountries,
  listAdminIncidents,
  listAdminUpdates,
  listExpiringAdminIncidents,
  loginAdmin,
  logoutAdmin,
  moderateAdminUpdate,
  reanalyseAdminIncident,
  reviewAdminIncident,
  runAdminScraper,
  saveAdminIncident,
  type AdminIncident,
} from '@/lib/adminApi'

const INCIDENT_SCOPES = ['active', 'pending', 'archived'] as const
const POST_STATUSES = ['pending', 'publish', 'draft'] as const
const INCIDENT_TYPES = ['fire', 'accident', 'police', 'weather', 'protest', 'flood', 'medical', 'military', 'info', 'health', 'environmental', 'homicide', 'femicide']
const SEVERITIES = ['low', 'medium', 'high']
const INCIDENT_SITUATIONS = ['unsafe', 'all_clear', 'police_operating', 'police_aggressive', 'unknown']
const LIFECYCLES = ['active', 'developing', 'resolved', 'archived']

type EditorState = Partial<AdminIncident>

export function AdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [credentials, setCredentials] = useState({ username: '', password: '', remember: true })
  const [incidentScope, setIncidentScope] = useState<(typeof INCIDENT_SCOPES)[number]>('active')
  const [search, setSearch] = useState('')
  const [reviewOnly, setReviewOnly] = useState(true)
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [adminUpdateBody, setAdminUpdateBody] = useState('')
  const [updateTab, setUpdateTab] = useState<'pending' | 'publish' | 'trash'>('pending')
  const [expiringNotes, setExpiringNotes] = useState<Record<number, string>>({})

  const sessionQuery = useQuery({
    queryKey: ['admin-session'],
    queryFn: getAdminSession,
    retry: false,
  })

  const isAuthorized = sessionQuery.data?.authorized === true

  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
    enabled: isAuthorized,
    refetchInterval: 30_000,
  })

  const incidentsQuery = useQuery({
    queryKey: ['admin-incidents', incidentScope, search, reviewOnly],
    queryFn: () =>
      listAdminIncidents({
        scope: incidentScope,
        search,
        needsReview: reviewOnly ? true : undefined,
        page: 1,
        perPage: 30,
      }),
    enabled: isAuthorized,
  })

  const selectedIncidentQuery = useQuery({
    queryKey: ['admin-incident', selectedIncidentId],
    queryFn: () => getAdminIncident(selectedIncidentId as number),
    enabled: isAuthorized && selectedIncidentId !== null,
  })

  const updatesQuery = useQuery({
    queryKey: ['admin-updates', updateTab],
    queryFn: () => listAdminUpdates(updateTab),
    enabled: isAuthorized,
  })

  const expiringQuery = useQuery({
    queryKey: ['admin-expiring'],
    queryFn: listExpiringAdminIncidents,
    enabled: isAuthorized,
  })

  const countiesQuery = useQuery({
    queryKey: ['admin-counties'],
    queryFn: listAdminCounties,
    enabled: isAuthorized,
    staleTime: Infinity,
  })

  const countriesQuery = useQuery({
    queryKey: ['admin-countries'],
    queryFn: listAdminCountries,
    enabled: isAuthorized,
    staleTime: Infinity,
  })

  const scraperLogQuery = useQuery({
    queryKey: ['admin-scraper-log'],
    queryFn: getAdminScraperLog,
    enabled: isAuthorized,
    refetchInterval: (query) => {
      const data = query.state.data as { done?: boolean } | undefined
      return data?.done === false ? 4000 : 15000
    },
  })

  useEffect(() => {
    const first = incidentsQuery.data?.items[0]
    if (!selectedIncidentId && first) setSelectedIncidentId(first.id)
  }, [incidentsQuery.data?.items, selectedIncidentId])

  useEffect(() => {
    if (selectedIncidentQuery.data) setEditor(selectedIncidentQuery.data)
  }, [selectedIncidentQuery.data])

  const selectedCounty = useMemo(
    () => (editor?.locationCountry === 'kenya' ? countiesQuery.data?.find((county) => county.slug === editor?.locationCounty) : undefined),
    [countiesQuery.data, editor?.locationCountry, editor?.locationCounty],
  )

  const loginMutation = useMutation({
    mutationFn: () => loginAdmin(credentials.username, credentials.password, credentials.remember),
    onSuccess: async (session) => {
      toast.success('Admin session started')
      queryClient.setQueryData(['admin-session'], session)
      await queryClient.invalidateQueries({ queryKey: ['admin-session'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      navigate('/admin', { replace: true })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const logoutMutation = useMutation({
    mutationFn: logoutAdmin,
    onSuccess: async () => {
      setSelectedIncidentId(null)
      setEditor(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-session'] })
      toast.success('Logged out')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<AdminIncident>) => saveAdminIncident(selectedIncidentId as number, payload),
    onSuccess: async (saved) => {
      setEditor(saved)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-incidents'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-incident', selectedIncidentId] }),
      ])
      toast.success('Incident saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) => reviewAdminIncident(id, action),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-incidents'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ])
      toast.success('Review action saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const adminUpdateMutation = useMutation({
    mutationFn: (body: string) => addAdminIncidentUpdate(selectedIncidentId as number, body),
    onSuccess: async () => {
      setAdminUpdateBody('')
      await queryClient.invalidateQueries({ queryKey: ['admin-incident', selectedIncidentId] })
      toast.success('Admin update published')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateModerationMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) => moderateAdminUpdate(id, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-updates'] })
      toast.success('Update moderated')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const reanalyseMutation = useMutation({
    mutationFn: (id: number) => reanalyseAdminIncident(id),
    onSuccess: () => toast.success('Reanalysis queued'),
    onError: (error: Error) => toast.error(error.message),
  })

  const fixLocationMutation = useMutation({
    mutationFn: () =>
      fixAdminIncidentLocation(selectedIncidentId as number, {
        country: editor?.locationCountry,
        county: editor?.locationCounty,
        subcounty: editor?.locationSubcounty,
      }),
    onSuccess: () => toast.success('Location adjusted'),
    onError: (error: Error) => toast.error(error.message),
  })

  const runScraperMutation = useMutation({
    mutationFn: runAdminScraper,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-scraper-log'] })
      toast.success('Scraper started')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const extendMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: string }) => extendAdminIncident(id, body),
    onSuccess: async (_, vars) => {
      setExpiringNotes((current) => ({ ...current, [vars.id]: '' }))
      await queryClient.invalidateQueries({ queryKey: ['admin-expiring'] })
      toast.success('Incident extended')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function updateField<K extends keyof AdminIncident>(field: K, value: AdminIncident[K]) {
    setEditor((current) => (current ? { ...current, [field]: value } : current))
  }

  function handleLogin(event: FormEvent) {
    event.preventDefault()
    loginMutation.mutate()
  }

  function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!editor || !selectedIncidentId) return
    saveMutation.mutate(editor)
  }

  if (sessionQuery.isLoading) {
    return <div className="grid min-h-screen place-items-center">Loading admin session...</div>
  }

  if (!isAuthorized) {
    return (
      <>
        <div className="min-h-screen bg-background text-foreground px-4 py-10">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
            <section className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-red-200">
                <ShieldCheck size={14} /> Frontend Admin
              </div>
              <h1 className="text-4xl font-black tracking-tight">Run incident operations from the live frontend.</h1>
              <p className="text-sm text-muted-foreground">
                Sign in with your WordPress admin account to review incidents, edit fields, fix locations, moderate updates, and launch scraping.
              </p>
              <Link to="/" className="inline-flex min-h-[44px] items-center rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground hover:bg-accent">
                Back to public site
              </Link>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Admin login</h2>
                {sessionQuery.data?.authenticated && (
                  <button
                    type="button"
                    onClick={() => logoutMutation.mutate()}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-accent"
                  >
                    <LogOut size={13} /> Logout
                  </button>
                )}
              </div>
              {sessionQuery.data?.authenticated && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Session active{sessionQuery.data?.user?.name ? ` as ${sessionQuery.data.user.name}` : ''}
                </p>
              )}
              <form className="mt-4 space-y-3" onSubmit={handleLogin}>
                <input
                  className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4"
                  value={credentials.username}
                  onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
                  placeholder="Username or email"
                  autoComplete="username"
                />
                <input
                  type="password"
                  className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4"
                  value={credentials.password}
                  onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <label className="flex items-center gap-3 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={credentials.remember}
                    onChange={(event) => setCredentials((current) => ({ ...current, remember: event.target.checked }))}
                  />
                  Keep me signed in
                </label>
                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="min-h-[46px] w-full rounded-2xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60"
                >
                  {loginMutation.isPending ? 'Signing in...' : 'Open admin console'}
                </button>
              </form>
            </section>
          </div>
        </div>
        <Toaster position="top-center" richColors closeButton />
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-red-300">Mamboleo Admin Console</div>
              <h1 className="text-3xl font-black tracking-tight">Incident operations</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-accent">
                <RefreshCw size={14} /> Refresh
              </button>
              <button type="button" onClick={() => runScraperMutation.mutate()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500">
                <Play size={14} /> Run scraper
              </button>
              <button type="button" onClick={() => logoutMutation.mutate()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-accent">
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Published</div><div className="mt-2 text-3xl font-black">{dashboardQuery.data?.counts.publishedIncidents ?? 0}</div></div>
            <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Review queue</div><div className="mt-2 text-3xl font-black">{dashboardQuery.data?.counts.reviewQueue ?? 0}</div></div>
            <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pending updates</div><div className="mt-2 text-3xl font-black">{dashboardQuery.data?.counts.pendingUpdates ?? 0}</div></div>
            <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Expiring soon</div><div className="mt-2 text-3xl font-black">{dashboardQuery.data?.counts.expiringSoon ?? 0}</div></div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(420px,1.2fr)_minmax(420px,1fr)]">
            <section className="space-y-4">
              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search incidents"
                    className="min-h-[46px] w-full rounded-2xl border border-input bg-background pl-10 pr-4"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {INCIDENT_SCOPES.map((scope) => (
                    <button key={scope} type="button" onClick={() => setIncidentScope(scope)} className={`rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] ${incidentScope === scope ? 'bg-red-600 text-white' : 'bg-accent text-muted-foreground'}`}>
                      {scope}
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                  <input type="checkbox" checked={reviewOnly} onChange={(event) => setReviewOnly(event.target.checked)} />
                  Review queue only
                </label>
                <div className="mt-3 space-y-2 max-h-[70vh] overflow-y-auto">
                  {incidentsQuery.data?.items.map((incident) => (
                    <button key={incident.id} type="button" onClick={() => setSelectedIncidentId(incident.id)} className={`w-full rounded-2xl border p-3 text-left ${selectedIncidentId === incident.id ? 'border-red-500/40 bg-red-500/10' : 'border-border bg-background'}`}>
                      <div className="text-sm font-semibold">{incident.title}</div>
                      <div className="text-xs text-muted-foreground">{incident.type} · {incident.status}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="text-sm font-semibold">Scraper log</div>
                <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-border bg-zinc-950 p-3 text-[11px] leading-5 text-zinc-200">{scraperLogQuery.data?.tail || 'No scraper output yet.'}</pre>
              </div>
            </section>

            <section>
              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="text-sm font-semibold">Incident editor</div>
                {!editor && <div className="mt-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Select an incident to edit.</div>}
                {editor && (
                  <form className="mt-3 space-y-3" onSubmit={handleSave}>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Title</span>
                      <input aria-label="Incident title" className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4" value={editor.title ?? ''} onChange={(event) => updateField('title', event.target.value)} />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <select aria-label="Post status" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.status ?? 'pending'} onChange={(event) => updateField('status', event.target.value)}>{POST_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                      <select aria-label="Incident type" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.type ?? 'fire'} onChange={(event) => updateField('type', event.target.value)}>{INCIDENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                      <select aria-label="Incident severity" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.severity ?? 'low'} onChange={(event) => updateField('severity', event.target.value)}>{SEVERITIES.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <select aria-label="Incident status" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.incidentStatus ?? 'unsafe'} onChange={(event) => updateField('incidentStatus', event.target.value)}>{INCIDENT_SITUATIONS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                      <select aria-label="Incident lifecycle" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.lifecycle ?? 'active'} onChange={(event) => updateField('lifecycle', event.target.value)}>{LIFECYCLES.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                      <input aria-label="Incident time" type="datetime-local" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.incidentTime ?? ''} onChange={(event) => updateField('incidentTime', event.target.value)} />
                    </div>
                    <input className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4" value={editor.locationName ?? ''} onChange={(event) => updateField('locationName', event.target.value)} placeholder="Location label" />
                    <input aria-label="Video URL" className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4" value={editor.videoUrl ?? ''} onChange={(event) => updateField('videoUrl', event.target.value)} placeholder="Video URL" />
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <input aria-label="Latitude" type="number" step="0.000001" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.latitude ?? 0} onChange={(event) => updateField('latitude', Number(event.target.value))} />
                      <input aria-label="Longitude" type="number" step="0.000001" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.longitude ?? 0} onChange={(event) => updateField('longitude', Number(event.target.value))} />
                      <select
                        aria-label="Country"
                        className="min-h-[46px] rounded-2xl border border-input bg-background px-4"
                        value={editor.locationCountry ?? 'kenya'}
                        onChange={(event) => {
                          const country = event.target.value
                          updateField('locationCountry', country)
                          if (country !== 'kenya') {
                            updateField('locationCounty', '')
                            updateField('locationSubcounty', '')
                            updateField('locationPrecision', 'country')
                          }
                        }}
                      >
                        {(countriesQuery.data ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                      <select
                        aria-label="County"
                        className="min-h-[46px] rounded-2xl border border-input bg-background px-4"
                        value={editor.locationCounty ?? ''}
                        disabled={(editor.locationCountry ?? 'kenya') !== 'kenya'}
                        onChange={(event) => updateField('locationCounty', event.target.value)}
                      >
                        <option value="">{(editor.locationCountry ?? 'kenya') === 'kenya' ? 'Select county' : 'Kenya only'}</option>
                        {(editor.locationCountry ?? 'kenya') === 'kenya' && (countiesQuery.data ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <select
                        aria-label="Subcounty"
                        className="min-h-[46px] rounded-2xl border border-input bg-background px-4"
                        value={editor.locationSubcounty ?? ''}
                        disabled={(editor.locationCountry ?? 'kenya') !== 'kenya'}
                        onChange={(event) => updateField('locationSubcounty', event.target.value)}
                      >
                        <option value="">{(editor.locationCountry ?? 'kenya') === 'kenya' ? 'Select subcounty' : 'Kenya only'}</option>
                        {(editor.locationCountry ?? 'kenya') === 'kenya' && (selectedCounty?.subs ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select aria-label="Location precision" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.locationPrecision ?? 'exact'} onChange={(event) => updateField('locationPrecision', event.target.value)}>
                        {['exact', 'subcounty', 'county', 'country'].map((precision) => <option key={precision} value={precision}>{precision}</option>)}
                      </select>
                      <input aria-label="Reporter name" className="min-h-[46px] rounded-2xl border border-input bg-background px-4" value={editor.reporterName ?? ''} onChange={(event) => updateField('reporterName', event.target.value)} placeholder="Reporter name" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                        <input type="checkbox" checked={Boolean(editor.needsReview)} onChange={(event) => updateField('needsReview', event.target.checked)} />
                        Needs review
                      </label>
                      <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                        <input type="checkbox" checked={Boolean(editor.isVerified)} onChange={(event) => updateField('isVerified', event.target.checked)} />
                        Verified
                      </label>
                    </div>
                    <textarea aria-label="Review reason" className="min-h-[90px] w-full rounded-2xl border border-input bg-background px-4 py-3" value={editor.reviewReason ?? ''} onChange={(event) => updateField('reviewReason', event.target.value)} placeholder="Review reason" />
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Excerpt</span>
                      <textarea aria-label="Incident excerpt" className="min-h-[90px] w-full rounded-2xl border border-input bg-background px-4 py-3" value={editor.excerpt ?? ''} onChange={(event) => updateField('excerpt', event.target.value)} placeholder="Short summary shown in lists and previews" />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Details</span>
                      <textarea aria-label="Incident details" className="min-h-[180px] w-full rounded-2xl border border-input bg-background px-4 py-3" value={editor.content ?? ''} onChange={(event) => updateField('content', event.target.value)} placeholder="Full incident details" />
                    </label>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <button type="submit" className="min-h-[46px] rounded-2xl bg-red-600 px-4 text-sm font-bold text-white">Save incident</button>
                      <button type="button" onClick={() => reviewMutation.mutate({ id: editor.id as number, action: 'approve' })} className="min-h-[46px] rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-100">Approve</button>
                      <button type="button" onClick={() => reviewMutation.mutate({ id: editor.id as number, action: 'reject' })} className="min-h-[46px] rounded-2xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-100">Reject</button>
                      <button type="button" onClick={() => fixLocationMutation.mutate()} className="min-h-[46px] rounded-2xl border border-border bg-background px-4 text-sm font-semibold">Snap location</button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <button type="button" onClick={() => reanalyseMutation.mutate(editor.id as number)} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold">
                        <Bot size={14} /> Queue reanalysis
                      </button>
                      <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                        Updates {editor.updateCount ?? 0} · Last {editor.lastUpdateAt || 'not recorded'}
                      </div>
                    </div>
                  </form>
                )}
              </div>

              <div className="mt-6 rounded-3xl border border-border bg-card p-4">
                <div className="text-sm font-semibold">Trusted admin update</div>
                <textarea value={adminUpdateBody} onChange={(event) => setAdminUpdateBody(event.target.value)} className="mt-3 min-h-[120px] w-full rounded-2xl border border-input bg-background px-4 py-3" placeholder="Write a trusted update..." />
                <button type="button" disabled={!selectedIncidentId || !adminUpdateBody.trim()} onClick={() => adminUpdateMutation.mutate(adminUpdateBody)} className="mt-3 min-h-[46px] w-full rounded-2xl bg-zinc-100 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60">
                  Publish trusted update
                </button>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Update moderation</div>
                  <div className="flex gap-2">
                    {(['pending', 'publish', 'trash'] as const).map((tab) => (
                      <button key={tab} type="button" onClick={() => setUpdateTab(tab)} className={`rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] ${updateTab === tab ? 'bg-red-600 text-white' : 'bg-accent text-muted-foreground'}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto">
                  {updatesQuery.data?.items.map((update) => (
                    <div key={update.id} className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-sm font-semibold">{update.incidentTitle || 'Detached update'}</div>
                      <div className="text-xs text-muted-foreground">{update.source} · {update.status}</div>
                      <p className="mt-2 text-sm text-zinc-300">{update.body}</p>
                      {update.status === 'pending' && (
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => updateModerationMutation.mutate({ id: update.id, action: 'approve' })} className="rounded-full bg-emerald-500 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white">Approve</button>
                          <button type="button" onClick={() => updateModerationMutation.mutate({ id: update.id, action: 'reject' })} className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-red-100">Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TimerReset size={15} className="text-red-300" /> Expiring incidents
                </div>
                <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto">
                  {expiringQuery.data?.items.map((incident) => (
                    <div key={incident.id} className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-sm font-semibold">{incident.title}</div>
                      <div className="text-xs text-muted-foreground">{incident.locationName || 'No location'} · expires {incident.expiresAt || 'soon'}</div>
                      <textarea
                        value={expiringNotes[incident.id] ?? ''}
                        onChange={(event) => setExpiringNotes((current) => ({ ...current, [incident.id]: event.target.value }))}
                        className="mt-2 min-h-[72px] w-full rounded-2xl border border-input bg-card px-4 py-3"
                        placeholder="Optional note"
                      />
                      <button
                        type="button"
                        onClick={() => extendMutation.mutate({ id: incident.id, body: expiringNotes[incident.id] ?? '' })}
                        className="mt-2 min-h-[42px] rounded-2xl bg-zinc-100 px-4 text-sm font-bold text-zinc-950"
                      >
                        Extend incident
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Toaster position="top-center" richColors closeButton />
    </>
  )
}
