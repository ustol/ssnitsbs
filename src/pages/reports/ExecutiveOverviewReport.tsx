import { useHealthScorecardReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

type ScorecardData = NonNullable<ReturnType<typeof useHealthScorecardReport>['data']>

const RAG_CONFIG = {
  red:   { label: 'Red',   bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500' },
  amber: { label: 'Amber', bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400' },
  green: { label: 'Green', bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
}

function buildAISummary(data: ScorecardData): string {
  const redNames = data.rows.filter(r => r.rag === 'red').map(r => r.title).join(', ')
  return `Write exactly 2 concise sentences summarising a SSNIT partnership health portfolio. Sentence 1 states the overall RAG distribution with exact numbers. Sentence 2 names the most urgent concern or, if there are no red partnerships, the most notable amber risk. No preambles or filler phrases.\n\nDATA: ${data.total} total | ${data.redCount} Red | ${data.amberCount} Amber | ${data.greenCount} Green${redNames ? `\nRed partnerships: ${redNames}` : ''}`
}

function buildPrompt(data: ScorecardData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const redRows = data.rows.filter(r => r.rag === 'red')
  const amberRows = data.rows.filter(r => r.rag === 'amber')

  const vitalSuffix = (items: ScorecardData['rows'][number]['vitalInfo']) =>
    items.length > 0 ? `; vital info: ${items.map(v => v.subject).join(', ')}` : ''

  const redLines = redRows.map(r => {
    const issues: string[] = []
    if (r.daysSinceLastMeeting === null) issues.push('no meetings ever recorded')
    else if (r.daysSinceLastMeeting >= 60) issues.push(`no meeting for ${r.daysSinceLastMeeting} days`)
    if (r.daysInCurrentStatus !== null && r.daysInCurrentStatus >= 90) issues.push(`stuck in "${r.status?.name ?? 'current status'}" for ${r.daysInCurrentStatus} days`)
    return `  • ${r.title} [${r.status?.name ?? 'No Status'}] — ${issues.join('; ')}${vitalSuffix(r.vitalInfo)}`
  }).join('\n')

  const amberLines = amberRows.map(r => {
    const issues: string[] = []
    if (r.daysSinceLastMeeting === null) issues.push('no meetings recorded')
    else if (r.daysSinceLastMeeting >= 30) issues.push(`no meeting in ${r.daysSinceLastMeeting} days`)
    if (r.daysInCurrentStatus !== null && r.daysInCurrentStatus >= 60) issues.push(`${r.daysInCurrentStatus} days in current status`)
    return `  • ${r.title} — ${issues.join('; ')}${vitalSuffix(r.vitalInfo)}`
  }).join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format (include all header lines):

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: Partnership Health Status Report

[Write exactly 3 paragraphs: (1) overall portfolio health — ${data.total} partnerships assessed, ${data.redCount} red, ${data.amberCount} amber, ${data.greenCount} green; (2) detail each RED partnership by name with specific risk indicators, then briefly acknowledge amber partnerships requiring monitoring; (3) recommended actions for DDG's attention to address red and amber risks. Reference partnerships by their actual names and cite specific figures.]

--- DATA ---

TOTAL: ${data.total} partnerships assessed
RED — IMMEDIATE ATTENTION (${redRows.length}):
${redLines || '  None'}

AMBER — MONITOR (${amberRows.length}):
${amberLines || '  None'}

GREEN — ON TRACK: ${data.greenCount} partnership(s)`
}

export function ExecutiveOverviewReport() {
  const { data, isLoading } = useHealthScorecardReport()

  return (
    <ReportPage
      title="Partnership Health Scorecard"
      subtitle="RAG-rated health assessment — meeting cadence and status progression"
      filename="Partnership Health Scorecard"
      loading={isLoading}
      memoPrompt={data ? buildPrompt(data) : null}
      summaryPrompt={data ? buildAISummary(data) : null}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-16" />
          <Skeleton className="h-64" />
        </div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'Total Partnerships', value: data.total },
            { label: 'Red — Action Required', value: data.redCount, color: 'text-red-600' },
            { label: 'Amber — Monitor', value: data.amberCount, color: 'text-amber-500' },
            { label: 'Green — On Track', value: data.greenCount, color: 'text-green-600' },
          ]} />

          {/* RAG criteria */}
          <div className="rounded-lg border bg-zinc-50/60 px-4 py-3 text-xs text-zinc-500 space-y-1.5">
            <p className="font-semibold text-zinc-600 mb-1">RAG Criteria</p>
            <p><span className="font-semibold text-red-600">Red</span> — no meeting in 60+ days, or same status for 90+ days</p>
            <p><span className="font-semibold text-amber-600">Amber</span> — no meetings ever, no meeting in 30+ days, or same status 60+ days</p>
            <p><span className="font-semibold text-green-600">Green</span> — meeting within 30 days and status progressed within 60 days</p>
          </div>

          <SectionTitle>Full Scorecard</SectionTitle>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-zinc-50 border-b">
                  {['RAG', 'Partnership', 'Organisation', 'Status', 'Days in Status', 'Last Meeting', 'Days Since Mtg'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map(row => {
                  const cfg = RAG_CONFIG[row.rag]
                  return (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-zinc-50/50">
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-zinc-800 whitespace-nowrap">{row.title}</td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500">{row.organization ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {row.status
                          ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-semibold whitespace-nowrap"
                              style={{ background: `${row.status.color}22`, color: row.status.color }}
                            >
                              {row.status.name}
                            </span>
                          )
                          : <span className="text-zinc-400">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-xs tabular-nums text-zinc-500">
                        {row.daysInCurrentStatus !== null ? `${row.daysInCurrentStatus}d` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                        {row.lastMeetingDate ? formatDate(row.lastMeetingDate) : '—'}
                      </td>
                      <td className={`px-3 py-2.5 text-xs tabular-nums font-medium ${
                        row.daysSinceLastMeeting === null
                          ? 'text-zinc-400'
                          : row.daysSinceLastMeeting >= 60
                          ? 'text-red-600'
                          : row.daysSinceLastMeeting >= 30
                          ? 'text-amber-600'
                          : 'text-zinc-600'
                      }`}>
                        {row.daysSinceLastMeeting !== null ? `${row.daysSinceLastMeeting}d` : 'Never'}
                      </td>
                    </tr>
                  )
                })}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-xs text-zinc-400">No partnerships found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ReportPage>
  )
}
