import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Paperclip, Image, Music, FileText, Star, Download, ClipboardList, Plus, Minus } from 'lucide-react'
import { useExternalMeeting, useDeleteExternalMeeting } from '@/hooks/useMeetings'
import { useMeetingAttachments, useDeleteMeetingAttachment, useSetDisplayPicture } from '@/hooks/useMeetingAttachments'
import { useEntityAuditLog } from '@/hooks/useAuditLog'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { MeetingAttachmentWithUrl, AuditLog } from '@/types/database'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <dt className="text-xs font-medium text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-[0.8125rem] whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  )
}

function AttachmentIcon({ type }: { type: 'image' | 'audio' | 'document' }) {
  if (type === 'image') return <Image size={15} className="text-blue-500 shrink-0" />
  if (type === 'audio') return <Music size={15} className="text-purple-500 shrink-0" />
  return <FileText size={15} className="text-amber-500 shrink-0" />
}

function AuditActionIcon({ action }: { action: string }) {
  if (action === 'created') return <Plus size={11} className="text-green-600" />
  if (action === 'deleted') return <Minus size={11} className="text-red-500" />
  return <Pencil size={11} className="text-blue-500" />
}

function AuditEntry({ entry }: { entry: AuditLog }) {
  const actionLabel: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    uploaded_file: 'Uploaded file',
    set_display_picture: 'Set display picture',
  }
  const bgMap: Record<string, string> = {
    created: 'bg-green-100 border-green-200',
    updated: 'bg-blue-50 border-blue-200',
    deleted: 'bg-red-50 border-red-200',
    uploaded_file: 'bg-amber-50 border-amber-200',
    set_display_picture: 'bg-purple-50 border-purple-200',
  }
  const bg = bgMap[entry.action] ?? 'bg-zinc-100 border-zinc-200'

  return (
    <div className="flex items-start gap-3">
      <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5', bg)}>
        <AuditActionIcon action={entry.action} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.8125rem] text-zinc-800 leading-snug">
          <span className="font-medium">{entry.user_name ?? 'System'}</span>
          {' '}{(actionLabel[entry.action] ?? entry.action).toLowerCase()} this meeting
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(entry.created_at).toLocaleString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

export function ExternalMeetingView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: meeting, isLoading } = useExternalMeeting(id!)
  const deleteMutation = useDeleteExternalMeeting()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: attachments = [] } = useMeetingAttachments('external', id!)
  const deleteAttachment = useDeleteMeetingAttachment()
  const setDisplayPicture = useSetDisplayPicture()
  const { data: auditEntries = [] } = useEntityAuditLog('external_meeting', id!)

  if (isLoading) {
    return <div className="p-4 sm:p-6 space-y-4"><Skeleton className="h-7 w-64" /><Skeleton className="h-64 w-full rounded-xl" /></div>
  }
  if (!meeting) {
    return <div className="p-4 sm:p-6"><EmptyState title="Meeting not found" action={<Button asChild><Link to="/meetings/external">Back</Link></Button>} /></div>
  }

  const m = meeting as Record<string, unknown>
  const status = m.status as { name: string; color: string } | null
  const partnership = m.partnership as { id: string; title: string } | null
  const displayPic = (attachments as MeetingAttachmentWithUrl[]).find(a => a.is_display_picture)

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">
      {/* Display picture hero */}
      {displayPic && (
        <div className="relative h-44 sm:h-60 w-full overflow-hidden rounded-xl shadow-sm">
          <img src={displayPic.url} alt="Meeting cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70 mb-0.5">External Meeting</p>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">{m.title as string}</h2>
          </div>
        </div>
      )}

      <PageHeader
        title={displayPic ? '' : (m.title as string)}
        subtitle={partnership ? `${partnership.title} · ${formatDate(m.meeting_date as string)}` : formatDate(m.meeting_date as string)}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back</Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/meetings/external/${id}/edit`}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="py-3 px-5"><CardTitle className="text-sm font-semibold">Meeting Details</CardTitle></CardHeader>
        <CardContent className="px-5 pb-2">
          <dl>
            <Field label="Status" value={status ? <StatusBadge status={status.name} color={status.color} /> : null} />
            <Field label="Partnership" value={partnership ? <Link to={`/partnerships/${partnership.id}`} className="text-brand hover:underline">{partnership.title}</Link> : null} />
            <Field label="Date" value={m.meeting_date ? formatDate(m.meeting_date as string) : null} />
            <Field label="Location" value={m.location as string} />
            <Field label="External Attendees" value={m.attendees_external as string} />
          </dl>
        </CardContent>
      </Card>

      {Boolean(m.agenda || m.minutes || m.action_points) && (
        <Card>
          <CardHeader className="py-3 px-5"><CardTitle className="text-sm font-semibold">Content</CardTitle></CardHeader>
          <CardContent className="px-5 pb-2">
            <dl>
              <Field label="Agenda" value={m.agenda as string} />
              <Field label="Minutes" value={m.minutes as string} />
              <Field label="Action Points" value={m.action_points as string} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Paperclip size={14} className="text-muted-foreground" />
            Attachments
            {attachments.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">{attachments.length} file{attachments.length !== 1 ? 's' : ''}</span>
            )}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No attachments</p>
          ) : (
            <ul className="space-y-2">
              {(attachments as MeetingAttachmentWithUrl[]).map(a => (
                <li key={a.id} className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg border text-sm transition-colors',
                  a.is_display_picture ? 'border-brand/40 bg-orange-50/50' : 'border-zinc-200 bg-white',
                )}>
                  {a.file_type === 'image' ? (
                    <img src={a.url} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 border" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-zinc-100 flex items-center justify-center shrink-0">
                      <AttachmentIcon type={a.file_type} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-800 truncate text-xs">{a.file_name}</p>
                    <p className="text-[10px] text-zinc-400 capitalize">{a.file_type}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a.file_type === 'image' && (
                      <button
                        type="button"
                        onClick={() => setDisplayPicture.mutate({ id: a.id, meetingType: 'external', meetingId: id! })}
                        title={a.is_display_picture ? 'Cover photo' : 'Set as cover photo'}
                        className={cn(
                          'p-1.5 rounded-md transition-colors',
                          a.is_display_picture ? 'text-brand bg-orange-100' : 'text-zinc-400 hover:text-amber-500 hover:bg-amber-50',
                        )}
                      >
                        <Star size={13} className={a.is_display_picture ? 'fill-brand' : ''} />
                      </button>
                    )}
                    <a
                      href={a.url}
                      download={a.file_name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      title="Download"
                    >
                      <Download size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteAttachment.mutate({ id: a.id, filePath: a.file_path, meetingType: 'external', meetingId: id! })}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList size={14} className="text-muted-foreground" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {auditEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet</p>
          ) : (
            <div className="space-y-4">
              {(auditEntries as AuditLog[]).map(entry => (
                <AuditEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDelete
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={() => deleteMutation.mutate(id!, { onSuccess: () => navigate('/meetings/external', { replace: true }) })}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
