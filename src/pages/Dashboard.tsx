import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Handshake, CalendarCheck, MessageSquare, ArrowRight, Clock,
  AlertTriangle, HardHat, DollarSign, Users, TrendingUp, Eye, ListChecks, XCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { useDataWarehouse, useProjectActivities, buildActivitySummaries } from '@/hooks/useDataWarehouse'
import { useActionPointStats } from '@/hooks/useActionPoints'
import {
  useHealthScorecardReport,
  useExecutiveReport,
  useMeetingAnalyticsReport,
} from '@/hooks/useReports'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatDate, formatNumber, calcProjection } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

// ─── Colours ──────────────────────────────────────────────────────────────────
const BRAND  = '#E8621A'
const GREEN  = '#22c55e'
const AMBER  = '#f59e0b'
const RED    = '#ef4444'

// ─── Data hooks ───────────────────────────────────────────────────────────────

type StakeholderEntry = { stakeholder: { id: string; name: string } | null }
type RecentPartnership = {
  id: string; title: string; proposed_value: number | null; created_at: string
  status: { name: string; color: string } | null
  ext_stakeholders: StakeholderEntry[]
}

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [partnerships, extMeetings, intMeetings, ddg, extThisMonth, intThisMonth] = await Promise.all([
        supabase.from('partnerships').select(
          `id, title, proposed_value, created_at,
           status:status_lookup(name, color),
           ext_stakeholders:partnership_external_stakeholders(stakeholder:external_stakeholders(id, name))`,
          { count: 'exact' },
        ),
        supabase.from('external_meetings').select('id', { count: 'exact' }),
        supabase.from('internal_meetings').select('id', { count: 'exact' }),
        supabase.from('ddg_feedback').select('id, is_actioned', { count: 'exact' }),
        supabase.from('external_meetings').select('id', { count: 'exact' }).gte('meeting_date', monthStart),
        supabase.from('internal_meetings').select('id', { count: 'exact' }).gte('meeting_date', monthStart),
      ])

      return {
        totalPartnerships: partnerships.count ?? 0,
        totalExtMeetings: extMeetings.count ?? 0,
        totalIntMeetings: intMeetings.count ?? 0,
        meetingsThisMonth: (extThisMonth.count ?? 0) + (intThisMonth.count ?? 0),
        pendingDDG: (ddg.data ?? []).filter((r: { is_actioned: boolean }) => !r.is_actioned).length,
        recentPartnerships: ((partnerships.data ?? []) as unknown as RecentPartnership[]).slice(0, 6),
      }
    },
  })
}

