import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export interface VitalInformation {
  id: string
  date: string
  subject: string
  details: string | null
  partnership_id: string
  external_meeting_id: string | null
  internal_meeting_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VitalInformationWithRelations extends VitalInformation {
  partnership: { id: string; title: string } | null
  external_meeting: { id: string; title: string } | null
  internal_meeting: { id: string; title: string } | null
}

export type VitalInformationPayload = Omit<VitalInformation, 'id' | 'created_by' | 'created_at' | 'updated_at'>

const QK = 'vital-information'

export function useVitalInformationList() {
  return useQuery({
    queryKey: [QK],
    queryFn: async (): Promise<VitalInformationWithRelations[]> => {
      const { data, error } = await supabase
        .from('vital_information')
        .select(`
          *,
          partnership:partnerships(id, title),
          external_meeting:external_meetings(id, title),
          internal_meeting:internal_meetings(id, title)
        `)
        .order('date', { ascending: false })
      if (error) throw error
      return data as unknown as VitalInformationWithRelations[]
    },
  })
}

// ─── Vital info relevant to a single meeting: that meeting's own entries
// plus partnership-generic entries (no meeting attached) for the same partnership ──
export function useVitalInformationByMeeting(
  partnershipId: string | null,
  meetingId: string | undefined,
  meetingType: 'external' | 'internal',
) {
  return useQuery({
    queryKey: [QK, 'by-meeting', partnershipId, meetingId, meetingType],
    enabled: !!partnershipId,
    queryFn: async (): Promise<Pick<VitalInformation, 'date' | 'subject' | 'details'>[]> => {
      const meetingCol = meetingType === 'external' ? 'external_meeting_id' : 'internal_meeting_id'
      let query = supabase
        .from('vital_information')
        .select('date, subject, details')
        .eq('partnership_id', partnershipId as string)
        .order('date', { ascending: false })

      query = meetingId
        ? query.or(`${meetingCol}.eq.${meetingId},and(external_meeting_id.is.null,internal_meeting_id.is.null)`)
        : query.is('external_meeting_id', null).is('internal_meeting_id', null)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateVitalInformation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VitalInformationPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('vital_information')
        .insert({ ...payload, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Vital information added') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateVitalInformation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<VitalInformationPayload> }) => {
      const { data, error } = await supabase
        .from('vital_information')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Vital information updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteVitalInformation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vital_information').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QK] }); toast.success('Vital information deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
}
