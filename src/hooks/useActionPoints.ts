import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ActionPoint {
  id: string
  meeting_id: string
  meeting_type: 'external' | 'internal'
  meeting_title: string
  meeting_date: string | null
  content: string
  status: 'pending' | 'done' | 'failed'
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Load all tracked action points ───────────────────────────────────────────
export function useActionPoints() {
  return useQuery({
    queryKey: ['action-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_points')
        .select('*')
        .order('meeting_date', { ascending: false })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as ActionPoint[]
    },
  })
}

// ─── Sync: pull action points text from meetings into the tracker table ────────
export function useSyncActionPoints() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const [extRes, intRes] = await Promise.all([
        supabase
          .from('external_meetings')
          .select('id, title, meeting_date, action_points')
          .not('action_points', 'is', null)
          .neq('action_points', ''),
        supabase
          .from('internal_meetings')
          .select('id, title, meeting_date, action_points')
          .not('action_points', 'is', null)
          .neq('action_points', ''),
      ])

      const rows: Omit<ActionPoint, 'id' | 'created_at' | 'updated_at' | 'notes'>[] = []

      type MeetingRow = { id: string; title: string; meeting_date: string | null; action_points: string | null }

      function parseMeeting(m: MeetingRow, type: 'external' | 'internal') {
        const lines = (m.action_points ?? '')
          .split('\n')
          .map(l => l.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean)
        for (const line of lines) {
          rows.push({
            meeting_id:    m.id,
            meeting_type:  type,
            meeting_title: m.title,
            meeting_date:  m.meeting_date,
            content:       line,
            status:        'pending',
          })
        }
      }

      for (const m of (extRes.data ?? []) as MeetingRow[]) parseMeeting(m, 'external')
      for (const m of (intRes.data ?? []) as MeetingRow[]) parseMeeting(m, 'internal')

      if (rows.length === 0) return

      // Upsert — on conflict (meeting_id, content) do nothing (keep existing status)
      const { error } = await supabase
        .from('action_points')
        .upsert(rows, { onConflict: 'meeting_id,content', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action-points'] }),
  })
}

// ─── Update status ─────────────────────────────────────────────────────────────
export function useUpdateActionPoint() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status?: 'pending' | 'done' | 'failed'; notes?: string }) => {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (status !== undefined) payload.status = status
      if (notes  !== undefined) payload.notes  = notes

      const { error } = await supabase
        .from('action_points')
        .update(payload)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action-points'] }),
  })
}

// ─── Delete ────────────────────────────────────────────────────────────────────
export function useDeleteActionPoint() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('action_points').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action-points'] }),
  })
}
