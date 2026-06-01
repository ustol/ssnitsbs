import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Handshake, CalendarCheck, Users, MessageSquare, ArrowRight, Clock, Eye,
  AlertTriangle, MapPin, HardHat, ClipboardList, DollarSign, Wrench, CheckCircle2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { useDataWarehouse, useProjectActivities, buildActivitySummaries } from '@/hooks/useDataWarehouse'
import { useColocationLocations } from '@/hooks/useColocation'
import {
  useHealthScorecardReport,
  useExecutiveReport,
  useMeetingAnalyticsReport,
  useDDGIntelligenceReport,
  useUserPerformanceReport,
} from '@/hooks/useReports'
import { KPICard } from '@/components/shared/KPICard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatDate, formatNumber, calcProjection } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend,
} from 'recharts'

// ─── Colours ──────────────────────────────────────────────────────────────────
const BRAND   = '#E8621A'
const GREEN   = '#22c55e'
const INDIGO  = '#6366f1'
const AMBER   = '#f59e0b'
const RED     = '#ef4444'
const BLUE    = '#3b82f6'

const RAG_COLORS = { green: GREEN, amber: AMBER, red: RED }

// ─── Local base-stats hook ────────────────────────────────────────────────────

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
      const [partnerships, extMeetings, intMeetings, ddg] = await Promise.all([
        supabase.from('partnerships').select(
          `id, title, proposed_value, created_at,
           status:status_lookup(name, color),
           ext_stakeholders:partnership_external_stakeholders(stakeholder:external_stakeholders(id, name))`,
          { count: 'exact' },
        ),
        supabase.from('external_meetings').select('id', { count: 'exact' }),
        supabase.from('internal_meetings').select('id', { count: 'exact' }),
        supabase.from('ddg_feedback').select('id, is_actioned', { count: 'exact' }),
      ])
      return {
        totalPartnerships: partnerships.count ?? 0,
        totalExtMeetings:  extMeetings.count  ?? 0,
        totalIntMeetings:  intMeetings.count  ?? 0,
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

// ─── Mobile hook ─────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isMobile
}

// ─── Shared chart tooltip style ───────────────────────────────────────────────
const TIP = { contentStyle: { fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }, cursor: { fill: '#f4f4f5' } }

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-end gap-3 mb-3">
      <h2 className="text-sm font-semibold text-zinc-800">{children}</h2>
      {sub && <span className="text-xs text-zinc-400 mb-px hidden sm:inline">{sub}</span>}
    </div>
  )
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, sub, children, action }: {
  title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 py-3 px-4 sm:px-5 border-b">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{sub}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-3 sm:p-4">{children}</CardContent>
    </Card>
  )
}

