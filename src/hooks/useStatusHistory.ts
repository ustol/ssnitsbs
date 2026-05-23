import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StatusHistory } from '@/types/database'

export function useStatusHistory(
  entityType: 'partnership' | 'external_meeting' | 'internal_meeting',
  entityId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['status-history', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_history')
        .select(`
          *,
          from_status:from_status_id(id, name, color),
          to_status:to_status_id(id, name, color)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: enabled && !!entityId,
  })
}

export function useCreateStatusHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<StatusHistory, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('status_history')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['status-history', variables.entity_type, variables.entity_id],
      })
    },
  })
}
