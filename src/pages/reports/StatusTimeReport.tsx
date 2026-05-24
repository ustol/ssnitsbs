import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell, AreaChart, Area,
} from 'recharts'
import { useStatusTimeReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, AISummaryCard } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

type StatusTimeData = NonNullable<ReturnType<typeof useStatusTimeReport>['data']>

function buildSummaryPrompt(data: StatusTimeData): string | null {
  if (data.totalChanges === 0) return null
  const slowest = data.avgByStatus[0]
  const fastest = data.avgByStatus[data.avgByStatus.length - 1]
  const topTransition = data.topTransitions[0]
  const stalled = data.avgByStatus.filter(s => s.avgDays > 90).length
  const fastMoving = data.avgByStatus.filter(s => s.avgDays <= 7).length

  return `Write a 3-sentence executive summary for a Status Time Analysis Report covering SSNIT partnership and meeting pipeline health. Cite the exact figures in your sentences. No preambles, no filler phrases.

Key figures:
- Total status changes recorded: ${data.totalChanges} across ${data.entitiesTracked} entities
- Overall average days spent per status: ${data.avgDaysOverall} days
- Slowest-moving status: ${slowest?.name ?? 'N/A'} (avg ${slowest?.avgDays ?? 0} days, ${slowest?.transitions ?? 0} transitions)
- Fastest-moving status: ${fastest?.name ?? 'N/A'} (avg ${fastest?.avgDays ?? 0} days)
- Statuses classified as fast-moving (≤7 days avg): ${fastMoving}
- Statuses classified as stalled (>90 days avg): ${stalled}
- Most common status transition: ${topTransition?.name ?? 'N/A'} (occurred ${topTransition?.value ?? 0} times)`
}

export function StatusTimeReport() {
  const { data, isLoading } = useStatusTimeReport()

  return (
    <ReportPage
      title="Status Time Analysis"
      subtitle="How long partnerships and meetings stay in each status — transition frequencies and activity trends"
      filename="Status Time Analysis"
      loading={isLoading}
    >
      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'Total Status Changes', value: data.totalChanges },
            { label: 'Entities Tracked',     value: data.entitiesTracked },
            { label: 'Avg Days Per Status',  value: data.avgDaysOverall > 0 ? `${data.avgDaysOverall}d` : '—' },
            { label: 'Statuses Tracked',     value: data.avgByStatus.length },
          ]} />

          <AISummaryCard prompt={data.totalChanges > 0 ? buildSummaryPrompt(data) : null} />

          {data.totalChanges === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <p className="text-lg font-medium mb-1">No status history yet</p>
              <p className="text-sm">Save a status update in the Status Tracker to start tracking.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Average days per status */}
                <div className="space-y-3">
                  <SectionTitle>Average Days Spent per Status</SectionTitle>
                  {data.avgByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.avgByStatus} layout="vertical" barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="d" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(v, _n, props) => [`${v} days (${props.payload?.transitions} transitions)`, 'Avg Duration']}
                        />
                        <Bar dataKey="avgDays" radius={[0, 4, 4, 0]} name="Avg Days">
                          {data.avgByStatus.map((item, i) => (
                            <Cell key={i} fill={item.color ?? `hsl(${i * 47}, 65%, 52%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-zinc-400 py-8 text-center">Insufficient data (need 2+ changes per entity)</p>}
                </div>

                {/* Top transitions */}
                <div className="space-y-3">
                  <SectionTitle>Most Common Status Transitions</SectionTitle>
                  {data.topTransitions.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.topTransitions} layout="vertical" barSize={14}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={150} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-zinc-400 py-8 text-center">No transitions recorded yet</p>}
                </div>
              </div>

              {/* Monthly activity area chart */}
              {data.activityByMonth.length > 0 && (
                <div className="space-y-3">
                  <SectionTitle>Status Change Activity Over Time</SectionTitle>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.activityByMonth}>
                      <defs>
                        <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#actGrad)" name="Status Changes" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Status duration summary table */}
              {data.avgByStatus.length > 0 && (
                <div className="space-y-3">
                  <SectionTitle>Status Duration Summary</SectionTitle>
                  <ReportTable
                    headers={['Status', 'Avg Days in Status', 'No. of Transitions', 'Interpretation']}
                    rows={data.avgByStatus.map(s => [
                      s.name,
                      `${s.avgDays} days`,
                      s.transitions,
                      s.avgDays <= 7 ? 'Fast-moving' : s.avgDays <= 30 ? 'Moderate' : s.avgDays <= 90 ? 'Slow' : 'Stalled',
                    ])}
                  />
                </div>
              )}

              {/* Recent history */}
              <div className="space-y-3">
                <SectionTitle>Recent Status Changes (Last 50)</SectionTitle>
                <ReportTable
                  headers={['Entity', 'Type', 'From Status', 'To Status', 'Status Date', 'Recorded On']}
                  rows={data.recentHistory.map(h => [
                    h.entity, h.type, h.from, h.to, h.date, h.changedAt,
                  ])}
                />
              </div>
            </>
          )}
        </>
      )}
    </ReportPage>
  )
}
