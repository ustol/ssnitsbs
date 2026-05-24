import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types/database'

// ── Write (fire-and-forget) ───────────────────────────────────────────────────

export interface AuditPayload {
  action: 'created' | 'updated' | 'deleted' | 'uploaded_file' | 'set_display_picture'
  entity_type: 'external_meeting' | 'internal_meeting' | 'partnership' | 'ddg_feedback' | 'document'
  entity_id: string | null
  entity_name: string | null
  changes?: Record<string, { from: unknown; to: unknown }> | null
}

export async function writeAudit(payload: AuditPayload): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  // Fetch display name from profiles (best-effort)
  let userName: string | null = null
  if (userId) {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
    userName = data?.full_name ?? user?.email ?? null
  }

  // Fire and forget — do not block the calling mutation
  supabase.from('audit_log').insert({
    user_id: userId,
    user_name: userName,
    action: payload.action,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    entity_name: payload.entity_name,
    changes: payload.changes ?? null,
  }).then(() => { /* ignore result */ })
}

// ── Read ─────────────────────────────────────────────────────────────────────

export interface AuditFilters {
  entityType?: string
  entityId?: string
  userId?: string
  limit?: number
  offset?: number
}

export function useAuditLog(filters: AuditFilters = {}) {
  const { entityType, entityId, userId, limit = 100, offset = 0 } = filters
  return useQuery({
    queryKey: ['audit-log', entityType, entityId, userId, limit, offset],
    queryFn: async (): Promise<AuditLog[]> => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (entityType) query = query.eq('entity_type', entityType)
      if (entityId)   query = query.eq('entity_id', entityId)
      if (userId)     query = query.eq('user_id', userId)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// Single-entity audit trail (used in meeting/partnership view pages)
export function useEntityAuditLog(entityType: string, entityId: string) {
  return useAuditLog({ entityType, entityId, limit: 30 })
}
