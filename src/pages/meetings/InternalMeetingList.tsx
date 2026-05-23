import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { useInternalMeetings, useDeleteInternalMeeting } from '@/hooks/useMeetings'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

type Row = Record<string, unknown>

export function InternalMeetingList() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useInternalMeetings()
  const deleteMutation = useDeleteInternalMeeting()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: Column<Row>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: row => (
        <Link to={`/meetings/internal/${row.id}`} className="font-medium hover:text-brand transition-colors" onClick={e => e.stopPropagation()}>
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
            <Link to={`/meetings/internal/${row.id}`}><Eye className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to={`/meetings/internal/${row.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
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
        title="Internal Meetings"
        subtitle={`${data.length} total`}
        actions={
          <Button size="sm" asChild>
            <Link to="/meetings/internal/new"><Plus className="h-3.5 w-3.5 mr-1.5" />New Meeting</Link>
          </Button>
        }
      />
      <DataTable
        data={data as Row[]}
        columns={columns}
        loading={isLoading}
        searchKeys={['title'] as (keyof Row)[]}
        searchPlaceholder="Search meetings…"
        emptyTitle="No internal meetings yet"
        emptyAction={<Button size="sm" asChild><Link to="/meetings/internal/new">Add Meeting</Link></Button>}
        onRowClick={row => navigate(`/meetings/internal/${row.id}`)}
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
