import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { ExternalStakeholder, InternalStakeholder } from '@/types/database'

const EXT_KEY = 'external-stakeholders'
const INT_KEY = 'internal-stakeholders'

export function useExternalStakeholders() {
  return useQuery({
    queryKey: [EXT_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_stakeholders')
        .select('*')
        .order('name')
      if (error) throw error
      return data as ExternalStakeholder[]
    },
  })
}

export function useCreateExternalStakeholder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ExternalStakeholder>) => {
      const { data, error } = await supabase.from('external_stakeholders').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [EXT_KEY] }); toast.success('Stakeholder added') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateExternalStakeholder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<ExternalStakeholder> }) => {
      const { data, error } = await supabase.from('external_stakeholders').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [EXT_KEY] }); toast.success('Stakeholder updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteExternalStakeholder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('external_stakeholders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [EXT_KEY] }); toast.success('Stakeholder deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useInternalStakeholders() {
  return useQuery({
    queryKey: [INT_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_stakeholders')
        .select('*, partnerships:partnership_internal_stakeholders(partnership_id)')
        .order('name')
      if (error) throw error
      return data as (InternalStakeholder & { partnerships: { partnership_id: string }[] })[]
    },
  })
}

export function useCreateInternalStakeholder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<InternalStakeholder>) => {
      const { data, error } = await supabase.from('internal_stakeholders').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INT_KEY] }); toast.success('Stakeholder added') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateInternalStakeholder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<InternalStakeholder> }) => {
      const { data, error } = await supabase.from('internal_stakeholders').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INT_KEY] }); toast.success('Stakeholder updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteInternalStakeholder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('internal_stakeholders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INT_KEY] }); toast.success('Stakeholder deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
}
