import { useRef, useCallback } from 'react'
import { Image, Music, FileText, X, Star, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBytes, getFileCategory } from '@/lib/storage'
import type { PendingUpload } from '@/hooks/useMeetingAttachments'

interface FileUploadProps {
  files: PendingUpload[]
  onChange: (files: PendingUpload[]) => void
}

const ACCEPT = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',')

function FileIcon({ type }: { type: 'image' | 'audio' | 'document' }) {
  if (type === 'image') return <Image size={18} className="text-blue-500" />
  if (type === 'audio') return <Music size={18} className="text-purple-500" />
  return <FileText size={18} className="text-amber-500" />
}

export function FileUpload({ files, onChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((raw: FileList | null) => {
    if (!raw) return
    const added: PendingUpload[] = Array.from(raw).map(file => {
      const type = getFileCategory(file.type)
      const previewUrl = type === 'image' ? URL.createObjectURL(file) : null
      return { file, previewUrl, type, isDisplay: false }
    })
    onChange([...files, ...added])
  }, [files, onChange])

  const remove = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    // If removed item was display picture, clear the flag
    onChange(next)
  }

  const toggleDisplay = (idx: number) => {
    onChange(files.map((f, i) => ({ ...f, isDisplay: i === idx ? !f.isDisplay : false })))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className="relative border-2 border-dashed border-zinc-200 hover:border-brand/50 rounded-xl p-5 text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-orange-50/30"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <Upload size={20} className="mx-auto mb-2 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-600">Drop files here or click to select</p>
        <p className="text-xs text-zinc-400 mt-0.5">Photos, voice recordings, or documents (PDF, Word, Excel)</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, idx) => (
            <li
              key={idx}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg border text-sm transition-colors',
                f.isDisplay ? 'border-brand/40 bg-orange-50/50' : 'border-zinc-200 bg-white',
              )}
            >
              {/* Preview / Icon */}
              {f.previewUrl ? (
                <img src={f.previewUrl} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 border" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                  <FileIcon type={f.type} />
                </div>
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-800 truncate text-xs">{f.file.name}</p>
                <p className="text-[10px] text-zinc-400">{formatBytes(f.file.size)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {f.type === 'image' && (
                  <button
                    type="button"
                    onClick={() => toggleDisplay(idx)}
                    title={f.isDisplay ? 'Remove as display picture' : 'Set as display picture'}
                    className={cn(
                      'p-1.5 rounded-md transition-colors text-xs flex items-center gap-1',
                      f.isDisplay
                        ? 'text-brand bg-orange-100'
                        : 'text-zinc-400 hover:text-amber-500 hover:bg-amber-50',
                    )}
                  >
                    <Star size={13} className={f.isDisplay ? 'fill-brand' : ''} />
                    <span className="hidden sm:inline text-[10px]">{f.isDisplay ? 'Cover' : 'Set cover'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && files.some(f => f.type === 'image') && !files.some(f => f.isDisplay) && (
        <p className="text-xs text-zinc-400 flex items-center gap-1">
          <Star size={11} className="text-amber-400" />
          Tap the star on a photo to use it as the meeting cover image
        </p>
      )}
    </div>
  )
}
