import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts'
import { useExecutiveReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable, AISummaryCard } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#E8621A','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316']

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

type ExecData = NonNullable<ReturnType<typeof useExecutiveReport>['data']>

function buildSummaryPrompt(data: ExecData): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const totalExt = data.rows.reduce((s, p) => s + p.extCount, 0)
  const totalInt = data.rows.reduce((s, p) => s + p.intCount, 0)
  const pendingDDG = data.ddgItems.filter(f => !f.actioned).length

  const partnershipLines = data.rows.map(p => {
    const desc = (p as Record<string, unknown>).description as string | null
    return `  • ${(p as { title: string }).title} [${(p as { status?: { name: string } }).status?.name ?? 'No Status'}] — Proposed: ${fmt((p as { proposed_value?: number }).proposed_value ?? 0)} members, Meetings: ${p.extCount} ext / ${p.intCount} int${desc ? `\n    Objective: ${desc.substring(0, 200)}` : ''}`
  }).join('\n')

  const extMeetingLines = data.extMeetingDetails.slice(0, 10).map(m =>
    `  • ${m.title ?? 'Untitled'} (${m.date ?? 'No date'})${m.partnership ? ` — ${m.partnership}` : ''}${m.location ? ` @ ${m.location}` : ''}${m.action_points ? `\n    Actions: ${(m.action_points as string).substring(0, 180)}` : ''}`
  ).join('\n')

  const intMeetingLines = data.intMeetingDetails.slice(0, 8).map(m =>
    `  • ${m.title ?? 'Untitled'} (${m.date ?? 'No date'})${m.partnership ? ` — ${m.partnership}` : ''}${m.action_points ? `\n    Actions: ${(m.action_points as string).substring(0, 150)}` : ''}`
  ).join('\n')

  const ddgLines = data.ddgItems.slice(0, 8).map(f =>
    `  • [${f.type}] ${f.summary ?? 'No summary'} — ${f.actioned ? 'Actioned' : 'PENDING'} (${f.date ?? '—'})`
  ).join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format (include the header lines):

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: Executive Overview of Strategic Partnership Pipeline

[Write 4–5 paragraphs: (1) overall pipeline health and numbers, (2) highlight the most active or significant partnerships by name with specific meeting outcomes, (3) DDG feedback status, (4) projections and outlook, (5) recommended actions or items requiring the DDG's attention. Reference partnerships and meetings by their actual names. Cite exact figures throughout.]

--- DATA ---

PARTNERSHIP PIPELINE (${data.rows.length} total):
${partnershipLines || '  No partnerships recorded.'}

PIPELINE PROJECTIONS:
  Full pipeline: ${fmt(data.totalProposed)} members
  Best case (${data.bestPct}%): ${fmt(Math.round(data.totalProposed * data.bestPct / 100))} members
  Worst case (${data.worstPct}%): ${fmt(Math.round(data.totalProposed * data.worstPct / 100))} members

RECENT EXTERNAL MEETINGS (last ${Math.min(10, data.extMeetingDetails.length)}):
${extMeetingLines || '  No external meetings.'}

RECENT INTERNAL MEETINGS (last ${Math.min(8, data.intMeetingDetails.length)}):
${intMeetingLines || '  No internal meetings.'}

DDG FEEDBACK (${data.ddgItems.length} items, ${pendingDDG} pending):
${ddgLines || '  No DDG feedback recorded.'}

Total meetings: ${totalExt + totalInt} (${totalExt} external, ${totalInt} internal)`
}

export function ExecutiveOverviewReport() {
  const { data, isLoading } = useExecutiveReport()

  return (
    <ReportPage
      title="Executive Overview"
      subtitle="Full partnership pipeline — statuses, proposed values, meeting activity and projections"
      filename="Executive Overview Report"
      loading={isLoading}
    >
      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'Total Partnerships', value: data.rows.length },
            { label: 'Total Proposed',     value: fmt(data.totalProposed) },
            { label: `Best Case (${data.bestPct}%)`, value: fmt(Math.round(data.totalProposed * data.bestPct / 100)), color: 'text-green-600' },
            { label: `Worst Case (${data.worstPct}%)`, value: fmt(Math.round(data.totalProposed * data.worstPct / 100)), color: 'text-amber-600' },
          ]} />

          <AISummaryCard prompt={buildSummaryPrompt(data)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pipeline projections bar */}
            <div className="space-y-3">
              <SectionTitle>Pipeline Projections</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.projections} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [fmt(v), 'Members']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {data.projections.map((_, i) => (
                      <Cell key={i} fill={['#E8621A', '#10b981', '#f59e0b'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Partnerships by status donut */}
            <div className="space-y-3">
              <SectionTitle>Partnerships by Status</SectionTitle>
              {data.byStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={data.byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                      {data.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No status data</p>}
            </div>

            {/* Top partnerships by meetings */}
            <div className="space-y-3">
              <SectionTitle>Top Partnerships by Meeting Activity</SectionTitle>
              {data.topByMeetings.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.topByMeetings} layout="vertical" barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="ext" stackId="a" fill="#3b82f6" name="External" />
                    <Bar dataKey="int" stackId="a" fill="#10b981" name="Internal" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No meeting data</p>}
            </div>

            {/* Meetings over time area chart */}
            <div className="space-y-3">
              <SectionTitle>Meeting Activity Over Time</SectionTitle>
              {data.monthlyMeetings.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.monthlyMeetings}>
                    <defs>
                      <linearGradient id="meetingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E8621A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#E8621A" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="count" stroke="#E8621A" strokeWidth={2} fill="url(#meetingGrad)" name="Meetings" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-zinc-400 py-8 text-center">No meeting timeline data</p>}
            </div>
          </div>

          {/* Value by status */}
          {data.valueByStatus.length > 0 && (
            <div className="space-y-3">
              <SectionTitle>Proposed Members by Status</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.valueByStatus} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [fmt(v), 'Members']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.valueByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-3">
            <SectionTitle>Full Partnership List</SectionTitle>
            <ReportTable
              headers={['Partnership', 'Organisation', 'Status', 'Proposed Members', 'Ext. Meetings', 'Int. Meetings', 'Total Meetings']}
              rows={data.rows.map(p => [
                (p as { title: string }).title,
                (p as { organization?: string }).organization ?? '—',
                (p as { status?: { name: string } }).status?.name ?? '—',
                fmt((p as { proposed_value?: number }).proposed_value ?? 0),
                p.extCount,
                p.intCount,
                p.totalMeetings,
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
