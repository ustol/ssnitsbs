import { supabase } from './supabase'

export const MEETING_BUCKET = 'meeting-attachments'

export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

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

export async function getMeetingFileSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(MEETING_BUCKET).createSignedUrl(path, 3600)
  if (error) return getMeetingFileUrl(path)
  return data.signedUrl
}

export async function deleteMeetingFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(MEETING_BUCKET).remove([path])
  if (error) throw error
}
