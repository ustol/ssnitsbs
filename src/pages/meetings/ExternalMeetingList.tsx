import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, CalendarCheck } from 'lucide-react'
import { useExternalMeetings, useDeleteExternalMeeting } from '@/hooks/useMeetings'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

type Row = Record<string, unknown>

export function ExternalMeetingList() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useExternalMeetings()
  const deleteMutation = useDeleteExternalMeeting()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: Column<Row>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: row => (
        <Link to={`/meetings/external/${row.id}`} className="font-medium hover:text-brand transition-colors" onClick={e => e.stopPropagation()}>
          {row.title as string}
        </Link>
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
        </div>
      ),
      className: 'w-[100px]',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="External Meetings"
        subtitle={`${data.length} total`}
        actions={
          <Button size="sm" asChild>
            <Link to="/meetings/external/new"><Plus className="h-3.5 w-3.5 mr-1.5" />New Meeting</Link>
          </Button>
        }
      />
      <DataTable
        data={data as Row[]}
        columns={columns}
        loading={isLoading}
        searchKeys={['title', 'location'] as (keyof Row)[]}
        searchPlaceholder="Search meetings…"
        emptyTitle="No external meetings yet"
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
