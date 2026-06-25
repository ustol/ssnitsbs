import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { useExtStakeholderReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, ChartWrapper } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#E8621A','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316']

type ExtData = NonNullable<ReturnType<typeof useExtStakeholderReport>['data']>

function buildAISummary(data: ExtData): string {
  const totalLinks = data.rows.reduce((s, r) => s + r.partnershipCount, 0)
  return `Write exactly 2 concise sentences on SSNIT external stakeholder engagement. Sentence 1: stakeholder count, organisations covered, and total partnership linkages. Sentence 2: a key insight about engagement depth or coverage gaps. No preambles.\n\nDATA: ${data.total} stakeholders | ${data.byOrg.length} organisations | ${totalLinks} partnership links`
}

function buildSummaryPrompt(data: ExtData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const totalLinks = data.rows.reduce((s, r) => s + r.partnershipCount, 0)
  const noLinks = data.rows.filter(r => r.partnershipCount === 0).length

  const stakeholderLines = data.rows
    .filter(r => r.partnershipCount > 0)
    .slice(0, 15)
    .map(s => `  • ${s.name} (${s.organization ?? 'Unknown org'}) — Partnerships: ${s.partnershipNames || 'None'}`)
    .join('\n')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meetingLines = (data.recentMeetings as any[]).slice(0, 10).map((m: any) =>
    `  • ${m.title ?? 'Untitled'} (${m.meeting_date ?? '—'})${m.location ? ` @ ${m.location}` : ''}${m.action_points ? `\n    Actions: ${(m.action_points as string).substring(0, 180)}` : ''}`
  ).join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format:

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: External Stakeholder Engagement Report

[Write exactly 3 paragraphs: (1) overview of the external stakeholder register — total count, organisations represented, partnership linkages; (2) highlight the most engaged stakeholders by name, their organisations, and the partnerships they are linked to; (3) recommended actions to deepen external engagement and address any organisations or partnerships with no stakeholder coverage. Reference stakeholders and partnerships by their actual names.]

--- DATA ---

EXTERNAL STAKEHOLDERS (${data.total} total, ${data.byOrg.length} organisations, ${noLinks} with no partnership links):
${stakeholderLines || '  No stakeholders with partnerships.'}

RECENT EXTERNAL MEETINGS (last ${Math.min(10, (data.recentMeetings as unknown[]).length)}):
${meetingLines || '  No meetings recorded.'}

Partnership linkages: ${totalLinks} total`
}

export function ExternalStakeholderReport() {
  const { data, isLoading } = useExtStakeholderReport()

  return (
    <ReportPage
      title="External Stakeholder Report"
      subtitle="Activity overview for all external stakeholders — organisations, partnerships and engagement depth"
      filename="External Stakeholder Report"
      loading={isLoading}
      memoPrompt={data ? buildSummaryPrompt(data) : null}
      summaryPrompt={data ? buildAISummary(data) : null}
    >
      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'Total Stakeholders',   value: data.total },
            { label: 'Unique Organisations', value: data.byOrg.length },
            { label: 'Linked Partnerships',  value: data.rows.reduce((s, r) => s + r.partnershipCount, 0) },
            { label: 'Avg Partnerships',      value: data.total > 0 ? (data.rows.reduce((s, r) => s + r.partnershipCount, 0) / data.total).toFixed(1) : 0 },
          ]} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stakeholders by Organisation */}
            <div className="space-y-3">
              <SectionTitle>Stakeholders by Organisation (Top 10)</SectionTitle>
              {data.byOrg.length > 0 ? (
                <ChartWrapper minWidth={340}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.byOrg} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" fill="#E8621A" radius={[0, 4, 4, 0]} name="Stakeholders" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No data</p>}
            </div>

            {/* Top by partnership count */}
            <div className="space-y-3">
              <SectionTitle>Top Stakeholders by Partnership Count</SectionTitle>
              {data.topByPartnerships.filter(x => x.value > 0).length > 0 ? (
                <ChartWrapper minWidth={280}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.topByPartnerships.filter(x => x.value > 0)} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Partnerships" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : (
                <ChartWrapper minWidth={280}>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.byOrg.slice(0, 6)} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name.substring(0, 12)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {data.byOrg.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>Full Stakeholder List</SectionTitle>
            <ReportTable
              headers={['Name', 'Organisation', 'Title', 'Email', 'Phone', '# Partnerships', 'Partnerships']}
              rows={data.rows.map(s => [
                <Link key={s.id} to={`/reports/external-stakeholder/${s.id}`} className="text-brand hover:underline font-medium">{s.name}</Link>,
                s.organization ?? '—',
                s.title ?? '—',
                s.email ?? '—',
                s.phone ?? '—',
                s.partnershipCount,
                s.partnershipNames || '—',
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
