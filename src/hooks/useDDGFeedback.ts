import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { DDGFeedback } from '@/types/database'

const QUERY_KEY = 'ddg-feedback'

async function fetchFeedbackList() {
  const { data, error } = await supabase
    .from('ddg_feedback')
    .select(`*, partnership:partnerships(title), stakeholder:external_stakeholders(name, organization)`)
    .order('received_date', { ascending: false })
  if (error) throw error
  return data
}

async function fetchFeedback(id: string) {
  const { data, error } = await supabase
    .from('ddg_feedback')
    .select(`*, partnership:partnerships(*), stakeholder:external_stakeholders(*)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Feedback recorded') },
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
      toast.success('Feedback updated')
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Feedback deleted') },
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
