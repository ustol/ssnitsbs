import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ColocationLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  ssnit_branch: string | null
  bank: string | null
  commencement_date: string | null
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
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('colocation_locations')
        .insert({ ...payload, created_by: user?.id ?? null })
      if (error) throw error
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
    }) => {
      const { id, ...fields } = payload
      const { error } = await supabase
        .from('colocation_locations')
        .update(fields)
        .eq('id', id)
      if (error) throw error
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colocation-locations'] })
    },
  })
}
