import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getMeetingFileUrl, getFileCategory } from '@/lib/storage'

export interface LibraryItem {
  id: string
  title: string
  file_path: string
  file_size: number | null
  file_type: 'image' | 'audio' | 'document'
  mime_type: string | null
  source: 'library' | 'meeting'
  created_at: string
  uploaded_by_name: string | null
  meeting_id: string | undefined
  meeting_type: 'external' | 'internal' | undefined
  meeting_title: string | undefined
  partnership_id: string | null
  partnership_title: string | null
  thumbUrl: string | null
  getUrl: () => Promise<string>
}

export interface PartnershipGroup {
  partnership_id: string
  partnership_title: string
  items: LibraryItem[]
  meetingIds: Set<string>
}

type MeetingRow = {
  id: string
  title: string
  partnership_id: string | null
  partnership: { id: string; title: string } | null
}

async function fetchLibraryData(): Promise<{ groups: PartnershipGroup[]; unlinked: LibraryItem[] }> {
  const [docsRes, attachRes] = await Promise.all([
    supabase
      .from('documents')
      .select('*, partnership:partnerships(id, title), uploaded_by_profile:profiles(full_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('meeting_attachments')
      .select('*')
      .order('created_at', { ascending: false }),
  ])
  if (docsRes.error) throw docsRes.error
  if (attachRes.error) throw attachRes.error

  const docs = docsRes.data ?? []
  const attachments = attachRes.data ?? []

  const extIds = [
    ...new Set(
      attachments
        .filter(a => a.meeting_type === 'external')
        .map(a => a.meeting_id as string)
        .filter(Boolean),
    ),
  ]
  const intIds = [
    ...new Set(
      attachments
        .filter(a => a.meeting_type === 'internal')
        .map(a => a.meeting_id as string)
        .filter(Boolean),
    ),
  ]

  const [extRes, intRes] = await Promise.all([
    extIds.length > 0
      ? supabase
          .from('external_meetings')
          .select('id, title, partnership_id, partnership:partnerships(id, title)')
          .in('id', extIds)
      : Promise.resolve({ data: [] as MeetingRow[], error: null }),
    intIds.length > 0
      ? supabase
          .from('internal_meetings')
          .select('id, title, partnership_id, partnership:partnerships(id, title)')
          .in('id', intIds)
      : Promise.resolve({ data: [] as MeetingRow[], error: null }),
  ])

  const meetingMap = new Map<string, MeetingRow>()
  for (const m of (extRes.data ?? []) as MeetingRow[]) meetingMap.set(m.id, m)
  for (const m of (intRes.data ?? []) as MeetingRow[]) meetingMap.set(m.id, m)

  const libItems: LibraryItem[] = docs.map(d => {
    const p = d.partnership as { id: string; title: string } | null
    const mimeType = d.file_type as string | null
    const fileType = mimeType ? getFileCategory(mimeType) : 'document'
    const filePath = d.file_path as string
    return {
      id: d.id,
      title: d.title,
      file_path: filePath,
      file_size: d.file_size,
      file_type: fileType,
      mime_type: mimeType,
      source: 'library' as const,
      created_at: d.created_at,
      uploaded_by_name:
        (d.uploaded_by_profile as { full_name: string } | null)?.full_name ?? null,
      meeting_id: undefined,
      meeting_type: undefined,
      meeting_title: undefined,
      partnership_id: p?.id ?? null,
      partnership_title: p?.title ?? null,
      thumbUrl: null,
      getUrl: async () => {
        const { data } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 3600)
        return data?.signedUrl ?? ''
      },
    }
  })

  const meetingItems: LibraryItem[] = attachments.map(a => {
    const meeting = meetingMap.get(a.meeting_id as string)
    const p = meeting?.partnership as { id: string; title: string } | null
    const filePath = a.file_path as string
    const publicUrl = getMeetingFileUrl(filePath)
    return {
      id: a.id,
      title: a.file_name,
      file_path: filePath,
      file_size: a.file_size,
      file_type: a.file_type,
      mime_type: a.mime_type,
      source: 'meeting' as const,
      created_at: a.created_at,
      uploaded_by_name: null,
      meeting_id: a.meeting_id as string | undefined,
      meeting_type: a.meeting_type as 'external' | 'internal' | undefined,
      meeting_title: meeting?.title,
      partnership_id: p?.id ?? meeting?.partnership_id ?? null,
      partnership_title: p?.title ?? null,
      thumbUrl: a.file_type === 'image' ? publicUrl : null,
      getUrl: async () => publicUrl,
    }
  })

  const allItems = [...libItems, ...meetingItems]
  const groupMap = new Map<string, PartnershipGroup>()
  const unlinked: LibraryItem[] = []

  for (const item of allItems) {
    if (!item.partnership_id || !item.partnership_title) {
      unlinked.push(item)
      continue
    }
    const g = groupMap.get(item.partnership_id)
    if (g) {
      g.items.push(item)
      if (item.meeting_id) g.meetingIds.add(item.meeting_id)
    } else {
      groupMap.set(item.partnership_id, {
        partnership_id: item.partnership_id,
        partnership_title: item.partnership_title,
        items: [item],
        meetingIds: new Set(item.meeting_id ? [item.meeting_id] : []),
      })
    }
  }

  const groups = [...groupMap.values()].sort((a, b) =>
    a.partnership_title.localeCompare(b.partnership_title),
  )
  return { groups, unlinked }
}

export function useLibraryData() {
  return useQuery({
    queryKey: ['library-data'],
    queryFn: fetchLibraryData,
  })
}
