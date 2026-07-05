import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  TelehealthEntry, TeleRefItem, TelehealthFilters,
  WeeklySummaryStats, MonthlyConsolidationData, QuarterlyConsolidationData,
  DashboardMetrics, MonthlyTotals, QuarterTotals,
} from '@/types/database'
import { writeAudit } from './useAuditLog'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const MONTH_MAP: Record<string, number> = {
  'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
  'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
}

function parseMonthFromPeriod(period: string): number {
  const prefix = period.substring(0, 3)
  return MONTH_MAP[prefix] ?? 0
}

// ── Reference lists ────────────────────────────────────────────────────────────

async function fetchRef(table: string): Promise<TeleRefItem[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export function useTelehealthConfig() {
  return useQuery({
    queryKey: ['tele-config'],
    queryFn: async () => {
      const [periods, cycles, engagements, channels, feedbackCats, priorities, statuses, regions, units] =
        await Promise.all([
          fetchRef('tele_reporting_periods'),
          fetchRef('tele_weekly_cycles'),
          fetchRef('tele_engagement_types'),
          fetchRef('tele_digital_channels'),
          fetchRef('tele_feedback_categories'),
          fetchRef('tele_priority_levels'),
          fetchRef('tele_statuses'),
          fetchRef('tele_regions'),
          fetchRef('tele_responsible_units'),
        ])
      return { periods, cycles, engagements, channels, feedbackCats, priorities, statuses, regions, units }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ── Entry list ─────────────────────────────────────────────────────────────────

export function useTelehealthEntries(filters: TelehealthFilters = {}) {
  return useQuery({
    queryKey: ['tele-entries', filters],
    queryFn: async (): Promise<TelehealthEntry[]> => {
      let q = supabase
        .from('telehealth_entries')
        .select('*')
        .order('date_of_interaction', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.reporting_period) q = q.eq('reporting_period', filters.reporting_period)
      if (filters.weekly_cycle)     q = q.eq('weekly_cycle', filters.weekly_cycle)
      if (filters.region)           q = q.eq('region', filters.region)
      if (filters.status)           q = q.eq('status', filters.status)
      if (filters.feedback_category) q = q.eq('feedback_category', filters.feedback_category)
      if (filters.priority_level)   q = q.eq('priority_level', filters.priority_level)
      if (filters.responsible_unit) q = q.eq('responsible_unit', filters.responsible_unit)
      if (filters.quarter)          q = q.eq('quarter', filters.quarter)
      if (filters.date_from)        q = q.gte('date_of_interaction', filters.date_from)
      if (filters.date_to)          q = q.lte('date_of_interaction', filters.date_to)
      if (filters.search) {
        q = q.or(
          `patient_full_name.ilike.%${filters.search}%,` +
          `cro_name.ilike.%${filters.search}%,` +
          `entry_id.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Single entry ───────────────────────────────────────────────────────────────

export function useTelehealthEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['tele-entry', id],
    enabled: !!id,
    queryFn: async (): Promise<TelehealthEntry | null> => {
      const { data, error } = await supabase
        .from('telehealth_entries')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ── Create / Update / Delete ───────────────────────────────────────────────────

export function useCreateTelehealthEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<TelehealthEntry>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('telehealth_entries')
        .insert({ ...values, created_by: user?.id, updated_by: user?.id })
        .select()
        .single()
      if (error) throw error
      writeAudit({
        action: 'created',
        entity_type: 'telehealth_entry',
        entity_id: data.id,
        entity_name: `${data.entry_id} – ${data.patient_full_name}`,
      })
      return data as TelehealthEntry
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tele-entries'] }),
  })
}

export function useUpdateTelehealthEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<TelehealthEntry> }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('telehealth_entries')
        .update({ ...values, updated_by: user?.id })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      writeAudit({
        action: 'updated',
        entity_type: 'telehealth_entry',
        entity_id: data.id,
        entity_name: `${data.entry_id} – ${data.patient_full_name}`,
      })
      return data as TelehealthEntry
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['tele-entries'] })
      qc.invalidateQueries({ queryKey: ['tele-entry', id] })
    },
  })
}

export function useDeleteTelehealthEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: TelehealthEntry) => {
      const { error } = await supabase.from('telehealth_entries').delete().eq('id', entry.id)
      if (error) throw error
      writeAudit({
        action: 'deleted',
        entity_type: 'telehealth_entry',
        entity_id: entry.id,
        entity_name: `${entry.entry_id} – ${entry.patient_full_name}`,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tele-entries'] }),
  })
}

// ── Duplicate check (pre-save) ─────────────────────────────────────────────────

export async function checkDuplicate(name: string, phone: string, excludeId?: string): Promise<boolean> {
  if (!phone.trim()) return false
  let q = supabase
    .from('telehealth_entries')
    .select('id', { count: 'exact', head: true })
    .ilike('patient_full_name', name.trim())
    .eq('telephone_number', phone.trim())
  if (excludeId) q = q.neq('id', excludeId)
  const { count } = await q
  return (count ?? 0) > 0
}

// ── Weekly Summary ─────────────────────────────────────────────────────────────

export function useWeeklySummary(period: string, cycle: string) {
  return useQuery({
    queryKey: ['tele-weekly-summary', period, cycle],
    enabled: !!period && !!cycle,
    queryFn: async (): Promise<WeeklySummaryStats> => {
      const { data, error } = await supabase
        .from('telehealth_entries')
        .select('*')
        .eq('reporting_period', period)
        .eq('weekly_cycle', cycle)
        .order('date_of_interaction', { ascending: true })
      if (error) throw error
      const entries: TelehealthEntry[] = data ?? []

      const followupTypes = new Set([
        'Follow-Up Call', 'Recovery Monitoring', 'Appointment Reminder Call', 'SMS Reminder',
      ])

      const stats: WeeklySummaryStats = {
        total_patients:    entries.length,
        total_followups:   entries.filter(e => followupTypes.has(e.engagement_type)).length,
        total_feedback:    entries.filter(e => e.feedback_category).length,
        total_complaints:  entries.filter(e => e.complaint === 'Yes').length,
        issues_resolved:   entries.filter(e => e.issue_resolved === 'Yes').length,
        positive_count:    entries.filter(e => e.positive_feedback === 'Yes').length,
        complaint_count:   entries.filter(e => e.complaint === 'Yes').length,
        suggestion_count:  entries.filter(e => e.suggestion === 'Yes').length,
        neutral_count:     entries.filter(e => e.feedback_category === 'Neutral').length,
        top_observations: entries
          .filter(e => e.key_observation)
          .sort((a, b) => (b.observation_sort_key ?? 0) - (a.observation_sort_key ?? 0))
          .slice(0, 3),
        top_recommendations: entries
          .filter(e => e.recommendation)
          .sort((a, b) => (b.recommendation_sort_key ?? 0) - (a.recommendation_sort_key ?? 0))
          .slice(0, 3),
      }
      return stats
    },
  })
}

// ── Monthly Consolidation ──────────────────────────────────────────────────────

export function useMonthlyConsolidation(year: number) {
  return useQuery({
    queryKey: ['tele-monthly', year],
    queryFn: async (): Promise<MonthlyConsolidationData> => {
      const { data, error } = await supabase
        .from('telehealth_entries')
        .select('*')
        .ilike('reporting_period', `%${year}%`)
        .order('date_of_interaction', { ascending: true })
      if (error) throw error
      const entries: TelehealthEntry[] = data ?? []

      const followupTypes = new Set([
        'Follow-Up Call', 'Recovery Monitoring', 'Appointment Reminder Call', 'SMS Reminder',
      ])

      const monthMap: Record<number, MonthlyTotals> = {}
      for (let m = 1; m <= 12; m++) {
        monthMap[m] = {
          month: MONTH_NAMES[m - 1],
          month_num: m,
          total_patients: 0,
          total_followups: 0,
          total_feedback: 0,
          total_complaints: 0,
          issues_resolved: 0,
          escalations: 0,
        }
      }

      for (const e of entries) {
        const m = parseMonthFromPeriod(e.reporting_period)
        if (!monthMap[m]) continue
        monthMap[m].total_patients++
        if (followupTypes.has(e.engagement_type)) monthMap[m].total_followups++
        if (e.feedback_category) monthMap[m].total_feedback++
        if (e.complaint === 'Yes') monthMap[m].total_complaints++
        if (e.issue_resolved === 'Yes') monthMap[m].issues_resolved++
        if (e.escalation_required === 'Yes') monthMap[m].escalations++
      }

      const months = Object.values(monthMap).sort((a, b) => a.month_num - b.month_num)
      const year_total: MonthlyTotals = {
        month: 'Year Total',
        month_num: 0,
        total_patients:  months.reduce((s, m) => s + m.total_patients, 0),
        total_followups: months.reduce((s, m) => s + m.total_followups, 0),
        total_feedback:  months.reduce((s, m) => s + m.total_feedback, 0),
        total_complaints:months.reduce((s, m) => s + m.total_complaints, 0),
        issues_resolved: months.reduce((s, m) => s + m.issues_resolved, 0),
        escalations:     months.reduce((s, m) => s + m.escalations, 0),
      }

      return {
        months,
        year_total,
        top_observations: entries
          .filter(e => e.key_observation)
          .sort((a, b) => (b.observation_sort_key ?? 0) - (a.observation_sort_key ?? 0))
          .slice(0, 5),
        top_recommendations: entries
          .filter(e => e.recommendation)
          .sort((a, b) => (b.recommendation_sort_key ?? 0) - (a.recommendation_sort_key ?? 0))
          .slice(0, 5),
        top_risks: entries
          .filter(e => e.root_cause && (e.risk_sort_key ?? 0) > 0)
          .sort((a, b) => (b.risk_sort_key ?? 0) - (a.risk_sort_key ?? 0))
          .slice(0, 5),
        top_opportunities: entries
          .filter(e => (e.opportunity_sort_key ?? 0) > 0)
          .sort((a, b) => (b.opportunity_sort_key ?? 0) - (a.opportunity_sort_key ?? 0))
          .slice(0, 5),
      }
    },
  })
}

// ── Quarterly Consolidation ────────────────────────────────────────────────────

export function useQuarterlyConsolidation(year: number) {
  return useQuery({
    queryKey: ['tele-quarterly', year],
    queryFn: async (): Promise<QuarterlyConsolidationData> => {
      const { data, error } = await supabase
        .from('telehealth_entries')
        .select('*')
        .ilike('reporting_period', `%${year}%`)
        .order('date_of_interaction', { ascending: true })
      if (error) throw error
      const entries: TelehealthEntry[] = data ?? []

      const followupTypes = new Set([
        'Follow-Up Call', 'Recovery Monitoring', 'Appointment Reminder Call', 'SMS Reminder',
      ])

      const qDef: Record<string, { months: string[]; month_nums: number[] }> = {
        'Q1': { months: ['Jan', 'Feb', 'Mar'], month_nums: [1, 2, 3] },
        'Q2': { months: ['Apr', 'May', 'Jun'], month_nums: [4, 5, 6] },
        'Q3': { months: ['Jul', 'Aug', 'Sep'], month_nums: [7, 8, 9] },
        'Q4': { months: ['Oct', 'Nov', 'Dec'], month_nums: [10, 11, 12] },
      }

      const monthTotals: Record<number, number> = {}
      const quarterMap: Record<string, QuarterTotals> = {}

      for (const [q, def] of Object.entries(qDef)) {
        quarterMap[q] = {
          quarter: q,
          months: def.months,
          total_patients: 0,
          total_followups: 0,
          total_feedback: 0,
          total_complaints: 0,
          issues_resolved: 0,
          escalations: 0,
        }
      }

      for (const e of entries) {
        const m = parseMonthFromPeriod(e.reporting_period)
        monthTotals[m] = (monthTotals[m] ?? 0) + 1

        const q = e.quarter ?? 'Q1'
        if (!quarterMap[q]) continue
        quarterMap[q].total_patients++
        if (followupTypes.has(e.engagement_type)) quarterMap[q].total_followups++
        if (e.feedback_category) quarterMap[q].total_feedback++
        if (e.complaint === 'Yes') quarterMap[q].total_complaints++
        if (e.issue_resolved === 'Yes') quarterMap[q].issues_resolved++
        if (e.escalation_required === 'Yes') quarterMap[q].escalations++
      }

      const quarters = Object.values(quarterMap)
      const year_total: MonthlyTotals = {
        month: 'Year Total',
        month_num: 0,
        total_patients:  quarters.reduce((s, q) => s + q.total_patients, 0),
        total_followups: quarters.reduce((s, q) => s + q.total_followups, 0),
        total_feedback:  quarters.reduce((s, q) => s + q.total_feedback, 0),
        total_complaints:quarters.reduce((s, q) => s + q.total_complaints, 0),
        issues_resolved: quarters.reduce((s, q) => s + q.issues_resolved, 0),
        escalations:     quarters.reduce((s, q) => s + q.escalations, 0),
      }

      const busiestMonthNum = Object.entries(monthTotals)
        .sort((a, b) => b[1] - a[1])[0]
      const busiest_month = busiestMonthNum
        ? `${MONTH_NAMES[parseInt(busiestMonthNum[0]) - 1]} (${busiestMonthNum[1]} interactions)`
        : 'N/A'

      const busiestQuarter = quarters.sort((a, b) => b.total_patients - a.total_patients)[0]
      const busiest_quarter = busiestQuarter
        ? `${busiestQuarter.quarter} (${busiestQuarter.total_patients} interactions)`
        : 'N/A'

      const months_with_activity = Object.values(monthTotals).filter(v => v > 0).length

      return {
        quarters: Object.values(quarterMap),
        year_total,
        busiest_month,
        busiest_quarter,
        months_with_activity,
        emerging_trends: entries
          .filter(e => e.emerging_trend)
          .sort((a, b) => (b.opportunity_sort_key ?? 0) - (a.opportunity_sort_key ?? 0))
          .slice(0, 5),
        top_risks: entries
          .filter(e => (e.risk_sort_key ?? 0) > 0)
          .sort((a, b) => (b.risk_sort_key ?? 0) - (a.risk_sort_key ?? 0))
          .slice(0, 5),
        top_recommendations: entries
          .filter(e => e.recommendation)
          .sort((a, b) => (b.recommendation_sort_key ?? 0) - (a.recommendation_sort_key ?? 0))
          .slice(0, 5),
      }
    },
  })
}

// ── Executive Dashboard ────────────────────────────────────────────────────────

export function useTelehealthDashboard(year?: number) {
  return useQuery({
    queryKey: ['tele-dashboard', year],
    queryFn: async (): Promise<DashboardMetrics> => {
      let q = supabase.from('telehealth_entries').select('*')
      if (year) q = q.ilike('reporting_period', `%${year}%`)
      const { data, error } = await q
      if (error) throw error
      const entries: TelehealthEntry[] = data ?? []

      const followupTypes = new Set([
        'Follow-Up Call', 'Recovery Monitoring', 'Appointment Reminder Call', 'SMS Reminder',
      ])

      const monthlyMap: Record<string, { patients: number; followups: number; complaints: number }> = {}
      const engTypeMap: Record<string, number> = {}
      const feedbackMap: Record<string, number> = {}
      const regionMap: Record<string, number> = {}

      for (const e of entries) {
        const period = e.reporting_period
        if (!monthlyMap[period]) monthlyMap[period] = { patients: 0, followups: 0, complaints: 0 }
        monthlyMap[period].patients++
        if (followupTypes.has(e.engagement_type)) monthlyMap[period].followups++
        if (e.complaint === 'Yes') monthlyMap[period].complaints++

        engTypeMap[e.engagement_type] = (engTypeMap[e.engagement_type] ?? 0) + 1
        feedbackMap[e.feedback_category] = (feedbackMap[e.feedback_category] ?? 0) + 1
        if (e.region) regionMap[e.region] = (regionMap[e.region] ?? 0) + 1
      }

      const monthly_trend = Object.entries(monthlyMap)
        .sort((a, b) => parseMonthFromPeriod(a[0]) - parseMonthFromPeriod(b[0]))
        .map(([month, v]) => ({ month, ...v }))

      return {
        total_patients:  entries.length,
        total_followups: entries.filter(e => followupTypes.has(e.engagement_type)).length,
        total_complaints:entries.filter(e => e.complaint === 'Yes').length,
        issues_resolved: entries.filter(e => e.issue_resolved === 'Yes').length,
        open_issues:     entries.filter(e => e.status === 'Open').length,
        closed_issues:   entries.filter(e => e.status === 'Closed').length,
        monthly_trend,
        by_engagement_type: Object.entries(engTypeMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value })),
        by_feedback_category: Object.entries(feedbackMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value })),
        by_region: Object.entries(regionMap)
          .sort((a, b) => b[1] - a[1])
          .map(([region, count]) => ({ region, count })),
        top_observations: entries
          .filter(e => e.key_observation)
          .sort((a, b) => (b.observation_sort_key ?? 0) - (a.observation_sort_key ?? 0))
          .slice(0, 5),
        top_risks: entries
          .filter(e => (e.risk_sort_key ?? 0) > 0)
          .sort((a, b) => (b.risk_sort_key ?? 0) - (a.risk_sort_key ?? 0))
          .slice(0, 5),
        top_recommendations: entries
          .filter(e => e.recommendation)
          .sort((a, b) => (b.recommendation_sort_key ?? 0) - (a.recommendation_sort_key ?? 0))
          .slice(0, 5),
        top_opportunities: entries
          .filter(e => (e.opportunity_sort_key ?? 0) > 0)
          .sort((a, b) => (b.opportunity_sort_key ?? 0) - (a.opportunity_sort_key ?? 0))
          .slice(0, 5),
      }
    },
  })
}

// ── Ref-list CRUD (for Config page) ───────────────────────────────────────────

export function useTeleRefList(table: string) {
  const qc = useQueryClient()
  const items = useQuery({
    queryKey: ['tele-ref', table],
    queryFn: () => fetchRef(table),
  })
  const add = useMutation({
    mutationFn: async (value: string) => {
      const maxOrder = Math.max(0, ...(items.data ?? []).map(i => i.sort_order))
      const { error } = await supabase.from(table).insert({ value, sort_order: maxOrder + 1 })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tele-ref', table] }),
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tele-ref', table] }),
  })
  return { items, add, remove }
}
