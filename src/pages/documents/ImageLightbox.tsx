import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBytes } from '@/lib/storage'
import { type LibraryItem } from '@/hooks/useLibraryData'

interface ImageLightboxProps {
  item: LibraryItem | null
  onClose: () => void
}

export function ImageLightbox({ item, onClose }: ImageLightboxProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (item) {
      setUrl(null)
      item.getUrl().then(setUrl)
    }
  }, [item])

  return (
    <Dialog open={!!item} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 gap-0 bg-zinc-950 border-zinc-800 [&>button]:text-white/60 [&>button]:hover:text-white [&>button]:hover:bg-white/10">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-white/80 truncate mr-6">{item?.title}</span>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-white/60 hover:text-white hover:bg-white/10 h-8"
            onClick={() => url && window.open(url, '_blank')}
            disabled={!url}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </div>

        <div className="flex items-center justify-center min-h-[300px] max-h-[80vh] p-4">
          {!url ? (
            <Skeleton className="w-full aspect-video rounded-lg bg-zinc-800" />
          ) : (
            <img
              src={url}
              alt={item?.title}
              className="max-w-full max-h-[76vh] rounded-lg object-contain"
            />
          )}
        </div>

        {item && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-t border-zinc-800 text-xs text-white/35">
            {item.source === 'library' ? (
              <span>Document Library</span>
            ) : (
              <span>
                {item.meeting_type === 'external' ? 'External' : 'Internal'} Meeting
                {item.meeting_title ? ` · ${item.meeting_title}` : ''}
              </span>
            )}
            {item.partnership_title && (
              <>
                <span>·</span>
                <span>{item.partnership_title}</span>
              </>
            )}
            {item.file_size && (
              <>
                <span>·</span>
                <span>{formatBytes(item.file_size)}</span>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
