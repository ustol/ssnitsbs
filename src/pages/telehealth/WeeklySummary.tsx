import { useState } from 'react'
import { Users, MessageSquare, AlertCircle, CheckCircle2, ThumbsUp, TrendingUp } from 'lucide-react'
import { useWeeklySummary, useTelehealthConfig } from '@/hooks/useTelehealth'
import { PageHeader } from '@/components/shared/PageHeader'
import { KPICard } from '@/components/shared/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

function InsightItem({ label, text, rank }: { label: string; text: string; rank: number }) {
  return (
    <div className="flex gap-3 py-2.5 border-b last:border-0">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">
        {rank}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-700">{text}</p>
        <p className="text-[0.65rem] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export function WeeklySummary() {
  const { data: cfg } = useTelehealthConfig()
  const [period, setPeriod] = useState('')
  const [cycle, setCycle]   = useState('')

  const { data: stats, isLoading } = useWeeklySummary(period, cycle)
  const hasFilter = !!period && !!cycle

  const feedbackTotal = (stats?.positive_count ?? 0) +
    (stats?.complaint_count ?? 0) +
    (stats?.suggestion_count ?? 0) +
    (stats?.neutral_count ?? 0)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Weekly Summary"
        subtitle="Aggregated totals and insights for a selected reporting period and week"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select onValueChange={setPeriod}>
          <SelectTrigger className="h-9 text-sm w-44">
            <SelectValue placeholder="Select Reporting Period…" />
          </SelectTrigger>
          <SelectContent>
            {cfg?.periods.map(p => (
              <SelectItem key={p.id} value={p.value}>{p.value}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={setCycle}>
          <SelectTrigger className="h-9 text-sm w-36">
            <SelectValue placeholder="Select Week…" />
          </SelectTrigger>
          <SelectContent>
            {cfg?.cycles.map(c => (
              <SelectItem key={c.id} value={c.value}>{c.value}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilter && (
          <Badge variant="outline" className="text-xs text-brand border-brand/30 bg-brand/5">
            {period} — {cycle}
          </Badge>
        )}
      </div>

      {!hasFilter ? (
        <div className="rounded-xl border border-dashed bg-zinc-50 p-12 text-center text-sm text-muted-foreground">
          Select a reporting period and week to view the summary.
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPICard
              title="Patients Contacted"
              value={stats?.total_patients ?? 0}
              icon={<Users size={16} />}
              variant="brand"
              loading={isLoading}
            />
            <KPICard
              title="Follow-Up Activities"
              value={stats?.total_followups ?? 0}
              icon={<TrendingUp size={16} />}
              variant="default"
              loading={isLoading}
            />
            <KPICard
              title="Feedback Collected"
              value={stats?.total_feedback ?? 0}
              icon={<MessageSquare size={16} />}
              variant="default"
              loading={isLoading}
            />
            <KPICard
              title="Total Complaints"
              value={stats?.total_complaints ?? 0}
              icon={<AlertCircle size={16} />}
              variant="warning"
              loading={isLoading}
            />
            <KPICard
              title="Issues Resolved"
              value={stats?.issues_resolved ?? 0}
              icon={<CheckCircle2 size={16} />}
              variant="success"
              loading={isLoading}
            />
          </div>

          {/* Feedback Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ThumbsUp size={15} className="text-brand" />
                Feedback Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Positive', count: stats?.positive_count ?? 0, color: 'bg-green-50 border-green-200 text-green-700' },
                    { label: 'Complaints', count: stats?.complaint_count ?? 0, color: 'bg-red-50 border-red-200 text-red-700' },
                    { label: 'Suggestions', count: stats?.suggestion_count ?? 0, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                    { label: 'Neutral / Other', count: stats?.neutral_count ?? 0, color: 'bg-zinc-50 border-zinc-200 text-zinc-600' },
                  ].map(item => (
                    <div
                      key={item.label}
                      className={`rounded-lg border p-4 text-center ${item.color}`}
                    >
                      <p className="text-2xl font-bold tabular-nums">{item.count}</p>
                      <p className="text-xs font-medium mt-1">{item.label}</p>
                      <p className="text-[0.65rem] mt-0.5 opacity-70">
                        {feedbackTotal > 0 ? Math.round((item.count / feedbackTotal) * 100) : 0}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Observations & Recommendations */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Top 3 Key Observations</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : (stats?.top_observations.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No observations recorded for this period.</p>
                ) : (
                  stats!.top_observations.map((e, i) => (
                    <InsightItem
                      key={e.id}
                      rank={i + 1}
                      text={e.key_observation!}
                      label={`${e.patient_full_name} — ${e.date_of_interaction}`}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Top 3 Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : (stats?.top_recommendations.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No recommendations recorded for this period.</p>
                ) : (
                  stats!.top_recommendations.map((e, i) => (
                    <InsightItem
                      key={e.id}
                      rank={i + 1}
                      text={e.recommendation!}
                      label={`${e.priority_level ?? 'No priority'} — ${e.responsible_unit ?? 'Unassigned'}`}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
