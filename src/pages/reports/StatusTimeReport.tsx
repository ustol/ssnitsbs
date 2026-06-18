import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell, AreaChart, Area,
} from 'recharts'
import { useStatusTimeReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, ChartWrapper } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

type StatusTimeData = NonNullable<ReturnType<typeof useStatusTimeReport>['data']>

function buildAISummary(data: StatusTimeData): string | null {
  if (data.totalChanges === 0) return null
  const slowest = data.avgByStatus[0]
  const topTransition = data.topTransitions[0]
  return `Write exactly 2 concise sentences on SSNIT partnership pipeline velocity. Sentence 1: total status changes, entities tracked, and overall average days per status. Sentence 2: name the slowest-moving status and the most common status transition. No preambles.\n\nDATA: ${data.totalChanges} changes | ${data.entitiesTracked} entities | ${data.avgDaysOverall}d avg${slowest ? `\nSlowest: ${slowest.name} (${slowest.avgDays}d)` : ''}${topTransition ? `\nTop transition: ${topTransition.name} (${topTransition.value}x)` : ''}`
}

function buildMemoPrompt(data: StatusTimeData): string | null {
  if (data.totalChanges === 0) return null
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const slowest = data.avgByStatus[0]
  const fastest = data.avgByStatus[data.avgByStatus.length - 1]
  const topTransition = data.topTransitions[0]
  const stalled = data.avgByStatus.filter(s => s.avgDays > 90).length
  const fastMoving = data.avgByStatus.filter(s => s.avgDays <= 7).length

  const dwellLines = data.avgByStatus
    .map(s => `  • ${s.name}: avg ${s.avgDays} days (${s.transitions} transitions)`)
    .join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format (include all header lines):

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: Partnership Pipeline Velocity & Status Time Analysis

[Write exactly 3 paragraphs: (1) overall pipeline velocity — ${data.totalChanges} status changes recorded across ${data.entitiesTracked} entities, overall average of ${data.avgDaysOverall} days per status; (2) highlight the slowest-moving status (${slowest?.name ?? 'N/A'}, avg ${slowest?.avgDays ?? 0} days) and ${stalled} stalled status(es) (>90 days), alongside ${fastMoving} fast-moving status(es) (≤7 days); also note the most common transition (${topTransition?.name ?? 'N/A'}, occurred ${topTransition?.value ?? 0} times); (3) recommended actions to improve pipeline velocity and reduce bottlenecks at identified stages.]

--- DATA ---

STATUS DWELL TIMES (sorted slowest to fastest):
${dwellLines || '  No status history recorded yet'}

FASTEST STATUS: ${fastest?.name ?? 'N/A'} (avg ${fastest?.avgDays ?? 0} days)
TOP TRANSITION: ${topTransition?.name ?? 'N/A'} (${topTransition?.value ?? 0}x)`
}

export function StatusTimeReport() {
  const { data, isLoading } = useStatusTimeReport()

  return (
    <ReportPage
      title="Status Time Analysis"
      subtitle="How long partnerships and meetings stay in each status — transition frequencies and activity trends"
      filename="Status Time Analysis"
      loading={isLoading}
      memoPrompt={data?.totalChanges > 0 ? buildMemoPrompt(data) : null}
      summaryPrompt={data?.totalChanges > 0 ? buildAISummary(data) : null}
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
                    <ChartWrapper minWidth={360}>
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
                    </ChartWrapper>
                  ) : <p className="text-sm text-zinc-400 py-8 text-center">Insufficient data (need 2+ changes per entity)</p>}
                </div>

                {/* Top transitions */}
                <div className="space-y-3">
                  <SectionTitle>Most Common Status Transitions</SectionTitle>
                  {data.topTransitions.length > 0 ? (
                    <ChartWrapper minWidth={380}>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.topTransitions} layout="vertical" barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={150} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartWrapper>
                  ) : <p className="text-sm text-zinc-400 py-8 text-center">No transitions recorded yet</p>}
                </div>
              </div>

              {/* Monthly activity area chart */}
              {data.activityByMonth.length > 0 && (
                <div className="space-y-3">
                  <SectionTitle>Status Change Activity Over Time</SectionTitle>
                  <ChartWrapper minWidth={280}>
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
                  </ChartWrapper>
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
