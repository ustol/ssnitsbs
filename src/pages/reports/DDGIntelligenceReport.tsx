import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { useDDGIntelligenceReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, AISummaryCard, ChartWrapper } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

type DDGData = NonNullable<ReturnType<typeof useDDGIntelligenceReport>['data']>

function buildPrompt(data: DDGData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const pendingLines = data.tableRows
    .filter(r => !r.actioned)
    .slice(0, 8)
    .map(r => `  • [${r.type}] ${r.summary}${r.partnership !== '—' ? ` — ${r.partnership}` : ''} (${r.date})`)
    .join('\n')

  const typeLines = data.byType
    .map(t => `  • ${t.name}: ${t.total} items (${t.Pending} pending, ${t.Actioned} actioned)`)
    .join('\n')

  const partnershipLines = data.byPartnership
    .slice(0, 8)
    .map(p => `  • ${p.title}: ${p.total} items (${p.Pending} pending)`)
    .join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format (include all header lines):

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: DDG Feedback Intelligence Report

[Write 4 paragraphs: (1) overall DDG feedback status — ${data.total} items recorded, ${data.pending} pending (backlog rate ${100 - data.actionRate}%), ${data.actioned} actioned (action rate ${data.actionRate}%); (2) breakdown by feedback type — which types are generating the most work and which have the highest pending counts; (3) partnership attribution — name the partnerships with the most feedback and highlight any specific pending items requiring DDG attention; (4) recommended actions to clear the backlog and reduce outstanding items. Reference specific feedback items and partnerships by name.]

--- DATA ---

SUMMARY: ${data.total} total · ${data.pending} pending · ${data.actioned} actioned · ${data.actionRate}% action rate

BY TYPE:
${typeLines || '  No feedback recorded'}

BY PARTNERSHIP:
${partnershipLines || '  No items linked to partnerships'}

PENDING ITEMS (up to 8 most recent):
${pendingLines || '  None pending'}`
}

export function DDGIntelligenceReport() {
  const { data, isLoading } = useDDGIntelligenceReport()

  return (
    <ReportPage
      title="DDG Intelligence"
      subtitle="Feedback backlog, type breakdown, partnership attribution and monthly trends"
      filename="DDG Intelligence Report"
      loading={isLoading}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'Total Feedback Items', value: data.total },
            { label: 'Pending (Backlog)', value: data.pending, color: data.pending > 0 ? 'text-red-600' : 'text-zinc-900' },
            { label: 'Actioned', value: data.actioned, color: 'text-green-600' },
            {
              label: 'Action Rate',
              value: `${data.actionRate}%`,
              color: data.actionRate >= 80 ? 'text-green-600' : data.actionRate >= 50 ? 'text-amber-600' : 'text-red-600',
            },
          ]} />

          <AISummaryCard prompt={buildPrompt(data)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action rate donut */}
            <div className="space-y-3">
              <SectionTitle>Action Rate</SectionTitle>
              <div className="flex flex-col items-center justify-center h-[220px] gap-3">
                {data.total > 0 ? (
                  <>
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      <svg className="rotate-[-90deg]" viewBox="0 0 120 120" width="128" height="128">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#f4f4f5" strokeWidth="12" />
                        <circle
                          cx="60" cy="60" r="50" fill="none"
                          stroke={data.actionRate >= 80 ? '#10b981' : data.actionRate >= 50 ? '#f59e0b' : '#ef4444'}
                          strokeWidth="12"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * (1 - data.actionRate / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <p className="text-2xl font-semibold tabular-nums">{data.actionRate}%</p>
                        <p className="text-xs text-muted-foreground">actioned</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                        {data.actioned} actioned
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
                        {data.pending} pending
                      </span>
                    </div>
                  </>
                ) : <p className="text-sm text-zinc-400">No feedback recorded</p>}
              </div>
            </div>

            {/* By type stacked bar */}
            <div className="space-y-3">
              <SectionTitle>Feedback by Type</SectionTitle>
              {data.byType.length > 0 ? (
                <ChartWrapper minWidth={280}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.byType} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Actioned" stackId="a" fill="#10b981" />
                      <Bar dataKey="Pending" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No data</p>}
            </div>

            {/* Monthly trend — full width */}
            <div className="space-y-3 md:col-span-2">
              <SectionTitle>Monthly Feedback Trend</SectionTitle>
              {data.monthlyTrend.length > 0 ? (
                <ChartWrapper minWidth={500}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.monthlyTrend} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Actioned" stackId="a" fill="#10b981" />
                      <Bar dataKey="Pending" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No monthly data</p>}
            </div>
          </div>

          {data.byPartnership.length > 0 && (
            <div className="space-y-3">
              <SectionTitle>Feedback by Partnership</SectionTitle>
              <ReportTable
                headers={['Partnership', 'Total', 'Actioned', 'Pending']}
                rows={data.byPartnership.map(p => [p.title, p.total, p.Actioned, p.Pending])}
              />
            </div>
          )}

          <div className="space-y-3">
            <SectionTitle>All Feedback Items</SectionTitle>
            <ReportTable
              headers={['Date', 'Type', 'Partnership', 'Summary', 'Status']}
              rows={data.tableRows.map(r => [
                r.date,
                r.type,
                r.partnership,
                r.summary.length > 80 ? r.summary.substring(0, 80) + '…' : r.summary,
                r.actioned ? 'Actioned' : 'Pending',
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
