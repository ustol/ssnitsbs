import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Download, Trash2, FileText, File, Music } from 'lucide-react'
import { type LibraryItem, type PartnershipGroup } from '@/hooks/useLibraryData'
import { formatBytes } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export type FileFilter = 'all' | 'image' | 'document' | 'audio'

interface PartnershipFolderProps {
  group: PartnershipGroup
  typeFilter: FileFilter
  searchQuery: string
  dimmed?: boolean
  onDeleteLibraryItem: (item: LibraryItem) => void
  onImageClick: (item: LibraryItem) => void
}

function SourceBadge({ item }: { item: LibraryItem }) {
  if (item.source === 'library') {
    return (
      <span className="shrink-0 text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
        Library
      </span>
    )
  }
  const isExt = item.meeting_type === 'external'
  return (
    <span
      className={cn(
        'shrink-0 text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full truncate max-w-[160px]',
        isExt ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600',
      )}
      title={item.meeting_title}
    >
      {isExt ? 'Ext' : 'Int'}
      {item.meeting_title ? ` · ${item.meeting_title}` : ''}
    </span>
  )
}

function DocIcon({ item }: { item: LibraryItem }) {
  if (item.file_type === 'audio') return <Music className="h-4 w-4 text-blue-400 shrink-0" />
  if (item.mime_type?.includes('pdf')) return <FileText className="h-4 w-4 text-red-500 shrink-0" />
  return <File className="h-4 w-4 text-zinc-400 shrink-0" />
}

function ImageThumb({ item, onClick }: { item: LibraryItem; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(item.thumbUrl)

  useEffect(() => {
    if (!url) {
      item.getUrl().then(setUrl)
    }
  }, [item]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 group cursor-pointer"
      onClick={onClick}
    >
      {url ? (
        <img src={url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <Skeleton className="w-full h-full rounded-none" />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col items-start justify-end p-2 opacity-0 group-hover:opacity-100">
        <span className="text-white text-[0.68rem] font-medium leading-tight line-clamp-2">
          {item.title}
        </span>
      </div>
      <button
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => {
          e.stopPropagation()
          item.getUrl().then(u => window.open(u, '_blank'))
        }}
        title="Download"
      >
        <Download className="h-3 w-3 text-white" />
      </button>
    </div>
  )
}

export function PartnershipFolder({
  group,
  typeFilter,
  searchQuery,
  dimmed = false,
  onDeleteLibraryItem,
  onImageClick,
}: PartnershipFolderProps) {
  const [open, setOpen] = useState(true)

  const filtered = group.items.filter(item => {
    if (typeFilter !== 'all' && item.file_type !== typeFilter) return false
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  if (filtered.length === 0) return null

  const images = filtered.filter(i => i.file_type === 'image')
  const rest = filtered.filter(i => i.file_type !== 'image')

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span
          className={cn(
            'font-semibold text-sm flex-1 truncate',
            dimmed && 'text-muted-foreground',
          )}
        >
          {group.partnership_title}
        </span>
        <div className="flex items-center gap-2 shrink-0 mr-1">
          <span className="text-xs text-muted-foreground">
            {filtered.length} file{filtered.length !== 1 ? 's' : ''}
          </span>
          {group.meetingIds.size > 0 && (
            <span className="text-[0.65rem] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {group.meetingIds.size} meeting{group.meetingIds.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t px-4 pb-4">
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 pt-4">
              {images.map(item => (
                <ImageThumb key={item.id} item={item} onClick={() => onImageClick(item)} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className={cn('divide-y', images.length > 0 ? 'mt-3' : 'mt-0')}>
              {rest.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-2.5">
                  <DocIcon item={item} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate max-w-[22rem]">
                        {item.title}
                      </span>
                      <SourceBadge item={item} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      {item.file_size ? <span>{formatBytes(item.file_size)}</span> : null}
                      {item.file_size ? <span>·</span> : null}
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => item.getUrl().then(u => window.open(u, '_blank'))}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {item.source === 'library' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDeleteLibraryItem(item)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
