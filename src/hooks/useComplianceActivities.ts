import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export interface ComplianceActivity {
  id: string
  establishment_name: string
  er_no: string | null
  date_registered: string | null
  coverable_date: string | null
  labour_force: number | null
  actual_contributions: number | null
  penalty: number | null
  total: number | null
  enforcement_branch: string | null
  remarks: string | null
  created_at: string
  updated_at: string
}

export type ComplianceActivityPayload = Omit<ComplianceActivity, 'id' | 'total' | 'created_at' | 'updated_at'>

const QK = 'compliance-activities'

export function useComplianceActivities() {
  return useQuery({
    queryKey: [QK],
    queryFn: async (): Promise<ComplianceActivity[]> => {
      const { data, error } = await supabase
        .from('compliance_activities')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateComplianceActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ComplianceActivityPayload) => {
      const { data, error } = await supabase
        .from('compliance_activities')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Compliance activity added') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateComplianceActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ComplianceActivityPayload> }) => {
      const { data, error } = await supabase
        .from('compliance_activities')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Compliance activity updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteComplianceActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compliance_activities').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Compliance activity deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
}
