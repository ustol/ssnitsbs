import { useState } from 'react'
import { ShieldAlert, Lightbulb, Star, TrendingUp } from 'lucide-react'
import { useMonthlyConsolidation } from '@/hooks/useTelehealth'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MonthlyTotals } from '@/types/database'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

function TotalCell({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <td className={cn('px-3 py-2 text-right tabular-nums text-sm', highlight && 'font-bold bg-zinc-50')}>
      {value.toLocaleString()}
    </td>
  )
}

function MonthRow({ row, isTotals }: { row: MonthlyTotals; isTotals?: boolean }) {
  return (
    <tr className={cn(
      'border-b last:border-0 transition-colors',
      isTotals
        ? 'bg-brand/5 font-semibold'
        : row.total_patients > 0 ? 'hover:bg-zinc-50' : 'opacity-40 hover:bg-zinc-50',
    )}>
      <td className={cn('px-3 py-2 text-sm font-medium', isTotals && 'text-brand')}>{row.month}</td>
      <TotalCell value={row.total_patients} />
      <TotalCell value={row.total_followups} />
      <TotalCell value={row.total_feedback} />
      <TotalCell value={row.total_complaints} />
      <TotalCell value={row.issues_resolved} />
      <TotalCell value={row.escalations} />
      {isTotals && <TotalCell value={row.total_patients} highlight />}
    </tr>
  )
}

function InsightList({ items, label, icon: Icon, color }: {
  items: { id: string; text: string | null; sub?: string | null }[]
  label: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon size={14} className={color} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data for selected year.</p>
        ) : (
          <ol className="space-y-0">
            {items.map((item, i) => (
              <li key={item.id} className="flex gap-3 py-2.5 border-b last:border-0">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center text-[0.65rem] font-bold mt-px">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-800 leading-snug">{item.text ?? '—'}</p>
                  {item.sub && <p className="text-[0.65rem] text-muted-foreground mt-0.5">{item.sub}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function MonthlyConsolidation() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const { data, isLoading } = useMonthlyConsolidation(year)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Monthly Consolidation"
        subtitle="Jan–Dec monthly totals with top observations, recommendations, risks, and opportunities"
      />

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-600">Year:</span>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="h-9 text-sm w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Totals Table */}
      <Card>
        <CardHeader className="pb-2 px-5 pt-4">
          <CardTitle className="text-sm">Monthly Activity Totals — {year}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b bg-zinc-50">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Month</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Patients Contacted</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Follow-Up Activities</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Feedback Records</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Complaints</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Issues Resolved</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Escalations</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-3 py-2">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <>
                    {data?.months.map(m => <MonthRow key={m.month} row={m} />)}
                    {data?.year_total && (
                      <MonthRow row={data.year_total} isTotals />
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insight panels — 2x2 grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        <InsightList
          label="Top 5 Key Observations"
          icon={Star}
          color="text-brand"
          items={(data?.top_observations ?? []).map(e => ({
            id: e.id,
            text: e.key_observation,
            sub: `${e.reporting_period} — ${e.region}`,
          }))}
        />
        <InsightList
          label="Top 5 Recommendations"
          icon={TrendingUp}
          color="text-blue-600"
          items={(data?.top_recommendations ?? []).map(e => ({
            id: e.id,
            text: e.recommendation,
            sub: `${e.priority_level ?? 'No priority'} — ${e.responsible_unit ?? 'Unassigned'}`,
          }))}
        />
        <InsightList
          label="Top 5 Risk Areas"
          icon={ShieldAlert}
          color="text-red-500"
          items={(data?.top_risks ?? []).map(e => ({
            id: e.id,
            text: e.root_cause,
            sub: `Escalation: ${e.escalation_required ?? 'N/A'} — Priority: ${e.priority_level ?? 'N/A'}`,
          }))}
        />
        <InsightList
          label="Top 5 Opportunities"
          icon={Lightbulb}
          color="text-green-600"
          items={(data?.top_opportunities ?? []).map(e => ({
            id: e.id,
            text: e.emerging_trend ?? e.recommendation,
            sub: `${e.feedback_category} — ${e.region}`,
          }))}
        />
      </div>
    </div>
  )
}
