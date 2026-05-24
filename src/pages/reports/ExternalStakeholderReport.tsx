import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { useExtStakeholderReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, AISummaryCard } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#E8621A','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316']

type ExtData = NonNullable<ReturnType<typeof useExtStakeholderReport>['data']>

function buildSummaryPrompt(data: ExtData): string {
  const totalLinks = data.rows.reduce((s, r) => s + r.partnershipCount, 0)
  const avgLinks = data.total > 0 ? (totalLinks / data.total).toFixed(1) : '0'
  const noLinks = data.rows.filter(r => r.partnershipCount === 0).length
  const topOrg = data.byOrg[0]
  const secondOrg = data.byOrg[1]
  const topConnected = data.topByPartnerships[0]
  const multiLinked = data.rows.filter(r => r.partnershipCount >= 2).length

  return `Write a 3-sentence executive summary for an External Stakeholder Report. Cite the exact figures in your sentences. No preambles, no filler phrases.

Key figures:
- Total external stakeholders on record: ${data.total}
- Unique organisations represented: ${data.byOrg.length}
- Total partnership linkages: ${totalLinks} (average ${avgLinks} per stakeholder)
- Stakeholders linked to 2 or more partnerships: ${multiLinked}
- Stakeholders with no partnership links: ${noLinks}
- Largest organisation: ${topOrg?.name ?? 'N/A'} (${topOrg?.value ?? 0} stakeholders)${secondOrg ? `, followed by ${secondOrg.name} (${secondOrg.value})` : ''}
- Most-connected stakeholder: ${topConnected?.name ?? 'N/A'} (linked to ${topConnected?.value ?? 0} partnerships)`
}

export function ExternalStakeholderReport() {
  const { data, isLoading } = useExtStakeholderReport()

  return (
    <ReportPage
      title="External Stakeholder Report"
      subtitle="Activity overview for all external stakeholders — organisations, partnerships and engagement depth"
      filename="External Stakeholder Report"
      loading={isLoading}
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

          <AISummaryCard prompt={buildSummaryPrompt(data)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stakeholders by Organisation */}
            <div className="space-y-3">
              <SectionTitle>Stakeholders by Organisation (Top 10)</SectionTitle>
              {data.byOrg.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.byOrg} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#E8621A" radius={[0, 4, 4, 0]} name="Stakeholders" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No data</p>}
            </div>

            {/* Top by partnership count */}
            <div className="space-y-3">
              <SectionTitle>Top Stakeholders by Partnership Count</SectionTitle>
              {data.topByPartnerships.filter(x => x.value > 0).length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.topByPartnerships.filter(x => x.value > 0)} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Partnerships" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={data.byOrg.slice(0, 6)} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name.substring(0, 12)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {data.byOrg.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>Full Stakeholder List</SectionTitle>
            <ReportTable
              headers={['Name', 'Organisation', 'Title', 'Email', 'Phone', '# Partnerships', 'Partnerships']}
              rows={data.rows.map(s => [
                s.name,
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
