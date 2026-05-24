import { Image, Music, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import type { PendingUpload } from '@/hooks/useMeetingAttachments'

interface PreviewField {
  label: string
  value: string | null | undefined
}

interface MeetingPreviewDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isSaving: boolean
  title: string
  meetingType: 'External Meeting' | 'Internal Meeting'
  fields: PreviewField[]
  pendingFiles: PendingUpload[]
  isEdit?: boolean
}

function FileIcon({ type }: { type: 'image' | 'audio' | 'document' }) {
  if (type === 'image') return <Image size={14} className="text-blue-500 shrink-0" />
  if (type === 'audio') return <Music size={14} className="text-purple-500 shrink-0" />
  return <FileText size={14} className="text-amber-500 shrink-0" />
}

export function MeetingPreviewDialog({
  open, onClose, onConfirm, isSaving,
  title, meetingType, fields, pendingFiles, isEdit = false,
}: MeetingPreviewDialogProps) {
  if (!open) return null

  const displayPic = pendingFiles.find(f => f.isDisplay && f.previewUrl)

  return (
    <div className="fixed inset-0 z-[1060] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden my-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
        >
          <X size={14} />
        </button>

        {/* Hero image with gradient */}
        {displayPic ? (
          <div className="relative h-44 sm:h-56 w-full overflow-hidden">
            <img
              src={displayPic.previewUrl!}
              alt="Meeting cover"
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            {/* Title over gradient */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-0.5">{meetingType}</p>
              <h2 className="text-lg font-bold text-white leading-tight">{title || '—'}</h2>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-5 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-0.5">{meetingType}</p>
            <h2 className="text-lg font-bold text-zinc-900 leading-tight">{title || '—'}</h2>
          </div>
        )}

        {/* Fields */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Review before saving</p>

          <dl className="divide-y divide-zinc-100">
            {fields.map(f => f.value ? (
              <div key={f.label} className="py-2.5">
                <dt className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">{f.label}</dt>
                <dd className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{f.value}</dd>
              </div>
            ) : null)}
          </dl>

          {/* Pending file attachments */}
          {pendingFiles.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Attachments ({pendingFiles.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-zinc-50 text-xs text-zinc-700 max-w-[180px]"
                  >
                    {f.previewUrl ? (
                      <img src={f.previewUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                    ) : (
                      <FileIcon type={f.type} />
                    )}
                    <span className="truncate">{f.file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-400 pt-1">
            Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t bg-zinc-50">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            ← Go Back to Edit
          </Button>
          <Button onClick={onConfirm} disabled={isSaving} className="gap-2">
            {isSaving ? 'Saving…' : isEdit ? 'Confirm & Update' : 'Confirm & Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}
