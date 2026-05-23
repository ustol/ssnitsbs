import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

const QUERY_KEY = 'users'

export function useUsers() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Profile> }) => {
      const { data, error } = await supabase.from('profiles').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); toast.success('Profile updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}
