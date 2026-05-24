import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts'
import { useUserPerformanceReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, AISummaryCard } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Info } from 'lucide-react'

const PIE_COLORS = ['#E8621A','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899']

type UserData = NonNullable<ReturnType<typeof useUserPerformanceReport>['data']>

function buildSummaryPrompt(data: UserData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const active = data.users.filter(u => u.total > 0).length
  const totalAll = data.totals.partnerships + data.totals.ext + data.totals.int + data.totals.ddg

  const userLines = data.users.filter(u => u.total > 0).map(u =>
    `  • ${u.full_name ?? u.email ?? 'Unknown'} (${u.role ?? 'Standard'}) — ${u.total} records total: ${u.partnerships_n} partnerships, ${u.ext_n} ext. meetings, ${u.int_n} int. meetings, ${u.ddg_n} DDG feedback`
  ).join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format:

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: User Activity and Performance Report — SBS System

[Write 3–4 paragraphs: (1) overall system usage and data entry activity, (2) individual user contributions — name the most active users and what they've contributed, (3) attribution coverage and any unattributed records, (4) any observations or recommendations. Reference users by their actual names and specific record counts.]

--- DATA ---

SYSTEM USERS (${data.users.length} total, ${active} with attributed activity):
${userLines || '  No attributed activity recorded.'}

SYSTEM TOTALS:
  Partnerships: ${data.totals.partnerships} (${data.attributed.partnerships} attributed)
  External Meetings: ${data.totals.ext} (${data.attributed.ext} attributed)
  Internal Meetings: ${data.totals.int} (${data.attributed.int} attributed)
  DDG Feedback: ${data.totals.ddg} (${data.attributed.ddg} attributed)
  Unattributed records: ${data.unattributed} of ${totalAll}`
}

export function UserPerformanceReport() {
  const { data, isLoading, error } = useUserPerformanceReport()

  const totalAll = (data?.totals.partnerships ?? 0) + (data?.totals.ext ?? 0) + (data?.totals.int ?? 0) + (data?.totals.ddg ?? 0)
  const mostActive = data?.users[0]

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
      ) : error ? (
        <div className="flex items-center gap-3 p-6 rounded-xl border border-red-100 bg-red-50 text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <div>
            <p className="font-semibold text-sm">Failed to load report</p>
            <p className="text-xs mt-0.5 text-red-600">{(error as Error).message}</p>
          </div>
        </div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'System Users',         value: data.users.length },
            { label: 'Total Records',        value: totalAll },
            { label: 'Partnerships',         value: data.totals.partnerships },
            { label: 'Meetings (Ext + Int)', value: data.totals.ext + data.totals.int },
          ]} />

          <AISummaryCard prompt={buildSummaryPrompt(data)} />

          {/* Unattributed notice */}
          {data.unattributed > 0 && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-amber-100 bg-amber-50 text-amber-800">
              <Info size={15} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed">
                <span className="font-semibold">{data.unattributed} record{data.unattributed !== 1 ? 's' : ''}</span> created before user attribution was enabled are not shown per user below.
                All newly created records are attributed automatically.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-500 font-medium">No attributed activity yet</p>
                  <p className="text-xs text-zinc-400 mt-1">Create new records to start tracking per-user contributions</p>
                </div>
              )}
            </div>

            {/* Pie: total contribution share */}
            <div className="space-y-3">
              <SectionTitle>Attributed Contribution Share</SectionTitle>
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
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-400">No attributed data</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary by module */}
          <div className="space-y-3">
            <SectionTitle>System Totals by Module</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Partnerships',     total: data.totals.partnerships, attributed: data.attributed.partnerships, color: '#E8621A' },
                { label: 'Ext. Meetings',    total: data.totals.ext,          attributed: data.attributed.ext,          color: '#3b82f6' },
                { label: 'Int. Meetings',    total: data.totals.int,          attributed: data.attributed.int,          color: '#10b981' },
                { label: 'DDG Feedback',     total: data.totals.ddg,          attributed: data.attributed.ddg,          color: '#f59e0b' },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-lg border bg-zinc-50 space-y-1">
                  <p className="text-xs text-zinc-500 font-medium">{m.label}</p>
                  <p className="text-xl font-bold" style={{ color: m.color }}>{m.total}</p>
                  <p className="text-[10px] text-zinc-400">{m.attributed} attributed</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>User Activity Detail</SectionTitle>
            <ReportTable
              headers={['User', 'Role', 'Email', 'Partnerships', 'Ext. Meetings', 'Int. Meetings', 'DDG Feedback', 'Attributed Total']}
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
            {mostActive && mostActive.total === 0 && data.unattributed > 0 && (
              <p className="text-xs text-zinc-400 text-center pt-1">
                All {data.unattributed} existing records pre-date attribution. New records are tracked automatically.
              </p>
            )}
          </div>
        </>
      )}
    </ReportPage>
  )
}