// ─── Empty chart placeholder ──────────────────────────────────────────────────
function NoData({ h = 200 }: { h?: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-zinc-400" style={{ height: h }}>
      No data yet
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function Dashboard() {
  const { profile }  = useAuth()
  const { data: settings } = useSettings()

  const { data: stats,    isLoading: statsLoading   } = useDashboardStats()
  const { data: meetings, isLoading: meetingsLoading } = useRecentMeetings()
  const { data: locations } = useColocationLocations()

  const { data: execData  } = useExecutiveReport()
  const { data: ragData   } = useHealthScorecardReport()
  const { data: analytics } = useMeetingAnalyticsReport()
  const { data: ddgData   } = useDDGIntelligenceReport()
  const { data: perfData  } = useUserPerformanceReport()

  const { data: projects   = [] } = useDataWarehouse()
  const { data: activities = [] } = useProjectActivities()

  // ── Big Push derived stats ────────────────────────────────────────────────
  const bigPush = useMemo(() => {
    const summaries = buildActivitySummaries(activities)

    let totalRegistrations = 0
    let totalPayments      = 0
    let totalInspections   = 0

    const regionMap: Record<string, { region: string; Registrations: number; Payments: number; Inspections: number }> = {}
    const projectTotals: { name: string; total: number }[] = []

    for (const p of projects) {
      const s   = summaries[p.id]
      const reg = s?.registration?.value ?? 0
      const pay = s?.payment?.value      ?? 0
      const ins = s?.inspection?.value   ?? 0

      totalRegistrations += reg
      totalPayments      += pay
      totalInspections   += ins

      const region = p.region ?? 'Unknown'
      if (!regionMap[region]) regionMap[region] = { region, Registrations: 0, Payments: 0, Inspections: 0 }
      regionMap[region].Registrations += reg
      regionMap[region].Payments      += pay
      regionMap[region].Inspections   += ins

      projectTotals.push({ name: p.title.length > 22 ? p.title.slice(0, 22) + '…' : p.title, total: reg + pay + ins })
    }

    const contractors = new Set(projects.map(p => p.contractor).filter(Boolean)).size
    const byRegion    = Object.values(regionMap)
      .sort((a, b) => (b.Registrations + b.Payments + b.Inspections) - (a.Registrations + a.Payments + a.Inspections))
      .slice(0, 8)
    const topProjects = projectTotals.sort((a, b) => b.total - a.total).slice(0, 8)

    return {
      totalProjects: projects.length,
      contractors,
      totalRegistrations,
      totalPayments,
      totalInspections,
      byRegion,
      topProjects,
    }
  }, [projects, activities])

  const bestPct  = Number(settings?.best_case_pct  ?? 60)
  const worstPct = Number(settings?.worst_case_pct ?? 30)

  const isMobile = useIsMobile()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  // RAG donut data
  const ragPie = [
    { name: 'Healthy',   value: ragData?.greenCount ?? 0, color: GREEN },
    { name: 'Attention', value: ragData?.amberCount ?? 0, color: AMBER },
    { name: 'At Risk',   value: ragData?.redCount   ?? 0, color: RED   },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-5 lg:space-y-8 pb-10">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-zinc-900">
          {greeting}{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          {formatDate(new Date().toISOString())}
          <span className="hidden sm:inline"> · Here's what's happening today</span>
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — Partnerships KPIs
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <SectionLabel sub="partnerships & engagement overview">Partnerships Overview</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            title="Total Partnerships"
            value={stats?.totalPartnerships ?? 0}
            icon={<Handshake className="h-4 w-4" />}
            variant="brand"
            loading={statsLoading}
          />
          <KPICard
            title="Pipeline Value"
            value={execData?.totalProposed != null ? formatNumber(execData.totalProposed) : '—'}
            subtitle="total proposed"
            icon={<DollarSign className="h-4 w-4" />}
            variant="brand"
            loading={!execData && statsLoading}
          />
          <KPICard
            title="Total Meetings"
            value={(stats?.totalExtMeetings ?? 0) + (stats?.totalIntMeetings ?? 0)}
            subtitle={`${stats?.totalExtMeetings ?? 0} ext · ${stats?.totalIntMeetings ?? 0} int`}
            icon={<CalendarCheck className="h-4 w-4" />}
            variant="success"
            loading={statsLoading}
          />
          <KPICard
            title="Pending DDG"
            value={stats?.pendingDDG ?? 0}
            subtitle="unactioned items"
            icon={<MessageSquare className="h-4 w-4" />}
            variant={stats?.pendingDDG ? 'danger' : 'default'}
            loading={statsLoading}
          />
          <KPICard
            title="At-Risk"
            value={ragData?.redCount ?? '—'}
            subtitle="partnerships (RAG red)"
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={ragData?.redCount ? 'danger' : 'success'}
          />
          <KPICard
            title="Colocation Sites"
            value={locations?.length ?? '—'}
            subtitle="registered locations"
            icon={<MapPin className="h-4 w-4" />}
            variant="default"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — Big Push KPIs
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <SectionLabel sub="big push infrastructure programme">Big Push Programme</SectionLabel>
        <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPICard
              title="Total Projects"
              value={bigPush.totalProjects}
              icon={<HardHat className="h-4 w-4" />}
              variant="brand"
            />
            <KPICard
              title="Contractors"
              value={bigPush.contractors}
              subtitle="distinct contractors"
              icon={<Users className="h-4 w-4" />}
              variant="brand"
            />
            <KPICard
              title="Registrations"
              value={bigPush.totalRegistrations.toLocaleString()}
              subtitle="total logged"
              icon={<ClipboardList className="h-4 w-4" />}
              variant="success"
            />
            <KPICard
              title="Payments"
              value={bigPush.totalPayments.toLocaleString()}
              subtitle="total processed"
              icon={<DollarSign className="h-4 w-4" />}
              variant="success"
            />
            <KPICard
              title="Inspections"
              value={bigPush.totalInspections.toLocaleString()}
              subtitle="total conducted"
              icon={<Wrench className="h-4 w-4" />}
              variant="warning"
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — Pipeline Funnel + RAG Donut
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Pipeline value by status */}
        <div className="lg:col-span-3">
          <ChartCard
            title="Pipeline by Status"
            sub="proposed value (GHS) per partnership stage"
            action={
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
                <Link to="/partnerships">View all <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            }
          >
            {execData?.valueByStatus?.length ? (
              <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                <BarChart data={execData.valueByStatus} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} width={isMobile ? 72 : 90} />
                  <Tooltip {...TIP} formatter={(v: number) => [formatNumber(v), 'Proposed Value']} />
                  <Bar dataKey="value" fill={BRAND} radius={[0, 4, 4, 0]} name="Value" />
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData h={220} />}

            {/* Projection row */}
            {execData?.totalProposed != null && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
                {[
                  { label: 'Full Pipeline', value: execData.totalProposed, color: 'text-zinc-800' },
                  { label: `Best Case (${bestPct}%)`, value: calcProjection(execData.totalProposed, bestPct), color: 'text-green-600' },
                  { label: `Worst Case (${worstPct}%)`, value: calcProjection(execData.totalProposed, worstPct), color: 'text-amber-600' },
                ].map(p => (
                  <div key={p.label} className="text-center">
                    <p className={`text-sm font-bold tabular-nums ${p.color}`}>{formatNumber(p.value)}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{p.label}</p>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        {/* RAG Health Donut */}
        <div className="lg:col-span-2">
          <ChartCard title="Partnership Health" sub="RAG status distribution">
            {ragPie.length ? (
              <>
                <div className="relative" style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ragPie} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                        paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {ragPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centre label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-zinc-900">{ragData?.total ?? 0}</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5">
                  {[
                    { label: 'Healthy',   count: ragData?.greenCount ?? 0, color: GREEN, bg: 'bg-green-50',  text: 'text-green-700' },
                    { label: 'Attention', count: ragData?.amberCount ?? 0, color: AMBER, bg: 'bg-amber-50',  text: 'text-amber-700' },
                    { label: 'At Risk',   count: ragData?.redCount   ?? 0, color: RED,   bg: 'bg-red-50',    text: 'text-red-700'   },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${r.bg}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                        <span className={`text-xs font-medium ${r.text}`}>{r.label}</span>
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${r.text}`}>{r.count} partnerships</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <NoData h={220} />}
          </ChartCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 — Meeting Trend + DDG Trend
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* 12-month meeting area chart */}
        <div className="lg:col-span-3">
          <ChartCard
            title="Meeting Activity"
            sub="external & internal meetings over 12 months"
            action={
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
                <Link to="/meetings/external">View all <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            }
          >
            {analytics?.monthlyTrend?.length ? (
              <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                <AreaChart data={analytics.monthlyTrend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradExt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={BRAND}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BRAND}  stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradInt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={INDIGO} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={INDIGO} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...TIP} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="External" stroke={BRAND}  fill="url(#gradExt)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Internal" stroke={INDIGO} fill="url(#gradInt)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <NoData h={220} />}
          </ChartCard>
        </div>

        {/* DDG Feedback trend */}
        <div className="lg:col-span-2">
          <ChartCard title="DDG Feedback Trend" sub="pending vs actioned">
            {/* Action rate badge */}
            {ddgData != null && (
              <div className="flex items-center gap-2 mb-3">
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ddgData.actionRate >= 70 ? 'bg-green-50 text-green-700' : ddgData.actionRate >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  <CheckCircle2 size={12} />
                  {ddgData.actionRate}% actioned
                </div>
                <span className="text-xs text-zinc-400">{ddgData.pending} still pending</span>
              </div>
            )}
            {ddgData?.monthlyTrend?.length ? (
              <ResponsiveContainer width="100%" height={isMobile ? 150 : 180}>
                <LineChart data={ddgData.monthlyTrend} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...TIP} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="Pending"  stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Actioned" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <NoData h={180} />}
          </ChartCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5 — Big Push Charts
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <SectionLabel sub="big push infrastructure programme activity">Programme Activity</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Activity by Region */}
          <ChartCard title="Activity by Region" sub="registrations · payments · inspections">
            {bigPush.byRegion.length ? (
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
                <BarChart
                  data={isMobile ? bigPush.byRegion.slice(0, 4) : bigPush.byRegion}
                  margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="region" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...TIP} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  <Bar dataKey="Registrations" fill={BLUE}  radius={[3, 3, 0, 0]} barSize={isMobile ? 10 : 14} />
                  <Bar dataKey="Payments"      fill={GREEN} radius={[3, 3, 0, 0]} barSize={isMobile ? 10 : 14} />
                  <Bar dataKey="Inspections"   fill={AMBER} radius={[3, 3, 0, 0]} barSize={isMobile ? 10 : 14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData h={240} />
            )}
          </ChartCard>

          {/* Top Projects by Activity */}
          <ChartCard title="Top Projects by Activity" sub="total logged activity value">
            {bigPush.topProjects.filter(p => p.total > 0).length ? (
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
                <BarChart
                  data={bigPush.topProjects.filter(p => p.total > 0).slice(0, isMobile ? 5 : 8)}
                  layout="vertical"
                  margin={{ left: 4, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={isMobile ? 80 : 110} />
                  <Tooltip {...TIP} formatter={(v: number) => [v.toLocaleString(), 'Activity']} />
                  <Bar dataKey="total" fill={BRAND} radius={[0, 4, 4, 0]} name="Total Activity" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-center" style={{ height: 240 }}>
                <HardHat size={28} className="text-zinc-300" />
                <p className="text-sm text-zinc-400">No activity logged yet</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/data-warehouse">Go to Data Warehouse</Link>
                </Button>
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 6 — Cadence + Top Users + Recent Meetings
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Meeting cadence buckets */}
        <ChartCard title="Meeting Cadence" sub="days since last meeting per partnership">
          {analytics?.cadenceBuckets?.some(b => b.count > 0) ? (
            <ResponsiveContainer width="100%" height={isMobile ? 170 : 200}>
              <BarChart data={analytics.cadenceBuckets} layout="vertical" margin={{ left: 4, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip {...TIP} formatter={(v: number) => [v, 'Partnerships']} />
                <Bar dataKey="count" name="Partnerships" radius={[0, 4, 4, 0]}>
                  {(analytics.cadenceBuckets ?? []).map((entry, i) => (
                    <Cell key={i} fill={
                      entry.label === '0–14 days'   ? GREEN :
                      entry.label === '15–30 days'  ? BLUE  :
                      entry.label === '31–60 days'  ? AMBER :
                      entry.label === '60+ days'    ? RED   : '#a1a1aa'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData h={200} />}
        </ChartCard>

        {/* Top contributors */}
        <ChartCard title="Top Contributors" sub="by total records created">
          {perfData?.users?.filter(u => u.total > 0).length ? (
            <div className="space-y-2">
              {perfData.users.filter(u => u.total > 0).slice(0, 5).map((u, i) => {
                const name = (u.full_name ?? (u as { email?: string }).email ?? 'Unknown')
                const max  = perfData.users[0]?.total ?? 1
                return (
                  <div key={u.id} className="flex items-center gap-2">
                    <span className="w-4 text-[10px] font-bold text-zinc-400 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-zinc-800 truncate">{name}</span>
                        <span className="text-xs font-bold tabular-nums text-zinc-500 ml-2 shrink-0">{u.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.round((u.total / max) * 100)}%`, background: BRAND }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {u.partnerships_n}P · {u.ext_n}E · {u.int_n}I · {u.ddg_n}D
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <NoData h={200} />}
        </ChartCard>

        {/* Recent meetings */}
        <ChartCard
          title="Recent Meetings"
          sub="latest external meetings"
          action={
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link to="/meetings/external">All <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          }
        >
          {meetingsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : meetings?.length ? (
            <div className="space-y-2">
              {meetings.map((m: Record<string, unknown>) => (
                <Link
                  key={m.id as string}
                  to={`/meetings/external/${m.id}`}
                  className="flex items-start gap-2 group hover:bg-zinc-50 rounded-lg p-1.5 -mx-1.5"
                >
                  <Clock className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-800 truncate group-hover:text-brand">{m.title as string}</p>
                    <p className="text-[10px] text-zinc-400">
                      {(m.partnership as { title: string } | null)?.title} · {formatDate(m.meeting_date as string)}
                    </p>
                  </div>
                  <StatusBadge
                    status={(m.status as { name: string } | null)?.name ?? ''}
                    color={(m.status as { color: string } | null)?.color}
                  />
                </Link>
              ))}
            </div>
          ) : <NoData h={200} />}
        </ChartCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 7 — Recent Partnerships Table
      ══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5 border-b">
          <div>
            <CardTitle className="text-sm font-semibold">Recent Partnerships</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Latest additions with pipeline projections</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
            <Link to="/partnerships">View all <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {statsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32 ml-auto" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : stats?.recentPartnerships?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[0.8125rem]">
                <thead>
                  <tr className="border-b bg-zinc-50/60">
                    <th className="text-left px-5 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Partnership</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Stakeholders</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Proposed</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Best ({bestPct}%)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Worst ({worstPct}%)</th>
                    <th className="px-4 py-2.5 w-[44px]" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recentPartnerships.map(p => {
                    const proposed = p.proposed_value ?? 0
                    const names    = p.ext_stakeholders.map(e => e.stakeholder?.name).filter(Boolean).join(', ')
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/60">
                        <td className="px-5 py-3">
                          <Link to={`/partnerships/${p.id}`} className="font-medium hover:text-brand line-clamp-1">
                            {p.title}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(p.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[180px] hidden md:table-cell">
                          <span className="line-clamp-1 text-xs" title={names}>{names || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status?.name ?? ''} color={p.status?.color} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs hidden sm:table-cell">{formatNumber(proposed)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs text-green-600 font-medium hidden lg:table-cell">
                          {formatNumber(calcProjection(proposed, bestPct))}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs text-amber-600 font-medium hidden lg:table-cell">
                          {formatNumber(calcProjection(proposed, worstPct))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link to={`/partnerships/${p.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Handshake size={28} className="text-zinc-300" />
              <p className="text-sm text-zinc-400">No partnerships yet</p>
              <Button size="sm" asChild><Link to="/partnerships/new">Add partnership</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
