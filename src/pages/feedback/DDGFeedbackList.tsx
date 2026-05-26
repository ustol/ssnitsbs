import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, CheckCircle, Circle } from 'lucide-react'
import { useDDGFeedbackList, useDeleteDDGFeedback, useMarkDDGActioned } from '@/hooks/useDDGFeedback'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/utils'

type Row = Record<string, unknown>

function LinkedToCell({ row }: { row: Row }) {
  const partnership = row.partnership as { title: string } | null
  const meetingTitle = row.meeting_title as string | null
  const meetingType = row.meeting_type as string | null

  if (partnership) return <span className="text-sm">{partnership.title}</span>
  if (meetingTitle) return (
    <span className="flex items-center gap-1.5">
      <span className={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full ${meetingType === 'external' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
        {meetingType === 'external' ? 'Ext' : 'Int'}
      </span>
      <span className="text-sm">{meetingTitle}</span>
    </span>
  )
  return <span className="text-muted-foreground">—</span>
}

export function DDGFeedbackList() {
  const navigate = useNavigate()
  const { data = [], isLoading } = useDDGFeedbackList()
  const deleteMutation = useDeleteDDGFeedback()
  const markMutation = useMarkDDGActioned()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'actioned'>('all')

  const filtered = (data as Row[]).filter(row => {
    if (filter === 'pending') return !row.is_actioned
    if (filter === 'actioned') return row.is_actioned
    return true
  })

  const pendingCount = (data as Row[]).filter(r => !r.is_actioned).length

  const columns: Column<Row>[] = [
    {
      key: 'actioned',
      header: '',
      cell: row => (
        <button
          onClick={e => { e.stopPropagation(); markMutation.mutate({ id: row.id as string, actioned: !row.is_actioned }) }}
          className="text-muted-foreground hover:text-green-600 transition-colors"
          title={row.is_actioned ? 'Mark as pending' : 'Mark as actioned'}
        >
          {row.is_actioned
            ? <CheckCircle className="h-4 w-4 text-green-600" />
            : <Circle className="h-4 w-4" />}
        </button>
      ),
      className: 'w-[40px]',
    },
    {
      key: 'feedback_type',
      header: 'Type',
      cell: row => <span className="font-medium">{row.feedback_type as string}</span>,
    },
    {
      key: 'linked_to',
      header: 'Linked To',
      cell: row => <LinkedToCell row={row} />,
    },
    {
      key: 'stakeholder',
      header: 'From',
      cell: row => {
        const s = row.stakeholder as { name: string; organization: string } | null
        return s ? <span>{s.name}{s.organization ? ` · ${s.organization}` : ''}</span> : '—'
      },
    },
    {
      key: 'received_date',
      header: 'Date',
      cell: row => row.received_date ? formatDate(row.received_date as string) : '—',
    },
    {
      key: 'is_actioned',
      header: 'Status',
      cell: row => (
        <Badge variant={row.is_actioned ? 'success' : 'warning'}>
          {row.is_actioned ? 'Actioned' : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to={`/feedback/ddg/${row.id}`}><Eye className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to={`/feedback/ddg/${row.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
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
        title="DDG's Comments"
        subtitle={pendingCount > 0 ? `${pendingCount} pending` : `${data.length} total`}
        actions={
          <Button size="sm" asChild>
            <Link to="/feedback/ddg/new"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Comment</Link>
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={v => setFilter(v as typeof filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending {pendingCount > 0 && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white font-medium">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="actioned">Actioned</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        data={filtered}
        columns={columns}
        loading={isLoading}
        searchKeys={['feedback_type', 'summary'] as (keyof Row)[]}
        searchPlaceholder="Search comments…"
        emptyTitle="No DDG comments yet"
        emptyAction={<Button size="sm" asChild><Link to="/feedback/ddg/new">Add Comment</Link></Button>}
        onRowClick={row => navigate(`/feedback/ddg/${row.id}`)}
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
