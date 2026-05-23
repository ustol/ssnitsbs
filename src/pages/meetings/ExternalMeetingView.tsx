import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useExternalMeeting, useDeleteExternalMeeting } from '@/hooks/useMeetings'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3 border-b last:border-0">
      <dt className="text-xs font-medium text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-[0.8125rem] whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  )
}

export function ExternalMeetingView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: meeting, isLoading } = useExternalMeeting(id!)
  const deleteMutation = useDeleteExternalMeeting()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-7 w-64" /><Skeleton className="h-64 w-full rounded-xl" /></div>
  }
  if (!meeting) {
    return <div className="p-6"><EmptyState title="Meeting not found" action={<Button asChild><Link to="/meetings/external">Back</Link></Button>} /></div>
  }

  const m = meeting as Record<string, unknown>
  const status = m.status as { name: string; color: string } | null
  const partnership = m.partnership as { id: string; title: string } | null

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title={m.title as string}
        subtitle={partnership ? `${partnership.title} · ${formatDate(m.meeting_date as string)}` : formatDate(m.meeting_date as string)}
        actions={
          <div className="flex items-center gap-2">
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

      <ConfirmDelete
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={() => deleteMutation.mutate(id!, { onSuccess: () => navigate('/meetings/external', { replace: true }) })}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
