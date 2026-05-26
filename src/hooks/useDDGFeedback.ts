import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { DDGFeedback } from '@/types/database'

const QUERY_KEY = 'ddg-feedback'

async function resolveMeetingTitles<T extends { meeting_id: string | null; meeting_type: string | null }>(
  items: T[]
): Promise<(T & { meeting_title: string | null })[]> {
  const extIds = items.filter(f => f.meeting_id && f.meeting_type === 'external').map(f => f.meeting_id!)
  const intIds = items.filter(f => f.meeting_id && f.meeting_type === 'internal').map(f => f.meeting_id!)

  const [extRes, intRes] = await Promise.all([
    extIds.length > 0
      ? supabase.from('external_meetings').select('id, title').in('id', extIds)
      : Promise.resolve({ data: [] }),
    intIds.length > 0
      ? supabase.from('internal_meetings').select('id, title').in('id', intIds)
      : Promise.resolve({ data: [] }),
  ])

  const extMap: Record<string, string> = {}
  const intMap: Record<string, string> = {}
  for (const m of extRes.data ?? []) extMap[m.id] = m.title
  for (const m of intRes.data ?? []) intMap[m.id] = m.title

  return items.map(f => ({
    ...f,
    meeting_title: f.meeting_id
      ? (f.meeting_type === 'external' ? extMap[f.meeting_id] : intMap[f.meeting_id]) ?? null
      : null,
  }))
}

async function fetchFeedbackList() {
  const { data, error } = await supabase
    .from('ddg_feedback')
    .select('*, partnership:partnerships(title), stakeholder:external_stakeholders(name, organization)')
    .order('received_date', { ascending: false })
  if (error) throw error
  return resolveMeetingTitles(data ?? [])
}

async function fetchFeedback(id: string) {
  const { data, error } = await supabase
    .from('ddg_feedback')
    .select('*, partnership:partnerships(*), stakeholder:external_stakeholders(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  const [resolved] = await resolveMeetingTitles([data])
  return resolved
}

export function useDDGFeedbackList() {
  return useQuery({ queryKey: [QUERY_KEY], queryFn: fetchFeedbackList })
}

export function useDDGFeedback(id: string) {
  return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => fetchFeedback(id), enabled: !!id })
}

export function usePendingDDGCount() {
  return useQuery({
    queryKey: [QUERY_KEY, 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ddg_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('is_actioned', false)
      if (error) throw error
      return count ?? 0
    },
    refetchInterval: 60_000,
  })
}

export function useCreateDDGFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<DDGFeedback>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('ddg_feedback').insert({ ...values, created_by: user?.id ?? null }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Comment recorded') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateDDGFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<DDGFeedback> }) => {
      const { data, error } = await supabase.from('ddg_feedback').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_d: DDGFeedback, { id }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, id] })
      toast.success('Comment updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteDDGFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ddg_feedback').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Comment deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useMarkDDGActioned() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, actioned }: { id: string; actioned: boolean }) => {
      const { error } = await supabase.from('ddg_feedback').update({ is_actioned: actioned }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Status updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}
