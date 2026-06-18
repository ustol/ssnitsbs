import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { useIntStakeholderReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, ChartWrapper } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

type IntData = NonNullable<ReturnType<typeof useIntStakeholderReport>['data']>

function buildAISummary(data: IntData): string {
  return `Write exactly 2 concise sentences on SSNIT internal stakeholder involvement. Sentence 1: stakeholder count, departments covered, and partnerships covered. Sentence 2: a key observation about engagement depth or gaps. No preambles.\n\nDATA: ${data.total} stakeholders | ${data.departments} departments | ${data.coveredPartnerships} partnerships covered | avg ${data.avgPartnerships} partnerships/person`
}

function buildSummaryPrompt(data: IntData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const stakeholderLines = data.rows
    .filter(s => s.partnershipCount > 0)
    .slice(0, 15)
    .map(s => `  • ${s.name} (${s.department ?? 'No dept'}, ${s.title ?? 'No title'}) — ${s.partnershipCount} partnership(s): ${s.partnershipNames}; ${s.meetingCount} related meeting(s)`)
    .join('\n')

  const unlinkedCount = data.rows.filter(s => s.partnershipCount === 0).length

  const deptLines = data.byDepartment
    .slice(0, 8)
    .map(d => `  • ${d.name}: ${d.stakeholders} staff, ${d.partnerships} partnership link(s), ${d.meetings} meeting(s)`)
    .join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format (include all header lines):

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: Internal Stakeholder Involvement Report

[Write exactly 3 paragraphs: (1) overview — ${data.total} internal stakeholders across ${data.departments} departments, covering ${data.coveredPartnerships} partnership(s), average ${data.avgPartnerships} partnerships per stakeholder; (2) name the most involved individuals — their departments, which partnerships they are linked to, and departmental engagement summary noting which departments are most and least represented; (3) ${unlinkedCount > 0 ? `note that ${unlinkedCount} stakeholder(s) have no partnership links; ` : ''}recommended actions to strengthen internal engagement and ensure broader departmental coverage. Reference specific names and partnerships.]

--- DATA ---

STAKEHOLDERS WITH PARTNERSHIP INVOLVEMENT:
${stakeholderLines || '  No stakeholders linked to partnerships yet'}

UNLINKED STAKEHOLDERS: ${unlinkedCount}

DEPARTMENT SUMMARY:
${deptLines || '  No department data'}`
}

export function InternalStakeholderReport() {
  const { data, isLoading } = useIntStakeholderReport()

  return (
    <ReportPage
      title="Internal Stakeholder Report"
      subtitle="Partnership involvement and meeting engagement per internal stakeholder and department"
      filename="Internal Stakeholder Report"
      loading={isLoading}
      memoPrompt={data ? buildSummaryPrompt(data) : null}
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
            { label: 'Total Stakeholders', value: data.total },
            { label: 'Departments', value: data.departments },
            { label: 'Partnerships Covered', value: data.coveredPartnerships },
            { label: 'Avg Partnerships / Person', value: data.avgPartnerships },
          ]} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department engagement */}
            <div className="space-y-3">
              <SectionTitle>Partnership Links by Department</SectionTitle>
              {data.byDepartment.length > 0 ? (
                <ChartWrapper minWidth={320}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.byDepartment} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="partnerships" fill="#3b82f6" name="Partnerships" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No data</p>}
            </div>

            {/* Top stakeholders */}
            <div className="space-y-3">
              <SectionTitle>Most Involved Individuals</SectionTitle>
              {data.topByPartnerships.length > 0 ? (
                <ChartWrapper minWidth={300}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.topByPartnerships} layout="vertical" barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Partnerships" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Meetings" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No involvement data</p>}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>Full Involvement Breakdown</SectionTitle>
            <ReportTable
              headers={['Name', 'Department', 'Title', 'Partnerships', 'Meetings Linked', 'Last Meeting', 'Partnership Names']}
              rows={data.rows.map(s => [
                s.name,
                s.department ?? '—',
                s.title ?? '—',
                s.partnershipCount,
                s.meetingCount,
                s.lastMeetingDate ? formatDate(s.lastMeetingDate) : '—',
                s.partnershipNames || '—',
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
