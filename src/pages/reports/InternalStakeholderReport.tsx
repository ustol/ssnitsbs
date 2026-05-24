import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { useIntStakeholderReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, AISummaryCard } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#3b82f6','#E8621A','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316']

type IntData = NonNullable<ReturnType<typeof useIntStakeholderReport>['data']>

function buildSummaryPrompt(data: IntData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const stakeholderLines = data.rows.slice(0, 20).map(s => {
    const r = s as Record<string, unknown>
    const partnerships = (r.partnershipNames as string | undefined) || 'No partnerships linked'
    return `  • ${s.name} — ${s.department ?? 'No dept'} (${s.title ?? 'No title'}) — Partnerships: ${partnerships}`
  }).join('\n')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meetingLines = (data.recentMeetings as any[]).slice(0, 10).map((m: any) =>
    `  • ${m.title ?? 'Untitled'} (${m.meeting_date ?? '—'})${m.action_points ? `\n    Actions: ${(m.action_points as string).substring(0, 180)}` : ''}`
  ).join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format:

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: Internal Stakeholder Engagement Report

[Write 3–4 paragraphs: (1) overview of SSNIT's internal stakeholder coverage across departments, (2) departmental participation — name the most active departments and their members, (3) recent internal meeting activity with specific outcomes, (4) any gaps or follow-up actions required. Reference departments, individuals, and partnerships by name.]

--- DATA ---

INTERNAL STAKEHOLDERS (${data.total} across ${data.departments} departments):
${stakeholderLines || '  No internal stakeholders recorded.'}

RECENT INTERNAL MEETINGS (last ${Math.min(10, (data.recentMeetings as unknown[]).length)}):
${meetingLines || '  No internal meetings recorded.'}`
}

export function InternalStakeholderReport() {
  const { data, isLoading } = useIntStakeholderReport()

  return (
    <ReportPage
      title="Internal Stakeholder Report"
      subtitle="Headcount and department breakdown for all internal stakeholders"
      filename="Internal Stakeholder Report"
      loading={isLoading}
    >
      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'Total Stakeholders', value: data.total },
            { label: 'Departments',        value: data.departments },
            { label: 'Largest Dept.',      value: data.byDepartment[0]?.name ?? '—' },
            { label: 'Dept. Size (max)',   value: data.byDepartment[0]?.value ?? 0 },
          ]} />

          <AISummaryCard prompt={buildSummaryPrompt(data)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar chart: headcount by department */}
            <div className="space-y-3">
              <SectionTitle>Headcount by Department</SectionTitle>
              {data.byDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.byDepartment} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Staff" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No data</p>}
            </div>

            {/* Pie chart: department share */}
            <div className="space-y-3">
              <SectionTitle>Department Distribution</SectionTitle>
              {data.byDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.byDepartment.slice(0, 8)}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {data.byDepartment.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No data</p>}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>Full Internal Stakeholder List</SectionTitle>
            <ReportTable
              headers={['Name', 'Title', 'Department', 'Email', 'Phone', 'Notes']}
              rows={data.rows.map(s => [
                s.name,
                s.title ?? '—',
                s.department ?? '—',
                s.email ?? '—',
                s.phone ?? '—',
                s.notes ? s.notes.substring(0, 60) + (s.notes.length > 60 ? '…' : '') : '—',
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
