import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts'
import { useUserPerformanceReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, AISummaryCard } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

const PIE_COLORS = ['#E8621A','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899']

type UserData = NonNullable<ReturnType<typeof useUserPerformanceReport>['data']>

function buildSummaryPrompt(data: UserData): string {
  const totalRecords = data.users.reduce((s, u) => s + u.total, 0)
  const active = data.users.filter(u => u.total > 0).length
  const top = data.users[0]
  const second = data.users[1]
  const totalPartnerships = data.users.reduce((s, u) => s + u.partnerships_n, 0)
  const totalExt = data.users.reduce((s, u) => s + u.ext_n, 0)
  const totalInt = data.users.reduce((s, u) => s + u.int_n, 0)
  const totalDdg = data.users.reduce((s, u) => s + u.ddg_n, 0)
  const topShare = totalRecords > 0 && top ? Math.round((top.total / totalRecords) * 100) : 0

  return `Write a 3-sentence executive summary for a User Performance Report. Cite the exact figures in your sentences. No preambles, no filler phrases.

Key figures:
- Total system users: ${data.users.length} (${active} active with at least 1 record; ${data.users.length - active} with no records)
- Total records created across all modules: ${totalRecords}
  - Partnerships: ${totalPartnerships} | External meetings: ${totalExt} | Internal meetings: ${totalInt} | DDG feedback: ${totalDdg}
- Most active user: ${top?.full_name ?? 'N/A'} — ${top?.total ?? 0} records (${topShare}% of all records); breakdown: ${top?.partnerships_n ?? 0} partnerships, ${top?.ext_n ?? 0} ext. meetings, ${top?.int_n ?? 0} int. meetings, ${top?.ddg_n ?? 0} DDG feedback${second ? `\n- Second most active: ${second.full_name ?? 'N/A'} — ${second.total} records` : ''}`
}

export function UserPerformanceReport() {
  const { data, isLoading } = useUserPerformanceReport()

  const totalRecords = data?.users.reduce((s, u) => s + u.total, 0) ?? 0
  const mostActive = data?.users[0]

  // Pie data: contribution per user
  const pieData = (data?.users ?? [])
    .filter(u => u.total > 0)
    .map(u => ({ name: u.full_name?.split(' ')[0] ?? u.email ?? 'User', value: u.total }))

  return (
    <ReportPage
      title="User Performance Report"
      subtitle="Records created and activity breakdown per system user"
      filename="User Performance Report"
      loading={isLoading}
    >
      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'Active Users',      value: data.users.filter(u => u.total > 0).length },
            { label: 'Total Records',     value: totalRecords },
            { label: 'Most Active User',  value: mostActive?.full_name?.split(' ')[0] ?? '—' },
            { label: 'Top User Records',  value: mostActive?.total ?? 0 },
          ]} />

          <AISummaryCard prompt={buildSummaryPrompt(data)} />

          <div className="grid grid-cols-2 gap-6">
            {/* Stacked bar: activity breakdown per user */}
            <div className="space-y-3">
              <SectionTitle>Activity Breakdown by User</SectionTitle>
              {data.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.chartData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Partnerships"   stackId="a" fill="#E8621A" />
                    <Bar dataKey="Ext Meetings"   stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Int Meetings"   stackId="a" fill="#10b981" />
                    <Bar dataKey="DDG"            stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No activity recorded</p>}
            </div>

            {/* Pie: total contribution share */}
            <div className="space-y-3">
              <SectionTitle>Total Contribution Share</SectionTitle>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" paddingAngle={2}
                      label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No data</p>}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>User Activity Detail</SectionTitle>
            <ReportTable
              headers={['User', 'Role', 'Email', 'Partnerships', 'Ext. Meetings', 'Int. Meetings', 'DDG Feedback', 'Total']}
              rows={data.users.map(u => [
                u.full_name ?? '—',
                u.role ?? '—',
                u.email ?? '—',
                u.partnerships_n,
                u.ext_n,
                u.int_n,
                u.ddg_n,
                u.total,
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
