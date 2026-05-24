import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { uploadMeetingFile, deleteMeetingFile, getMeetingFileUrl, getFileCategory } from '@/lib/storage'
import type { MeetingAttachmentWithUrl } from '@/types/database'

export function useMeetingAttachments(meetingType: 'external' | 'internal', meetingId: string) {
  return useQuery({
    queryKey: ['meeting-attachments', meetingType, meetingId],
    queryFn: async (): Promise<MeetingAttachmentWithUrl[]> => {
      const { data, error } = await supabase
        .from('meeting_attachments')
        .select('*')
        .eq('meeting_type', meetingType)
        .eq('meeting_id', meetingId)
        .order('created_at')
      if (error) throw error
      return (data ?? []).map(a => ({ ...a, url: getMeetingFileUrl(a.file_path) }))
    },
    enabled: !!meetingId,
  })
}

export interface PendingUpload {
  file: File
  previewUrl: string | null
  type: 'image' | 'audio' | 'document'
  isDisplay: boolean
}

export async function uploadPendingFiles(
  pending: PendingUpload[],
  meetingType: 'external' | 'internal',
  meetingId: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  // Ensure only one display picture
  const displayIdx = pending.findIndex(p => p.isDisplay)

  for (let i = 0; i < pending.length; i++) {
    const p = pending[i]
    const path = await uploadMeetingFile(p.file, meetingType, meetingId)
    const { error } = await supabase.from('meeting_attachments').insert({
      meeting_id: meetingId,
      meeting_type: meetingType,
      file_name: p.file.name,
      file_path: path,
      file_size: p.file.size,
      mime_type: p.file.type,
      file_type: getFileCategory(p.file.type),
      is_display_picture: i === displayIdx,
      uploaded_by: user?.id ?? null,
    })
    if (error) throw error
  }
}

export function useDeleteMeetingAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      filePath,
      meetingType,
      meetingId,
    }: {
      id: string
      filePath: string
      meetingType: 'external' | 'internal'
      meetingId: string
    }) => {
      await deleteMeetingFile(filePath)
      const { error } = await supabase.from('meeting_attachments').delete().eq('id', id)
      if (error) throw error
      return { meetingType, meetingId }
    },
    onSuccess: (_, { meetingType, meetingId }) => {
      qc.invalidateQueries({ queryKey: ['meeting-attachments', meetingType, meetingId] })
      toast.success('Attachment removed')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSetDisplayPicture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      meetingType,
      meetingId,
    }: {
      id: string
      meetingType: 'external' | 'internal'
      meetingId: string
    }) => {
      // Clear all display picture flags for this meeting first
      await supabase
        .from('meeting_attachments')
        .update({ is_display_picture: false })
        .eq('meeting_type', meetingType)
        .eq('meeting_id', meetingId)

      const { error } = await supabase
        .from('meeting_attachments')
        .update({ is_display_picture: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { meetingType, meetingId }) => {
      qc.invalidateQueries({ queryKey: ['meeting-attachments', meetingType, meetingId] })
      toast.success('Display picture updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
