import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { useIntStakeholderReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, AISummaryCard } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#3b82f6','#E8621A','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316']

type IntData = NonNullable<ReturnType<typeof useIntStakeholderReport>['data']>

function buildSummaryPrompt(data: IntData): string {
  const topDept = data.byDepartment[0]
  const secondDept = data.byDepartment[1]
  const singleMember = data.byDepartment.filter(d => d.value === 1).length
  const fivePlus = data.byDepartment.filter(d => d.value >= 5).length
  const avgPerDept = data.departments > 0 ? (data.total / data.departments).toFixed(1) : '0'

  return `Write a 3-sentence executive summary for an Internal Stakeholder Report. Cite the exact figures in your sentences. No preambles, no filler phrases.

Key figures:
- Total internal stakeholders: ${data.total}
- Departments represented: ${data.departments}
- Average stakeholders per department: ${avgPerDept}
- Largest department: ${topDept?.name ?? 'N/A'} (${topDept?.value ?? 0} members)${secondDept ? `, followed by ${secondDept.name} (${secondDept.value})` : ''}
- Departments with only 1 member: ${singleMember}
- Departments with 5 or more members: ${fivePlus}`
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
