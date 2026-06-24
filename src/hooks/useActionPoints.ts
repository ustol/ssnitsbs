import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { writeAudit } from '@/hooks/useAuditLog'

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

// ─── Lightweight stats for dashboard / reports ────────────────────────────────
export function useActionPointStats() {
  return useQuery({
    queryKey: ['action-point-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_points')
        .select('status')
      if (error) throw error
      const items = data ?? []
      const pending = items.filter(i => i.status === 'pending').length
      const done    = items.filter(i => i.status === 'done').length
      const failed  = items.filter(i => i.status === 'failed').length
      return { total: items.length, pending, done, failed }
    },
  })
}

// ─── Sync: pull action points text from meetings into the tracker table ────────
export function useSyncActionPoints() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const [extRes, intRes, trackedRes] = await Promise.all([
        supabase.from('external_meetings').select('id, title, meeting_date, action_points'),
        supabase.from('internal_meetings').select('id, title, meeting_date, action_points'),
        supabase.from('action_points').select('id, meeting_id, content, status, notes'),
      ])

      const rows: Omit<ActionPoint, 'id' | 'created_at' | 'updated_at' | 'notes'>[] = []
      const currentContentByMeeting = new Map<string, Set<string>>()

      type MeetingRow = { id: string; title: string; meeting_date: string | null; action_points: string | null }

      function parseMeeting(m: MeetingRow, type: 'external' | 'internal') {
        const lines = (m.action_points ?? '')
          .split('\n')
          .map(l => l.replace(/^[-•*]\s*/, '').trim())
          .filter(Boolean)
        currentContentByMeeting.set(m.id, new Set(lines))
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

      // Clean up rows orphaned by a wording edit or cleared text — only ones that were
      // never actioned and have no notes, so completed/annotated history is never lost.
      const orphanIds = (trackedRes.data ?? [])
        .filter(t => {
          const current = currentContentByMeeting.get(t.meeting_id)
          return !current?.has(t.content) && t.status === 'pending' && !t.notes
        })
        .map(t => t.id)

      if (orphanIds.length > 0) {
        await supabase.from('action_points').delete().in('id', orphanIds)
      }

      if (rows.length === 0) return

      const { error } = await supabase
        .from('action_points')
        .upsert(rows, { onConflict: 'meeting_id,content', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-points'] })
      qc.invalidateQueries({ queryKey: ['action-point-stats'] })
    },
  })
}

// ─── Update status / notes ────────────────────────────────────────────────────
export function useUpdateActionPoint() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id, status, notes, content,
    }: {
      id: string
      status?: 'pending' | 'done' | 'failed'
      notes?: string
      content?: string  // passed for audit label only
    }) => {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (status !== undefined) payload.status = status
      if (notes  !== undefined) payload.notes  = notes

      const { error } = await supabase
        .from('action_points')
        .update(payload)
        .eq('id', id)
      if (error) throw error

      // Audit log
      if (status !== undefined) {
        const actionMap = {
          done:    'marked_done',
          pending: 'marked_pending',
          failed:  'marked_failed',
        } as const
        writeAudit({
          action:      actionMap[status],
          entity_type: 'action_point',
          entity_id:   id,
          entity_name: content ?? null,
        })
      } else if (notes !== undefined) {
        writeAudit({
          action:      'updated_notes',
          entity_type: 'action_point',
          entity_id:   id,
          entity_name: content ?? null,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-points'] })
      qc.invalidateQueries({ queryKey: ['action-point-stats'] })
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['action-points'] })
      qc.invalidateQueries({ queryKey: ['action-point-stats'] })
    },
  })
}
