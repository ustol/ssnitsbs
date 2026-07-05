import { useState } from 'react'
import { ShieldAlert, Lightbulb, TrendingUp, CalendarCheck, MapPin, Zap } from 'lucide-react'
import { useQuarterlyConsolidation } from '@/hooks/useTelehealth'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { QuarterTotals } from '@/types/database'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

const QUARTER_COLORS: Record<string, string> = {
  Q1: 'border-l-blue-400',
  Q2: 'border-l-green-400',
  Q3: 'border-l-amber-400',
  Q4: 'border-l-purple-400',
}

function QuarterCard({ q }: { q: QuarterTotals }) {
  return (
    <Card className={cn('border-l-4', QUARTER_COLORS[q.quarter] ?? 'border-l-zinc-300')}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">{q.quarter}</CardTitle>
          <span className="text-xs text-muted-foreground">{q.months.join(', ')}</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Patients', value: q.total_patients },
            { label: 'Follow-Ups', value: q.total_followups },
            { label: 'Feedback', value: q.total_feedback },
            { label: 'Complaints', value: q.total_complaints },
            { label: 'Resolved', value: q.issues_resolved },
            { label: 'Escalations', value: q.escalations },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-lg font-bold tabular-nums">{item.value.toLocaleString()}</p>
              <p className="text-[0.65rem] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function YearSummaryBar({ data }: { data: { busiest_month: string; busiest_quarter: string; months_with_activity: number } }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {[
        { icon: CalendarCheck, label: 'Busiest Month', value: data.busiest_month, color: 'text-brand' },
        { icon: Zap, label: 'Busiest Quarter', value: data.busiest_quarter, color: 'text-purple-600' },
        { icon: MapPin, label: 'Months with Activity', value: `${data.months_with_activity} / 12`, color: 'text-green-600' },
      ].map(item => (
        <Card key={item.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <item.icon size={18} className={item.color} />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function NarrativeList({ title, icon: Icon, color, items, textKey }: {
  title: string
  icon: React.ElementType
  color: string
  items: { id: string; [key: string]: string | null | number }[]
  textKey: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon size={14} className={color} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data for selected year.</p>
        ) : (
          <ol className="space-y-0">
            {items.map((item, i) => (
              <li key={item.id as string} className="flex gap-3 py-2.5 border-b last:border-0">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center text-[0.65rem] font-bold mt-px">
                  {i + 1}
                </span>
                <p className="text-xs text-zinc-800 leading-snug">{(item[textKey] as string) ?? '—'}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function QuarterlyConsolidation() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const { data, isLoading } = useQuarterlyConsolidation(year)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Quarterly Consolidation"
        subtitle="Q1–Q4 aggregation with busiest period analysis and management recommendations"
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

      {/* Quarter Cards */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data?.quarters.map(q => <QuarterCard key={q.quarter} q={q} />)}
        </div>
      )}

      {/* Year totals row */}
      {!isLoading && data?.year_total && (
        <Card className="border-l-4 border-l-brand bg-brand/[0.02]">
          <CardContent className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-3">Year Total — {year}</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {[
                { label: 'Patients', value: data.year_total.total_patients },
                { label: 'Follow-Ups', value: data.year_total.total_followups },
                { label: 'Feedback', value: data.year_total.total_feedback },
                { label: 'Complaints', value: data.year_total.total_complaints },
                { label: 'Resolved', value: data.year_total.issues_resolved },
                { label: 'Escalations', value: data.year_total.escalations },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className="text-xl font-bold tabular-nums text-brand">{item.value.toLocaleString()}</p>
                  <p className="text-[0.65rem] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year summary bar */}
      {!isLoading && data && (
        <YearSummaryBar data={data} />
      )}

      {/* Narrative sections */}
      {!isLoading && data && (
        <div className="grid sm:grid-cols-3 gap-4">
          <NarrativeList
            title="Emerging Trends"
            icon={TrendingUp}
            color="text-blue-600"
            items={data.emerging_trends.map(e => ({ id: e.id, emerging_trend: e.emerging_trend }))}
            textKey="emerging_trend"
          />
          <NarrativeList
            title="Major Service Concerns (Risks)"
            icon={ShieldAlert}
            color="text-red-500"
            items={data.top_risks.map(e => ({ id: e.id, root_cause: e.root_cause }))}
            textKey="root_cause"
          />
          <NarrativeList
            title="Key Recommendations for Management"
            icon={Lightbulb}
            color="text-green-600"
            items={data.top_recommendations.map(e => ({ id: e.id, recommendation: e.recommendation }))}
            textKey="recommendation"
          />
        </div>
      )}
    </div>
  )
}
