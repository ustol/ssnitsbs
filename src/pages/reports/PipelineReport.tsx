import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { usePipelineReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, ChartWrapper } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#E8621A', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

type PipelineData = NonNullable<ReturnType<typeof usePipelineReport>['data']>

function buildAISummary(data: PipelineData): string {
  const slowest = data.dwellByStatus[0]
  return `Write exactly 2 concise sentences on SSNIT's partnership pipeline. Sentence 1: total partnerships, open count, total proposed value. Sentence 2: identify the key bottleneck stage by name and average dwell time. No preambles.\n\nDATA: ${data.totalPartnerships} total | ${data.openCount} open | ${fmt(data.totalProposed)} proposed${slowest ? `\nSlowest stage: ${slowest.name} (${slowest.avgDays}d avg)` : ''}`
}

function buildPrompt(data: PipelineData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const funnelLines = data.funnel
    .map(s => `  • ${s.name}: ${s.count} partnership(s), ${fmt(s.value)} proposed members`)
    .join('\n')

  const dwellLines = data.dwellByStatus.length > 0
    ? data.dwellByStatus.map(s => `  • ${s.name}: avg ${s.avgDays} days (${s.transitions} transitions)`).join('\n')
    : '  No status history recorded yet'

  const openLines = data.openPartnerships.slice(0, 12)
    .map(p => {
      const dur = p.daysOpen !== null ? `${p.daysOpen} days in pipeline` : 'start date not set'
      return `  • ${p.title} [${p.status?.name ?? 'No Status'}] — ${dur}, ${fmt(p.proposedValue)} proposed members`
    })
    .join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format (include all header lines):

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: Partnership Pipeline & Progression Report

[Write exactly 3 paragraphs: (1) overview — ${data.totalPartnerships} total partnerships, ${data.openCount} currently open, ${fmt(data.totalProposed)} proposed members across all stages, with stage distribution; (2) bottleneck analysis — which status stages have the longest average dwell time and which partnerships have been open the longest, naming them specifically; (3) projections (best case ${data.bestPct}%: ${fmt(Math.round(data.totalProposed * data.bestPct / 100))} members, worst case ${data.worstPct}%: ${fmt(Math.round(data.totalProposed * data.worstPct / 100))} members) and recommended actions to accelerate stalled partnerships.]

--- DATA ---

FUNNEL BY STATUS:
${funnelLines || '  No partnerships'}

BEST CASE (${data.bestPct}%): ${fmt(Math.round(data.totalProposed * data.bestPct / 100))} members
WORST CASE (${data.worstPct}%): ${fmt(Math.round(data.totalProposed * data.worstPct / 100))} members

STATUS DWELL TIME:
${dwellLines}

LONGEST OPEN PARTNERSHIPS (${data.openCount} total open):
${openLines || '  No open partnerships'}`
}

export function PipelineReport() {
  const { data, isLoading } = usePipelineReport()

  return (
    <ReportPage
      title="Pipeline & Progression"
      subtitle="Partnership funnel distribution, status dwell times and open pipeline duration"
      filename="Pipeline & Progression Report"
      loading={isLoading}
      memoPrompt={data ? buildPrompt(data) : null}
      summaryPrompt={data ? buildAISummary(data) : null}
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
            { label: 'Total Partnerships', value: data.totalPartnerships },
            { label: 'Open (No End Date)', value: data.openCount },
            { label: `Best Case (${data.bestPct}%)`, value: fmt(Math.round(data.totalProposed * data.bestPct / 100)), color: 'text-green-600' },
            { label: `Worst Case (${data.worstPct}%)`, value: fmt(Math.round(data.totalProposed * data.worstPct / 100)), color: 'text-amber-600' },
          ]} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Funnel by status */}
            <div className="space-y-3">
              <SectionTitle>Partnerships by Stage</SectionTitle>
              {data.funnel.length > 0 ? (
                <ChartWrapper minWidth={280}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.funnel} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(v: number) => [v, 'Partnerships']}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {data.funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No status data</p>}
            </div>

            {/* Dwell time per status */}
            <div className="space-y-3">
              <SectionTitle>Average Days Per Status</SectionTitle>
              {data.dwellByStatus.length > 0 ? (
                <ChartWrapper minWidth={300}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.dwellByStatus} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="d" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(v: number) => [`${v} days`, 'Avg Dwell']}
                      />
                      <Bar dataKey="avgDays" radius={[0, 4, 4, 0]}>
                        {data.dwellByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : (
                <p className="text-sm text-zinc-400 py-8 text-center">
                  No status history data yet — dwell times will appear once partnerships progress through statuses
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>Open Partnerships — Longest in Pipeline</SectionTitle>
            <ReportTable
              headers={['Partnership', 'Organisation', 'Status', 'Start Date', 'Days Open', 'Proposed Members']}
              rows={data.openPartnerships.map(p => [
                p.title,
                p.organization ?? '—',
                p.status?.name ?? '—',
                p.startDate ?? '—',
                p.daysOpen !== null ? `${p.daysOpen}d` : '—',
                fmt(p.proposedValue),
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
