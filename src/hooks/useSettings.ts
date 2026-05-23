import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { SystemSetting } from '@/types/database'

const QUERY_KEY = 'settings'

export function useSettings() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*')
      if (error) throw error
      const map: Record<string, string> = {}
      for (const row of data as SystemSetting[]) map[row.key] = row.value
      return map
    },
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value }, { onConflict: 'key' })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Settings saved') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useStatusLookup() {
  return useQuery({
    queryKey: ['status-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('status_lookup').select('*').order('sort_order').order('name')
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}

export function useCreateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: { name: string; color: string; sort_order: number }) => {
      const { data, error } = await supabase.from('status_lookup').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['status-lookup'] }); toast.success('Status added') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: { name?: string; color?: string } }) => {
      const { data, error } = await supabase.from('status_lookup').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['status-lookup'] }); toast.success('Status updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('status_lookup').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['status-lookup'] }); toast.success('Status deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
}
