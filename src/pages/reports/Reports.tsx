import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart3, TrendingUp, Building2, Users, UserCheck, ChevronRight, Clock,
  Activity, Layers, CalendarDays, Inbox,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/hooks/useSettings'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatNumber, calcProjection } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#E8621A', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

function useReportData() {
  return useQuery({
    queryKey: ['report-data'],
    queryFn: async () => {
      const [partnerships, extMeetings, intMeetings, ddgFeedback, extStakeholders, intStakeholders] =
        await Promise.all([
          supabase.from('partnerships').select('id, title, proposed_value, status:status_lookup(name, color)'),
          supabase.from('external_meetings').select('id, meeting_date, partnership_id'),
          supabase.from('internal_meetings').select('id, meeting_date, partnership_id'),
          supabase.from('ddg_feedback').select('id, feedback_type, is_actioned, received_date'),
          supabase.from('external_stakeholders').select('id', { count: 'exact', head: true }),
          supabase.from('internal_stakeholders').select('id', { count: 'exact', head: true }),
        ])

      const partnershipsByStatus: Record<string, number> = {}
      let totalProposed = 0
      for (const p of partnerships.data ?? []) {
        const name = ((p as Record<string, unknown>).status as { name: string } | null)?.name ?? 'Unknown'
        partnershipsByStatus[name] = (partnershipsByStatus[name] ?? 0) + 1
        totalProposed += Number(p.proposed_value ?? 0)
      }

      const meetingsByMonth: Record<string, number> = {}
      for (const m of [...(extMeetings.data ?? []), ...(intMeetings.data ?? [])]) {
        if (!m.meeting_date) continue
        const month = m.meeting_date.slice(0, 7)
        meetingsByMonth[month] = (meetingsByMonth[month] ?? 0) + 1
      }

      const ddgByType: Record<string, number> = {}
      for (const f of ddgFeedback.data ?? []) {
        ddgByType[f.feedback_type] = (ddgByType[f.feedback_type] ?? 0) + 1
      }

      return {
        totalPartnerships: (partnerships.data ?? []).length,
        totalExtStakeholders: extStakeholders.count ?? 0,
        totalIntStakeholders: intStakeholders.count ?? 0,
        totalProposed,
        totalExtMeetings: (extMeetings.data ?? []).length,
        totalIntMeetings: (intMeetings.data ?? []).length,
        totalDDG: (ddgFeedback.data ?? []).length,
        pendingDDG: (ddgFeedback.data ?? []).filter(f => !f.is_actioned).length,
        partnershipsByStatus: Object.entries(partnershipsByStatus).map(([name, value]) => ({ name, value })),
        meetingsByMonth: Object.entries(meetingsByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([month, count]) => ({
            month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            count,
          })),
        ddgByType: Object.entries(ddgByType).map(([name, value]) => ({ name, value })),
      }
    },
  })
}

const REPORT_TYPES = [
  {
    title: 'Partnership Health Scorecard',
    description: 'RAG-rated health assessment — meeting cadence, status progression and open DDG exposure per partnership.',
    icon: Activity,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    to: '/reports/executive',
    countKey: 'totalPartnerships' as const,
    countLabel: 'Partnerships',
    count2Key: null,
    count2Label: 'RAG Scorecard',
  },
  {
    title: 'Pipeline & Progression',
    description: 'Funnel distribution by status, average dwell time per stage, and longest-open partnerships.',
    icon: Layers,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    btnClass: 'bg-violet-600 hover:bg-violet-700 text-white',
    to: '/reports/pipeline',
    countKey: 'totalPartnerships' as const,
    countLabel: 'Partnerships',
    count2Key: 'totalProposed' as const,
    count2Label: 'Proposed Members',
  },
  {
    title: 'Meeting Analytics',
    description: 'Meeting frequency trends, cadence gaps by partnership, and most active partnerships last 90 days.',
    icon: CalendarDays,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    btnClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    to: '/reports/meeting-analytics',
    countKey: 'totalExtMeetings' as const,
    countLabel: 'Ext. Meetings',
    count2Key: 'totalIntMeetings' as const,
    count2Label: 'Int. Meetings',
  },
  {
    title: 'DDG Intelligence',
    description: 'Feedback backlog, action rate, type breakdown, partnership attribution and monthly trends.',
    icon: Inbox,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    btnClass: 'bg-red-500 hover:bg-red-600 text-white',
    to: '/reports/ddg-intelligence',
    countKey: 'totalDDG' as const,
    countLabel: 'Total Items',
    count2Key: 'pendingDDG' as const,
    count2Label: 'Pending',
  },
  {
    title: 'External Stakeholder Report',
    description: 'Full activity report on external stakeholders — partnerships, meetings and engagement depth.',
    icon: Building2,
    iconBg: 'bg-orange-50',
    iconColor: 'text-brand',
    btnClass: 'bg-brand hover:bg-brand/90 text-white',
    to: '/reports/external-stakeholder',
    countKey: 'totalExtStakeholders' as const,
    countLabel: 'Stakeholders',
    count2Key: 'totalExtMeetings' as const,
    count2Label: 'Meetings',
  },
  {
    title: 'Internal Stakeholder Report',
    description: 'Activity report for departments — partnerships participated in and internal engagement.',
    icon: UserCheck,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    to: '/reports/internal-stakeholder',
    countKey: 'totalIntStakeholders' as const,
    countLabel: 'Departments',
    count2Key: 'totalIntMeetings' as const,
    count2Label: 'Int. Meetings',
  },
  {
    title: 'User Performance Report',
    description: 'Activity and performance per user — records created, meetings logged, DDG submissions.',
    icon: Users,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    btnClass: 'bg-green-600 hover:bg-green-700 text-white',
    to: '/reports/user-performance',
    countKey: null,
    countLabel: 'Users',
    count2Key: null,
    count2Label: 'Full Audit Trail',
  },
  {
    title: 'Status Time Analysis',
    description: 'How long partnerships stay in each status — transition frequencies, bottlenecks and trends.',
    icon: Clock,
    iconBg: 'bg-zinc-100',
    iconColor: 'text-zinc-600',
    btnClass: 'bg-zinc-700 hover:bg-zinc-800 text-white',
    to: '/reports/status-time',
    countKey: null,
    countLabel: 'Status History',
    count2Key: null,
    count2Label: 'Time Analysis',
  },
]