function useRecentMeetings() {
  return useQuery({
    queryKey: ['recent-meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_meetings')
        .select('id, title, meeting_date, partnership:partnerships(title), status:status_lookup(name, color)')
        .order('meeting_date', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
  })
}

// ─── Hero KPI card ─────────────────────────────────────────────────────────────
function HeroKPI({
  label, value, sub, icon, accent, loading,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
  accent?: 'brand' | 'danger' | 'success' | 'warning'
  loading?: boolean
}) {
  const colors = {
    brand:   { bg: 'bg-orange-50',  icon: 'text-brand',      border: 'border-orange-100' },
    danger:  { bg: 'bg-red-50',     icon: 'text-red-500',    border: 'border-red-100'    },
    success: { bg: 'bg-green-50',   icon: 'text-green-600',  border: 'border-green-100'  },
    warning: { bg: 'bg-amber-50',   icon: 'text-amber-500',  border: 'border-amber-100'  },
  }
  const c = colors[accent ?? 'brand']
  return (
    <div className={`rounded-xl border ${c.border} bg-white p-4 sm:p-5 flex items-start gap-3.5`}>
      <div className={`rounded-lg ${c.bg} p-2.5 shrink-0`}>
        <div className={c.icon}>{icon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p className="text-2xl font-bold text-zinc-900 tabular-nums leading-none">{value}</p>
        )}
        {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Tooltip style ─────────────────────────────────────────────────────────────
const TIP = { contentStyle: { fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }, cursor: { fill: '#f4f4f5' } }

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function Dashboard() {
  const { profile } = useAuth()
  const { data: settings } = useSettings()

  const { data: stats,    isLoading: statsLoading   } = useDashboardStats()
  const { data: meetings, isLoading: meetingsLoading } = useRecentMeetings()
  const { data: apStats } = useActionPointStats()
  const { data: execData  } = useExecutiveReport()
  const { data: ragData   } = useHealthScorecardReport()
  const { data: analytics } = useMeetingAnalyticsReport()

  const { data: projects   = [] } = useDataWarehouse()
  const { data: activities = [] } = useProjectActivities()

  const bestPct  = Number(settings?.best_case_pct  ?? 60)
  const worstPct = Number(settings?.worst_case_pct ?? 30)

  // Big Push summary numbers
  const bigPush = useMemo(() => {
    const summaries = buildActivitySummaries(activities)
    let totalActivity = 0
    for (const p of projects) {
      const s = summaries[p.id]
      totalActivity += (s?.registration?.value ?? 0) + (s?.payment?.value ?? 0) + (s?.inspection?.value ?? 0)
    }
    const contractors = new Set(projects.map(p => p.contractor).filter(Boolean)).size
    return { totalProjects: projects.length, contractors, totalActivity }
  }, [projects, activities])

  // RAG donut
  const ragPie = [
    { name: 'Healthy',   value: ragData?.greenCount ?? 0, color: GREEN },
    { name: 'Attention', value: ragData?.amberCount ?? 0, color: AMBER },
    { name: 'At Risk',   value: ragData?.redCount   ?? 0, color: RED   },
  ].filter(d => d.value > 0)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  // Meetings this month for display
  const monthName = new Date().toLocaleString('en-GH', { month: 'long' })

  return (
    <div className="space-y-6 pb-10">

      {/* ── Greeting ── */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{formatDate(new Date().toISOString())} · SSNIT Strategic Business Support</p>
        </div>
        <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
          <Link to="/reports"><TrendingUp className="h-3.5 w-3.5" />Full Reports</Link>
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ZONE 1 — Four hero KPIs
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <HeroKPI
          label="Total Pipeline Value"
          value={execData?.totalProposed != null ? formatNumber(execData.totalProposed) : '—'}
          sub={`best case: ${formatNumber(calcProjection(execData?.totalProposed ?? 0, bestPct))}`}
          icon={<DollarSign className="h-5 w-5" />}
          accent="brand"
          loading={!execData && statsLoading}
        />
        <HeroKPI
          label="Active Partnerships"
          value={stats?.totalPartnerships ?? '—'}
          sub={`${stats?.totalExtMeetings ?? 0} ext · ${stats?.totalIntMeetings ?? 0} int meetings`}
          icon={<Handshake className="h-5 w-5" />}
          accent="brand"
          loading={statsLoading}
        />
        <HeroKPI
          label={`Meetings in ${monthName}`}
          value={stats?.meetingsThisMonth ?? '—'}
          sub="external + internal"
          icon={<CalendarCheck className="h-5 w-5" />}
          accent="success"
          loading={statsLoading}
        />
        <HeroKPI
          label="Pending Actions"
          value={((stats?.pendingDDG ?? 0) + (apStats?.pending ?? 0)) || '—'}
          sub={`${stats?.pendingDDG ?? 0} DDG · ${apStats?.pending ?? 0} action points`}
          icon={<ListChecks className="h-5 w-5" />}
          accent={(stats?.pendingDDG ?? 0) + (apStats?.pending ?? 0) > 0 ? 'danger' : 'success'}
          loading={statsLoading && !apStats}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ZONE 2 — Attention alerts
      ══════════════════════════════════════════════════════════════ */}
      {((stats?.pendingDDG ?? 0) > 0 || (apStats?.failed ?? 0) > 0) && (
        <div className="space-y-2">
          {(stats?.pendingDDG ?? 0) > 0 && (
            <Link
              to="/feedback/ddg"
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100 transition-colors group"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-700 flex-1">
                {stats!.pendingDDG} DDG comment{stats!.pendingDDG > 1 ? 's' : ''} pending action
              </p>
              <ArrowRight className="h-4 w-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
          {(apStats?.failed ?? 0) > 0 && (
            <Link
              to="/action-points"
              className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 hover:bg-orange-100 transition-colors group"
            >
              <XCircle className="h-4 w-4 text-orange-500 shrink-0" />
              <p className="text-sm font-medium text-orange-700 flex-1">
                {apStats!.failed} action point{apStats!.failed > 1 ? 's' : ''} marked as failed
              </p>
              <ArrowRight className="h-4 w-4 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ZONE 3 — Pipeline chart + RAG donut
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Pipeline by Status */}
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5 border-b">
            <div>
              <CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Proposed value (GHS) per partnership stage</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link to="/partnerships">View all <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            {execData?.valueByStatus?.length ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={execData.valueByStatus} layout="vertical" margin={{ left: 4, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip {...TIP} formatter={(v: number) => [formatNumber(v), 'Proposed Value']} />
                    <Bar dataKey="value" fill={BRAND} radius={[0, 4, 4, 0]} name="Value" />
                  </BarChart>
                </ResponsiveContainer>
                {/* Projection row */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
                  {[
                    { label: 'Full Pipeline',          value: execData.totalProposed,                             color: 'text-zinc-800' },
                    { label: `Best Case (${bestPct}%)`,  value: calcProjection(execData.totalProposed, bestPct),  color: 'text-green-600' },
                    { label: `Worst Case (${worstPct}%)`, value: calcProjection(execData.totalProposed, worstPct), color: 'text-amber-600' },
                  ].map(p => (
                    <div key={p.label} className="text-center">
                      <p className={`text-sm font-bold tabular-nums ${p.color}`}>{formatNumber(p.value)}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{p.label}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center text-sm text-zinc-400" style={{ height: 200 }}>No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Partnership Health */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="py-3 px-5 border-b">
            <CardTitle className="text-sm font-semibold">Partnership Health</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">RAG status across all partnerships</p>
          </CardHeader>
          <CardContent className="p-4">
            {ragPie.length ? (
              <>
                <div className="relative" style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ragPie} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                        paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {ragPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-zinc-900">{ragData?.total ?? 0}</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Healthy',   count: ragData?.greenCount ?? 0, bg: 'bg-green-50',  text: 'text-green-700',  dot: GREEN },
                    { label: 'Attention', count: ragData?.amberCount ?? 0, bg: 'bg-amber-50',  text: 'text-amber-700',  dot: AMBER },
                    { label: 'At Risk',   count: ragData?.redCount   ?? 0, bg: 'bg-red-50',    text: 'text-red-700',    dot: RED   },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${r.bg}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.dot }} />
                        <span className={`text-xs font-medium ${r.text}`}>{r.label}</span>
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${r.text}`}>{r.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center text-sm text-zinc-400" style={{ height: 240 }}>No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ZONE 4 — Big Push compact strip
      ══════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-brand" />
            <p className="text-sm font-semibold text-zinc-800">Big Push Infrastructure Programme</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
            <Link to="/data-warehouse">Data Warehouse <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-orange-100">
          {[
            { label: 'Projects',       value: bigPush.totalProjects, icon: <HardHat className="h-4 w-4 text-brand" /> },
            { label: 'Contractors',    value: bigPush.contractors,   icon: <Users    className="h-4 w-4 text-brand" /> },
            { label: 'Total Activity', value: bigPush.totalActivity.toLocaleString(), icon: <TrendingUp className="h-4 w-4 text-brand" /> },
          ].map(s => (
            <div key={s.label} className="px-4 first:pl-0 last:pr-0 flex items-center gap-3">
              <div className="rounded-lg bg-white border border-orange-100 p-2 shrink-0">{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-zinc-900 tabular-nums leading-none">{s.value}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ZONE 5 — Recent Meetings + Recent Partnerships
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Meetings */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5 border-b">
            <CardTitle className="text-sm font-semibold">Recent Meetings</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link to="/meetings/external">All <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {meetingsLoading ? (
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-36" /><Skeleton className="h-2.5 w-24" /></div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : meetings?.length ? (
              <div className="divide-y">
                {meetings.map((m: Record<string, unknown>) => (
                  <Link
                    key={m.id as string}
                    to={`/meetings/external/${m.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 group transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-800 truncate group-hover:text-brand transition-colors">{m.title as string}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {(m.partnership as { title: string } | null)?.title} · {formatDate(m.meeting_date as string)}
                      </p>
                    </div>
                    <StatusBadge status={(m.status as { name: string } | null)?.name ?? ''} color={(m.status as { color: string } | null)?.color} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-zinc-400">No meetings yet</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Partnerships */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5 border-b">
            <CardTitle className="text-sm font-semibold">Recent Partnerships</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link to="/partnerships">All <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {statsLoading ? (
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-40" /><Skeleton className="h-2.5 w-24" /></div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                ))}
              </div>
            ) : stats?.recentPartnerships?.length ? (
              <div className="divide-y">
                {stats.recentPartnerships.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-800 truncate">{p.title}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {formatDate(p.created_at)}
                        {p.proposed_value ? ` · ${formatNumber(p.proposed_value)}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={p.status?.name ?? ''} color={p.status?.color} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                      <Link to={`/partnerships/${p.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Handshake size={24} className="text-zinc-300" />
                <p className="text-sm text-zinc-400">No partnerships yet</p>
                <Button size="sm" asChild><Link to="/partnerships/new">Add partnership</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
