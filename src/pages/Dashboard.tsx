import { Link } from 'react-router-dom'
import { Handshake, CalendarCheck, Users, MessageSquare, ArrowRight, Clock, Eye } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { PageHeader } from '@/components/shared/PageHeader'
import { KPICard } from '@/components/shared/KPICard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatDate, formatNumber, calcProjection } from '@/lib/utils'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type StakeholderEntry = { stakeholder: { id: string; name: string } | null }
type RecentPartnership = {
  id: string
  title: string
  proposed_value: number | null
  created_at: string
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
           ext_stakeholders:partnership_external_stakeholders(
             stakeholder:external_stakeholders(id, name)
           )`,
          { count: 'exact' },
        ),
        supabase.from('external_meetings').select('id', { count: 'exact' }),
        supabase.from('internal_meetings').select('id', { count: 'exact' }),
        supabase.from('ddg_feedback').select('id, is_actioned', { count: 'exact' }),
      ])
      return {
        totalPartnerships: partnerships.count ?? 0,
        totalExtMeetings: extMeetings.count ?? 0,
        totalIntMeetings: intMeetings.count ?? 0,
        totalDDG: ddg.count ?? 0,
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
        .limit(6)
      if (error) throw error
      return data
    },
  })
}

function useMeetingChart() {
  return useQuery({
    queryKey: ['meeting-chart'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_meetings')
        .select('meeting_date')
        .gte('meeting_date', new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10))
        .order('meeting_date')
      if (error) throw error

      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        const month = row.meeting_date.slice(0, 7)
        counts[month] = (counts[month] ?? 0) + 1
      }
      return Object.entries(counts).map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count,
      }))
    },
  })
}

export function Dashboard() {
  const { profile } = useAuth()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: meetings, isLoading: meetingsLoading } = useRecentMeetings()
  const { data: chartData } = useMeetingChart()
  const { data: settings } = useSettings()

  const bestPct = Number(settings?.best_case_pct ?? 60)
  const worstPct = Number(settings?.worst_case_pct ?? 30)

  const kpis = [
    { title: 'Total Partnerships', value: stats?.totalPartnerships ?? 0, icon: <Handshake className="h-4 w-4" />, variant: 'brand' as const },
    { title: 'External Meetings', value: stats?.totalExtMeetings ?? 0, icon: <CalendarCheck className="h-4 w-4" />, variant: 'success' as const },
    { title: 'Internal Meetings', value: stats?.totalIntMeetings ?? 0, icon: <Users className="h-4 w-4" />, variant: 'default' as const },
    { title: 'Pending DDG Alerts', value: stats?.pendingDDG ?? 0, icon: <MessageSquare className="h-4 w-4" />, variant: stats?.pendingDDG ? 'danger' as const : 'default' as const },
  ]

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`${greeting}${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}`}
        subtitle={formatDate(new Date().toISOString())}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <KPICard key={kpi.title} {...kpi} loading={statsLoading} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent meetings */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
            <CardTitle className="text-sm font-semibold">Recent External Meetings</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link to="/meetings/external">View all <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {meetingsLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 border-b last:border-0">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3.5 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : !meetings?.length ? (
              <EmptyState
                icon={<CalendarCheck className="h-5 w-5" />}
                title="No meetings yet"
                description="External meetings will appear here"
              />
            ) : (
              <div>
                {meetings.map((m: Record<string, unknown>) => (
                  <Link
                    key={m.id as string}
                    to={`/meetings/external/${m.id}`}
                    className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-zinc-50 transition-colors group"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] font-medium truncate group-hover:text-brand transition-colors">{m.title as string}</p>
                      <p className="text-xs text-muted-foreground">
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
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold">Meetings (6 months)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {chartData?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                    cursor={{ fill: '#f4f4f5' }}
                  />
                  <Bar dataKey="count" fill="#E8621A" radius={[4, 4, 0, 0]} name="Meetings" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent partnerships table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
          <CardTitle className="text-sm font-semibold">Recent Partnerships</CardTitle>
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
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !stats?.recentPartnerships?.length ? (
            <EmptyState
              icon={<Handshake className="h-5 w-5" />}
              title="No partnerships yet"
              action={<Button size="sm" asChild><Link to="/partnerships/new">Add partnership</Link></Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[0.8125rem]">
                <thead>
                  <tr className="border-b bg-zinc-50/60">
                    <th className="text-left px-5 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Partnership</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">External Stakeholders</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Proposed</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Best Case ({bestPct}%)</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Worst Case ({worstPct}%)</th>
                    <th className="px-4 py-2.5 w-[60px]" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recentPartnerships.map(p => {
                    const proposed = p.proposed_value ?? 0
                    const stakeholderNames = p.ext_stakeholders
                      .map(e => e.stakeholder?.name)
                      .filter(Boolean)
                      .join(', ')
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <Link
                            to={`/partnerships/${p.id}`}
                            className="font-medium hover:text-brand transition-colors line-clamp-1"
                          >
                            {p.title}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(p.created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                          <span className="line-clamp-1" title={stakeholderNames}>
                            {stakeholderNames || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={p.status?.name ?? ''}
                            color={p.status?.color}
                          />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatNumber(proposed)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-600 font-medium">
                          {formatNumber(calcProjection(proposed, bestPct))}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-600 font-medium">
                          {formatNumber(calcProjection(proposed, worstPct))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link to={`/partnerships/${p.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