export function Reports() {
  const { data, isLoading } = useReportData()
  const { data: settings } = useSettings()

  const bestPct = Number(settings?.best_case_pct ?? 60)
  const worstPct = Number(settings?.worst_case_pct ?? 30)
  const totalProposed = data?.totalProposed ?? 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Executive Reports"
        subtitle="Select the type of report to generate"
      />

      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-3">
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon
          const c1 = rt.countKey && data ? data[rt.countKey] : null
          const c2 = rt.count2Key && data ? data[rt.count2Key] : null
          return (
            <div
              key={rt.title}
              className="rounded-xl border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className={`h-11 w-11 rounded-full flex items-center justify-center ${rt.iconBg}`}>
                <Icon className={`h-5 w-5 ${rt.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">{rt.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{rt.description}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {c1 !== null && (
                  <span className="text-xs border rounded px-2 py-0.5 bg-muted/40">
                    {formatNumber(c1 as number)} {rt.countLabel}
                  </span>
                )}
                {rt.countKey === null && (
                  <span className="text-xs border rounded px-2 py-0.5 bg-muted/40">{rt.countLabel}</span>
                )}
                {c2 !== null && (
                  <span className="text-xs border rounded px-2 py-0.5 bg-muted/40">
                    {formatNumber(c2 as number)} {rt.count2Label}
                  </span>
                )}
                {rt.count2Key === null && (
                  <span className="text-xs border rounded px-2 py-0.5 bg-muted/40">{rt.count2Label}</span>
                )}
              </div>
              <Button asChild size="sm" className={`w-full ${rt.btnClass}`}>
                <Link to={rt.to}>
                  Generate Report <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          )
        })}
      </div>

      {/* Quick overview KPIs */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Quick Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            {[
              { label: 'Partnerships', value: data?.totalPartnerships ?? 0, color: 'text-brand' },
              { label: 'Ext. Stakeholders', value: data?.totalExtStakeholders ?? 0, color: 'text-foreground' },
              { label: 'Ext. Meetings', value: data?.totalExtMeetings ?? 0, color: 'text-foreground' },
              { label: 'Int. Meetings', value: data?.totalIntMeetings ?? 0, color: 'text-foreground' },
              { label: 'DDG Feedback', value: data?.totalDDG ?? 0, color: 'text-foreground' },
              { label: 'Pending DDG', value: data?.pendingDDG ?? 0, color: 'text-red-500' },
            ].map(item => (
              <div key={item.label}>
                {isLoading ? (
                  <Skeleton className="h-10 mx-auto w-16" />
                ) : (
                  <>
                    <p className={`text-2xl font-semibold tabular-nums ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline projections — raw member counts, NOT currency */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            Pipeline Projections (2025 – 2028)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Proposed Members', amount: totalProposed, sub: '100% of pipeline', color: 'text-foreground' },
                { label: `Best Case (${bestPct}%)`, amount: calcProjection(totalProposed, bestPct), sub: `${bestPct}% realisation`, color: 'text-green-600' },
                { label: `Worst Case (${worstPct}%)`, amount: calcProjection(totalProposed, worstPct), sub: `${worstPct}% realisation`, color: 'text-amber-600' },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-lg border bg-zinc-50/60">
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className={`mt-1 text-2xl font-semibold tabular-nums ${item.color}`}>
                    {formatNumber(item.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Meetings over time */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold">Meetings Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? <Skeleton className="h-52" /> : data?.meetingsByMonth.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.meetingsByMonth} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} cursor={{ fill: '#f4f4f5' }} />
                  <Bar dataKey="count" fill="#E8621A" radius={[4, 4, 0, 0]} name="Meetings" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Partnerships by status */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold">Partnerships by Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? <Skeleton className="h-52" /> : data?.partnershipsByStatus.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.partnershipsByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {data.partnershipsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        {/* DDG by type */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold">DDG Feedback by Type</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? <Skeleton className="h-52" /> : data?.ddgByType.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.ddgByType} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        {/* DDG action rate */}
        <Card>
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold">DDG Action Rate</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {isLoading ? <Skeleton className="h-52" /> : (
              <div className="flex flex-col items-center justify-center h-[188px] gap-2">
                {data && data.totalDDG > 0 ? (
                  <>
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      <svg className="rotate-[-90deg]" viewBox="0 0 120 120" width="128" height="128">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#f4f4f5" strokeWidth="12" />
                        <circle
                          cx="60" cy="60" r="50" fill="none" stroke="#10b981" strokeWidth="12"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - (data.totalDDG - data.pendingDDG) / data.totalDDG)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <p className="text-2xl font-semibold tabular-nums">
                          {Math.round(((data.totalDDG - data.pendingDDG) / data.totalDDG) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">actioned</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                        {data.totalDDG - data.pendingDDG} actioned
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                        {data.pendingDDG} pending
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No feedback recorded</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
