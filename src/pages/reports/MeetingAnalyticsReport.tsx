import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts'
import { useMeetingAnalyticsReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, ChartWrapper } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

type MeetingData = NonNullable<ReturnType<typeof useMeetingAnalyticsReport>['data']>

function buildAISummary(data: MeetingData): string {
  return `Write exactly 2 concise sentences on SSNIT partnership meeting engagement. Sentence 1: total meetings and type split. Sentence 2: the most notable cadence gap finding. No preambles.\n\nDATA: ${data.totalMeetings} meetings | ${data.totalExt} ext | ${data.totalMeetings - data.totalExt} int | avg ${data.avgMeetingsPerPartnership}/partnership | ${data.pctNoMeeting30d}% of partnerships with no meeting in 30 days`
}

function buildPrompt(data: MeetingData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const cadenceLines = data.cadenceBuckets
    .map(b => `  • ${b.label}: ${b.count} partnership(s)`)
    .join('\n')

  const trendLines = data.monthlyTrend.slice(-6)
    .map(m => `  ${m.month}: ${((m.External as number) ?? 0) + ((m.Internal as number) ?? 0)} meetings (${(m.External as number) ?? 0} ext, ${(m.Internal as number) ?? 0} int)`)
    .join('\n')

  const partnershipLines = data.partnershipStats.slice(0, 12)
    .map(p => `  • ${p.title}: ${p.total} total (${p.extCount} ext, ${p.intCount} int)${p.daysSinceLastMeeting !== null ? `, last ${p.daysSinceLastMeeting}d ago` : ', never met'}`)
    .join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format (include all header lines):

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: Meeting Analytics Report

[Write exactly 3 paragraphs: (1) overall meeting activity — ${data.totalMeetings} total meetings (${data.totalExt} external, ${data.totalMeetings - data.totalExt} internal), avg ${data.avgMeetingsPerPartnership} meetings per partnership; (2) cadence gaps — ${data.pctNoMeeting30d}% of partnerships have had no meeting in 30 days; name the most and least active partnerships by name, citing specific counts and days since last meeting; (3) recommended actions to improve meeting frequency and close engagement gaps. Reference specific partnership names.]

--- DATA ---

TOTALS: ${data.totalMeetings} total · ${data.totalExt} ext · ${data.totalMeetings - data.totalExt} int · avg ${data.avgMeetingsPerPartnership} per partnership · ${data.pctNoMeeting30d}% with no meeting in 30d

CADENCE GAP DISTRIBUTION:
${cadenceLines}

RECENT TREND (last 6 months):
${trendLines}

PARTNERSHIP ACTIVITY (top 12):
${partnershipLines}`
}

export function MeetingAnalyticsReport() {
  const { data, isLoading } = useMeetingAnalyticsReport()

  return (
    <ReportPage
      title="Meeting Analytics"
      subtitle="Meeting frequency trends, partnership engagement cadence and activity gaps"
      filename="Meeting Analytics Report"
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
            { label: 'Total Meetings', value: data.totalMeetings },
            { label: 'External Meetings', value: data.totalExt },
            { label: 'Avg Meetings / Partnership', value: data.avgMeetingsPerPartnership },
            {
              label: '% No Meeting (30d)',
              value: `${data.pctNoMeeting30d}%`,
              color: data.pctNoMeeting30d >= 50 ? 'text-red-600' : data.pctNoMeeting30d >= 30 ? 'text-amber-600' : 'text-zinc-900',
            },
          ]} />

          {/* Monthly trend — full width */}
          <div className="space-y-3">
            <SectionTitle>Monthly Meeting Trend — External vs Internal</SectionTitle>
            {data.monthlyTrend.length > 0 ? (
              <ChartWrapper minWidth={500}>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.monthlyTrend}>
                    <defs>
                      <linearGradient id="extGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E8621A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#E8621A" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="External" stroke="#E8621A" strokeWidth={2} fill="url(#extGrad)" />
                    <Area type="monotone" dataKey="Internal" stroke="#3b82f6" strokeWidth={2} fill="url(#intGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>
            ) : <p className="text-sm text-zinc-400 py-8 text-center">No meeting data</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cadence gap distribution */}
            <div className="space-y-3">
              <SectionTitle>Cadence Gap Distribution</SectionTitle>
              <ChartWrapper minWidth={260}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.cadenceBuckets} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number) => [v, 'Partnerships']}
                    />
                    <Bar dataKey="count" fill="#E8621A" radius={[4, 4, 0, 0]} name="Partnerships" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>

            {/* Top active — last 90 days */}
            <div className="space-y-3">
              <SectionTitle>Most Active — Last 90 Days</SectionTitle>
              {data.topRecent90.length > 0 ? (
                <ChartWrapper minWidth={300}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.topRecent90} layout="vertical" barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="External" stackId="a" fill="#E8621A" />
                      <Bar dataKey="Internal" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No meetings in the last 90 days</p>}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>Partnership Meeting Activity</SectionTitle>
            <ReportTable
              headers={['Partnership', 'Total', 'External', 'Internal', 'Last Meeting', 'Days Since']}
              rows={data.partnershipStats.map(p => [
                p.title,
                p.total,
                p.extCount,
                p.intCount,
                p.lastMeetingDate ? formatDate(p.lastMeetingDate) : '—',
                p.daysSinceLastMeeting !== null ? `${p.daysSinceLastMeeting}d` : 'Never',
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
