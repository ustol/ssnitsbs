import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, CalendarCheck, Users, Share2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { usePartnership, useDeletePartnership } from '@/hooks/usePartnerships'
import { useVitalInformationList } from '@/hooks/useVitalInformation'
import { writeAudit } from '@/hooks/useAuditLog'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber } from '@/lib/utils'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b last:border-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-[0.8125rem]">{value || '—'}</dd>
    </div>
  )
}

export function PartnershipView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: p, isLoading } = usePartnership(id!)
  const { data: vitalInfoAll = [] } = useVitalInformationList()
  const deleteMutation = useDeletePartnership()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const vitalInfo = vitalInfoAll.filter(v => v.partnership_id === id)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard')
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!p) {
    return (
      <div className="p-6">
        <EmptyState title="Partnership not found" action={<Button asChild><Link to="/partnerships">Back to list</Link></Button>} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <PageHeader
        title={p.title}
        subtitle={p.organization ?? undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5 mr-1.5" />Share
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/partnerships/${id}/edit`}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 space-y-0">
          <CardHeader className="py-3 px-5">
            <CardTitle className="text-sm font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-2">
            <dl>
              <DetailRow label="Status" value={p.status ? <StatusBadge status={p.status.name} color={p.status.color} /> : null} />
              <DetailRow label="Start Date" value={p.start_date ? formatDate(p.start_date) : null} />
              <DetailRow label="Proposed Numbers" value={p.proposed_value != null ? formatNumber(p.proposed_value) : null} />
              <DetailRow label="Description" value={p.description} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">External Meetings</p>
                  <p className="text-xl font-semibold">{(p.external_meetings?.length ?? 0)}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/meetings/external?partnership=${id}`}>View meetings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Internal Meetings</p>
                  <p className="text-xl font-semibold">{(p.internal_meetings?.length ?? 0)}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/meetings/internal?partnership=${id}`}>View meetings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stakeholders */}
      {((p.internal_stakeholders?.length ?? 0) > 0 || (p.external_stakeholders?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(p.internal_stakeholders?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="py-3 px-5">
                <CardTitle className="text-sm font-semibold">Internal Stakeholders</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-3">
                <ul className="space-y-2">
                  {p.internal_stakeholders!.map(({ stakeholder: s }) => (
                    <li key={s.id} className="flex flex-col">
                      <span className="text-[0.8125rem] font-medium">{s.name}</span>
                      {(s.department || s.title) && (
                        <span className="text-xs text-muted-foreground">{s.department ?? s.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {(p.external_stakeholders?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="py-3 px-5">
                <CardTitle className="text-sm font-semibold">External Stakeholders</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-3">
                <ul className="space-y-2">
                  {p.external_stakeholders!.map(({ stakeholder: s }) => (
                    <li key={s.id} className="flex flex-col">
                      <span className="text-[0.8125rem] font-medium">{s.name}</span>
                      {s.organization && (
                        <span className="text-xs text-muted-foreground">{s.organization}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vital Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Info className="h-4 w-4 text-muted-foreground" />Vital Information
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to="/vital-information">Add / View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {vitalInfo.length === 0 ? (
            <p className="text-xs text-zinc-400">No vital information recorded for this partnership yet.</p>
          ) : (
            <ul className="space-y-3">
              {vitalInfo.slice(0, 5).map(v => (
                <li key={v.id} className="flex flex-col gap-1 pb-3 border-b last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-400 shrink-0">{formatDate(v.date)}</span>
                    <span className="text-[0.8125rem] font-medium text-zinc-800">{v.subject}</span>
                    {(v.external_meeting || v.internal_meeting) && (
                      <Badge variant={v.external_meeting ? 'brand' : 'info'}>
                        {(v.external_meeting ?? v.internal_meeting)!.title}
                      </Badge>
                    )}
                  </div>
                  {v.details && <p className="text-xs text-zinc-500">{v.details}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDelete
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={() =>
          deleteMutation.mutate(id!, {
            onSuccess: () => {
              writeAudit({ action: 'deleted', entity_type: 'partnership', entity_id: id!, entity_name: p.title })
              navigate('/partnerships', { replace: true })
            },
          })
        }
        loading={deleteMutation.isPending}
        description="This partnership and all related meetings will be permanently deleted."
      />
    </div>
  )
}
