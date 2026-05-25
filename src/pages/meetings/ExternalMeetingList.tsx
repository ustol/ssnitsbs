import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, X, Paperclip, Activity } from 'lucide-react'
import { useExternalMeetings, useDeleteExternalMeeting } from '@/hooks/useMeetings'
import { useMeetingAttachmentIndex } from '@/hooks/useMeetingAttachments'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

type Row = Record<string, unknown>

export function ExternalMeetingList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const partnershipFilter = searchParams.get('partnership')
  const { data = [], isLoading } = useExternalMeetings()
  const { data: attachedIds = new Set<string>() } = useMeetingAttachmentIndex('external')
  const deleteMutation = useDeleteExternalMeeting()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = partnershipFilter
    ? data.filter(row => (row as Row).partnership_id === partnershipFilter)
    : data

  const partnershipName = partnershipFilter
    ? ((filtered[0] as Row | undefined)?.partnership as { title: string } | null)?.title
      ?? ((data.find(r => (r as Row).partnership_id === partnershipFilter) as Row | undefined)?.partnership as { title: string } | null)?.title
    : null

  const columns: Column<Row>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: row => (
        <span className="flex items-center gap-1.5">
          <Link to={`/meetings/external/${row.id}`} className="font-medium hover:text-brand transition-colors" onClick={e => e.stopPropagation()}>
            {row.title as string}
          </Link>
          {attachedIds.has(row.id as string) && (
            <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" title="Has attachments" />
          )}
        </span>
      ),
    },
    {
      key: 'partnership',
      header: 'Partnership',
      cell: row => <span className="text-muted-foreground">{(row.partnership as { title: string } | null)?.title ?? '—'}</span>,
    },
    {
      key: 'meeting_date',
      header: 'Date',
      cell: row => row.meeting_date ? formatDate(row.meeting_date as string) : '—',
    },
    {
      key: 'location',
      header: 'Location',
      cell: row => <span className="text-muted-foreground">{(row.location as string) || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: row => {
        const s = row.status as { name: string; color: string } | null
        return s ? <StatusBadge status={s.name} color={s.color} /> : '—'
      },
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to={`/meetings/external/${row.id}`}><Eye className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to={`/meetings/external/${row.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteId(row.id as string)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to={`/status-tracker?q=${encodeURIComponent(row.title as string)}`} onClick={e => e.stopPropagation()}>
              <Activity className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ),
      className: 'w-[130px]',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="External Meetings"
        subtitle={partnershipName ? `Filtered by: ${partnershipName} — ${filtered.length} meeting${filtered.length !== 1 ? 's' : ''}` : `${data.length} total`}
        actions={
          <div className="flex items-center gap-2">
            {partnershipFilter && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/meetings/external"><X className="h-3.5 w-3.5 mr-1.5" />Show all</Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link to="/meetings/external/new"><Plus className="h-3.5 w-3.5 mr-1.5" />New Meeting</Link>
            </Button>
          </div>
        }
      />
      <DataTable
        data={filtered as Row[]}
        columns={columns}
        loading={isLoading}
        searchKeys={['title', 'location'] as (keyof Row)[]}
        searchPlaceholder="Search meetings…"
        emptyTitle={partnershipFilter ? 'No meetings for this partnership' : 'No external meetings yet'}
        emptyAction={<Button size="sm" asChild><Link to="/meetings/external/new">Add Meeting</Link></Button>}
        onRowClick={row => navigate(`/meetings/external/${row.id}`)}
      />
      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
