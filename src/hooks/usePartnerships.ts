import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Partnership, PartnershipWithRelations } from '@/types/database'

const QUERY_KEY = 'partnerships'

async function fetchPartnerships(): Promise<PartnershipWithRelations[]> {
  const { data, error } = await supabase
    .from('partnerships')
    .select(`
      *,
      status:status_lookup(name, color),
      external_stakeholders:partnership_external_stakeholders(
        stakeholder:external_stakeholders(id, name, organization)
      ),
      external_meetings(id),
      internal_meetings(id)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as PartnershipWithRelations[]
}

async function fetchPartnership(id: string): Promise<PartnershipWithRelations> {
  const { data, error } = await supabase
    .from('partnerships')
    .select(`
      *,
      status:status_lookup(name, color),
      external_stakeholders:partnership_external_stakeholders(
        stakeholder:external_stakeholders(*)
      ),
      external_meetings(*),
      internal_meetings(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as PartnershipWithRelations
}

export function usePartnerships() {
  return useQuery({ queryKey: [QUERY_KEY], queryFn: fetchPartnerships })
}

export function usePartnership(id: string) {
  return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => fetchPartnership(id), enabled: !!id })
}

export function useCreatePartnership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<Partnership>) => {
      const { data, error } = await supabase.from('partnerships').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Partnership created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdatePartnership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Partnership> }) => {
      const { data, error } = await supabase.from('partnerships').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data: Partnership) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, data.id] })
      toast.success('Partnership updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeletePartnership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partnerships').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      toast.success('Partnership deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
