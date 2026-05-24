import { supabase } from './supabase'

export const MEETING_BUCKET = 'meeting-attachments'

export function getFileCategory(mimeType: string): 'image' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) return 'audio'
  return 'document'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function uploadMeetingFile(
  file: File,
  meetingType: 'external' | 'internal',
  meetingId: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = `${meetingType}/${meetingId}/${unique}.${ext}`
  const { error } = await supabase.storage.from(MEETING_BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  return path
}

export function getMeetingFileUrl(path: string): string {
  const { data } = supabase.storage.from(MEETING_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteMeetingFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(MEETING_BUCKET).remove([path])
  if (error) throw error
}
