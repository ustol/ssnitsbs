import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts'
import { useMeetingAnalyticsReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, ChartWrapper } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

export function MeetingAnalyticsReport() {
  const { data, isLoading } = useMeetingAnalyticsReport()

  return (
    <ReportPage
      title="Meeting Analytics"
      subtitle="Meeting frequency trends, partnership engagement cadence and activity gaps"
      filename="Meeting Analytics Report"
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
