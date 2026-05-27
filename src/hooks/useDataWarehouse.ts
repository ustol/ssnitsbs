import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface BigPushProject {
  id: string
  title: string
  contractor: string | null
  contract_sum: string | null
  start_date: string | null
  exp_completion_date: string | null
  current_progress: string | null
  agency: string | null
  region: string | null
  source_url: string | null
  created_at: string
}

async function fetchProjects(): Promise<BigPushProject[]> {
  const { data, error } = await supabase
    .from('big_push_projects')
    .select('*')
    .order('title', { ascending: true })
  if (error) throw error
  return data as BigPushProject[]
}

export function useDataWarehouse() {
  return useQuery({ queryKey: ['big-push-projects'], queryFn: fetchProjects })
}
