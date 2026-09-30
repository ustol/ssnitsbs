import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { writeAudit } from '@/hooks/useAuditLog'

export interface ColocationLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  ssnit_branch: string | null
  bank: string | null
  commencement_date: string | null
  category: 'Planned' | 'Operational' | 'SSNIT Branch' | null
  created_at: string
}

export function useColocationLocations() {
  return useQuery({
    queryKey: ['colocation-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colocation_locations')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ColocationLocation[]
    },
  })
}

export function useAddLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      name: string; latitude: number; longitude: number
      ssnit_branch?: string | null; bank?: string | null; commencement_date?: string | null
      category?: 'Planned' | 'Operational' | 'SSNIT Branch' | null
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('colocation_locations')
        .insert({ ...payload, created_by: user?.id ?? null })
      if (error) throw error
      writeAudit({ action: 'created', entity_type: 'colocation_location', entity_id: null, entity_name: payload.name, changes: null })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colocation-locations'] })
    },
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id: string; name: string; latitude: number; longitude: number
      ssnit_branch?: string | null; bank?: string | null; commencement_date?: string | null
      category?: 'Planned' | 'Operational' | 'SSNIT Branch' | null
    }) => {
      const { id, ...fields } = payload
      const { error } = await supabase
        .from('colocation_locations')
        .update(fields)
        .eq('id', id)
      if (error) throw error
      writeAudit({ action: 'updated', entity_type: 'colocation_location', entity_id: payload.id, entity_name: payload.name, changes: null })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colocation-locations'] })
    },
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colocation_locations')
        .delete()
        .eq('id', id)
      if (error) throw error
      writeAudit({ action: 'deleted', entity_type: 'colocation_location', entity_id: id, entity_name: null, changes: null })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colocation-locations'] })
    },
  })
}
