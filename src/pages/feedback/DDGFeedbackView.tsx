import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, CheckCircle, Circle, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDDGFeedback, useDeleteDDGFeedback, useMarkDDGActioned } from '@/hooks/useDDGFeedback'
import { writeAudit } from '@/hooks/useAuditLog'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
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

export function DDGFeedbackView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: feedback, isLoading } = useDDGFeedback(id!)
  const deleteMutation = useDeleteDDGFeedback()
  const markMutation = useMarkDDGActioned()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard')
  }

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-7 w-64" /><Skeleton className="h-64 w-full rounded-xl" /></div>
  }
  if (!feedback) {
    return <div className="p-6"><EmptyState title="Feedback not found" action={<Button asChild><Link to="/feedback/ddg">Back</Link></Button>} /></div>
  }

  const f = feedback as Record<string, unknown>
  const partnership = f.partnership as { id: string; title: string } | null
  const stakeholder = f.stakeholder as { name: string; organization: string } | null
  const isActioned = f.is_actioned as boolean

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title={f.feedback_type as string}
        subtitle={f.received_date ? formatDate(f.received_date as string) : undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back</Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5 mr-1.5" />Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markMutation.mutate({ id: id!, actioned: !isActioned })}
              disabled={markMutation.isPending}
            >
              {isActioned
                ? <><Circle className="h-3.5 w-3.5 mr-1.5" />Mark Pending</>
                : <><CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-600" />Mark Actioned</>
              }
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/feedback/ddg/${id}/edit`}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="py-3 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Feedback Details</CardTitle>
            <Badge variant={isActioned ? 'success' : 'warning'}>{isActioned ? 'Actioned' : 'Pending'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-2">
          <dl>
            <Field label="Type" value={f.feedback_type as string} />
            <Field label="Partnership" value={partnership ? <Link to={`/partnerships/${partnership.id}`} className="text-brand hover:underline">{partnership.title}</Link> : null} />
            <Field label="From" value={stakeholder ? `${stakeholder.name}${stakeholder.organization ? ` — ${stakeholder.organization}` : ''}` : null} />
            <Field label="Date Received" value={f.received_date ? formatDate(f.received_date as string) : null} />
            <Field label="Summary" value={f.summary as string} />
            <Field label="Details" value={f.details as string} />
            <Field label="Action Taken" value={f.action_taken as string} />
          </dl>
        </CardContent>
      </Card>

      <ConfirmDelete
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={() => deleteMutation.mutate(id!, {
          onSuccess: () => {
            writeAudit({ action: 'deleted', entity_type: 'ddg_feedback', entity_id: id!, entity_name: f.summary as string })
            navigate('/feedback/ddg', { replace: true })
          },
        })}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
