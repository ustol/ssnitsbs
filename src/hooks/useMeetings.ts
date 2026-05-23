import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { ExternalMeeting, InternalMeeting } from '@/types/database'

const EXT_KEY = 'external-meetings'
const INT_KEY = 'internal-meetings'

async function fetchExternalMeetings() {
  const { data, error } = await supabase
    .from('external_meetings')
    .select(`*, partnership:partnerships(title), status:status_lookup(name, color)`)
    .order('meeting_date', { ascending: false })
  if (error) throw error
  return data
}

async function fetchExternalMeeting(id: string) {
  const { data, error } = await supabase
    .from('external_meetings')
    .select(`
      *,
      partnership:partnerships(id, title),
      status:status_lookup(name, color)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

async function fetchInternalMeetings() {
  const { data, error } = await supabase
    .from('internal_meetings')
    .select(`*, partnership:partnerships(title), status:status_lookup(name, color)`)
    .order('meeting_date', { ascending: false })
  if (error) throw error
  return data
}

async function fetchInternalMeeting(id: string) {
  const { data, error } = await supabase
    .from('internal_meetings')
    .select(`
      *,
      partnership:partnerships(id, title),
      status:status_lookup(name, color),
      subjects:internal_meeting_subjects(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export function useExternalMeetings() {
  return useQuery({ queryKey: [EXT_KEY], queryFn: fetchExternalMeetings })
}

export function useExternalMeeting(id: string) {
  return useQuery({ queryKey: [EXT_KEY, id], queryFn: () => fetchExternalMeeting(id), enabled: !!id })
}

export function useCreateExternalMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<ExternalMeeting>) => {
      const { data, error } = await supabase.from('external_meetings').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [EXT_KEY] }); toast.success('Meeting created') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateExternalMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<ExternalMeeting> }) => {
      const { data, error } = await supabase.from('external_meetings').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_data: ExternalMeeting, { id }) => {
      qc.invalidateQueries({ queryKey: [EXT_KEY] })
      qc.invalidateQueries({ queryKey: [EXT_KEY, id] })
      toast.success('Meeting updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteExternalMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('external_meetings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [EXT_KEY] }); toast.success('Meeting deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useInternalMeetings() {
  return useQuery({ queryKey: [INT_KEY], queryFn: fetchInternalMeetings })
}

export function useInternalMeeting(id: string) {
  return useQuery({ queryKey: [INT_KEY, id], queryFn: () => fetchInternalMeeting(id), enabled: !!id })
}

export function useCreateInternalMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<InternalMeeting>) => {
      const { data, error } = await supabase.from('internal_meetings').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INT_KEY] }); toast.success('Meeting created') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateInternalMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<InternalMeeting> }) => {
      const { data, error } = await supabase.from('internal_meetings').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_data: InternalMeeting, { id }) => {
      qc.invalidateQueries({ queryKey: [INT_KEY] })
      qc.invalidateQueries({ queryKey: [INT_KEY, id] })
      toast.success('Meeting updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteInternalMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('internal_meetings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [INT_KEY] }); toast.success('Meeting deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
}
