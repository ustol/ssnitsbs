import { useState } from 'react'
import {
  Users, Phone, AlertCircle, CheckCircle2, XCircle, Clock,
  Star, ShieldAlert, TrendingUp, Lightbulb, Activity,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { useTelehealthDashboard } from '@/hooks/useTelehealth'
import { KPICard } from '@/components/shared/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { TelehealthEntry } from '@/types/database'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

const CHART_COLORS = ['#E8621A', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777']

function InsightPanel({ title, icon: Icon, color, items, textKey, subKey }: {
  title: string
  icon: React.ElementType
  color: string
  items: TelehealthEntry[]
  textKey: keyof TelehealthEntry
  subKey?: keyof TelehealthEntry
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          <Icon size={13} className={color} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data for the selected period.</p>
        ) : (
          <ol className="space-y-0">
            {items.map((entry, i) => (
              <li key={entry.id} className="flex gap-2.5 py-2 border-b last:border-0">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-[0.6rem] font-bold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs leading-snug text-zinc-800 line-clamp-2">
                    {(entry[textKey] as string) ?? '—'}
                  </p>
                  {subKey && entry[subKey] && (
                    <p className="text-[0.6rem] text-muted-foreground mt-0.5">{entry[subKey] as string}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function TelehealthDashboard() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const { data, isLoading } = useTelehealthDashboard(year)

  return (
    <div className="p-6 space-y-6">
      {/* Header with joint branding */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-gradient-to-r from-[#0c0c0e] to-[#1a1a24] px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-5 rounded-sm bg-brand" />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Executive Dashboard</span>
            </div>
            <h1 className="text-xl font-bold text-white">Telehealth Service Reporting</h1>
            <p className="text-xs text-white/40 mt-0.5">SSNIT · The Trust Hospital · Telemedicine Programme</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="h-8 text-xs w-28 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Activity size={32} className="text-brand opacity-60" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Patients Contacted" value={data?.total_patients ?? 0} icon={<Users size={15} />} variant="brand" loading={isLoading} />
        <KPICard title="Follow-Up Activities" value={data?.total_followups ?? 0} icon={<Phone size={15} />} variant="default" loading={isLoading} />
        <KPICard title="Total Complaints" value={data?.total_complaints ?? 0} icon={<AlertCircle size={15} />} variant="warning" loading={isLoading} />
        <KPICard title="Issues Resolved" value={data?.issues_resolved ?? 0} icon={<CheckCircle2 size={15} />} variant="success" loading={isLoading} />
        <KPICard title="Open Issues" value={data?.open_issues ?? 0} icon={<Clock size={15} />} variant="warning" loading={isLoading} />
        <KPICard title="Closed Issues" value={data?.closed_issues ?? 0} icon={<XCircle size={15} />} variant="default" loading={isLoading} />
      </div>

      {/* Charts Row 1: Monthly trends */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-sm">Monthly Patient Engagement</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={data?.monthly_trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="patients" name="Patients" stroke="#E8621A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="followups" name="Follow-Ups" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="complaints" name="Complaints" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-sm">Patient Engagement by Region</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={(data?.by_region ?? []).slice(0, 10)} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="region" type="category" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" name="Interactions" fill="#E8621A" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Breakdowns */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-sm">Engagement Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-52 w-52 rounded-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data?.by_engagement_type ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(data?.by_engagement_type ?? []).map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-sm">Feedback Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.by_feedback_category ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" name="Count" radius={[3, 3, 0, 0]}>
                    {(data?.by_feedback_category ?? []).map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Executive Insight Panels */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Executive Insight Panels
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InsightPanel
            title="Top 5 Observations"
            icon={Star}
            color="text-brand"
            items={data?.top_observations ?? []}
            textKey="key_observation"
            subKey="region"
          />
          <InsightPanel
            title="Top 5 Risks"
            icon={ShieldAlert}
            color="text-red-500"
            items={data?.top_risks ?? []}
            textKey="root_cause"
            subKey="priority_level"
          />
          <InsightPanel
            title="Top 5 Recommendations"
            icon={TrendingUp}
            color="text-blue-600"
            items={data?.top_recommendations ?? []}
            textKey="recommendation"
            subKey="responsible_unit"
          />
          <InsightPanel
            title="Top 5 Opportunities"
            icon={Lightbulb}
            color="text-green-600"
            items={data?.top_opportunities ?? []}
            textKey="emerging_trend"
            subKey="feedback_category"
          />
        </div>
      </div>
    </div>
  )
}
