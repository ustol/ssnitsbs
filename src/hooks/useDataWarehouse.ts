import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BigPushProject {
  id: string
  title: string
  contractor: string | null
  contract_sum: string | null
  start_date: string | null
  exp_completion_date: string | null
  current_progress: string | null
  agency: string | null
  region: string | null
  source_url: string | null
  created_at: string
}

export type ActivityType = 'registration' | 'validation' | 'payment' | 'inspection'

export interface BigPushActivity {
  id: string
  project_id: string
  activity_type: ActivityType
  value: number
  activity_date: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export type ActivityEntry = { id: string; value: number; date: string; notes: string | null }

export interface ActivitySummary {
  project_id: string
  registration: ActivityEntry | null
  validation: ActivityEntry | null
  payment: ActivityEntry | null
  inspection: ActivityEntry | null
}

// ─── Projects query ────────────────────────────────────────────────────────────

async function fetchProjects(): Promise<BigPushProject[]> {
  const { data, error } = await supabase
    .from('big_push_projects')
    .select('*')
    .order('title', { ascending: true })
  if (error) throw error
  return data as BigPushProject[]
}

export function useDataWarehouse() {
  return useQuery({ queryKey: ['big-push-projects'], queryFn: fetchProjects })
}

// ─── Activities query ──────────────────────────────────────────────────────────

async function fetchActivities(): Promise<BigPushActivity[]> {
  const { data, error } = await supabase
    .from('big_push_activities')
    .select('*')
    .order('activity_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as BigPushActivity[]
}

export function useProjectActivities() {
  return useQuery({ queryKey: ['big-push-activities'], queryFn: fetchActivities })
}

// Build a lookup map: projectId → { registration, validation, payment, inspection } (latest each)
export function buildActivitySummaries(
  activities: BigPushActivity[],
): Record<string, ActivitySummary> {
  const map: Record<string, ActivitySummary> = {}
  for (const a of activities) {
    if (!map[a.project_id]) {
      map[a.project_id] = { project_id: a.project_id, registration: null, validation: null, payment: null, inspection: null }
    }
    const entry = map[a.project_id]
    const key = a.activity_type as ActivityType
    if (!entry[key]) {
      entry[key] = { id: a.id, value: Number(a.value), date: a.activity_date, notes: a.notes }
    }
  }
  return map
}

// ─── Log activity mutation ─────────────────────────────────────────────────────

export interface LogActivityPayload {
  project_id: string
  activity_type: ActivityType
  value: number
  activity_date: string
  notes?: string
}

export function useLogActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LogActivityPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('big_push_activities')
        .insert({ ...payload, created_by: user?.id ?? null })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['big-push-activities'] })
    },
  })
}

// ─── Update activity mutation ──────────────────────────────────────────────────

export interface UpdateActivityPayload {
  id: string
  value: number
  activity_date: string
  notes?: string | null
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, value, activity_date, notes }: UpdateActivityPayload) => {
      const { error } = await supabase
        .from('big_push_activities')
        .update({ value, activity_date, notes: notes ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['big-push-activities'] })
    },
  })
}

// ─── Delete activity mutation ──────────────────────────────────────────────────

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('big_push_activities')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['big-push-activities'] })
    },
  })
}
