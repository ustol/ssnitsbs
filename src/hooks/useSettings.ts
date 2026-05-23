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
      const { data, error } = await supabase.from('status_lookup').select('*').order('name')
      if (error) throw error
      return data
    },
    staleTime: Infinity,
  })
}
