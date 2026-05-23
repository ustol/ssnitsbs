import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, Handshake } from 'lucide-react'
import { usePartnerships, useDeletePartnership } from '@/hooks/usePartnerships'
import { useSettings } from '@/hooks/useSettings'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { formatNumber, calcProjection } from '@/lib/utils'
import type { PartnershipWithRelations } from '@/types/database'

export function PartnershipList() {
  const navigate = useNavigate()
  const { data = [], isLoading } = usePartnerships()
  const { data: settings } = useSettings()
  const deleteMutation = useDeletePartnership()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const bestPct = Number(settings?.best_case_pct ?? 60)
  const worstPct = Number(settings?.worst_case_pct ?? 30)

  const columns: Column<PartnershipWithRelations>[] = [
    {
      key: '#',
      header: '#',
      cell: (_row, index) => (
        <span className="text-muted-foreground tabular-nums">{index}</span>
      ),
      className: 'w-[40px] text-center',
    },
    {
      key: 'title',
      header: 'Partnership Name',
      cell: row => (
        <Link
          to={`/partnerships/${row.id}`}
          className="font-medium hover:text-brand transition-colors"
          onClick={e => e.stopPropagation()}
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'external_stakeholders',
      header: 'External Stakeholders',
      cell: row => {
        const names = (row.external_stakeholders ?? [])
          .map((e: { stakeholder: { name: string } | null }) => e.stakeholder?.name)
          .filter(Boolean)
          .join(', ')
        return (
          <span className="text-muted-foreground line-clamp-1" title={names}>
            {names || '—'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: row => row.status
        ? <StatusBadge status={row.status.name} color={row.status.color} />
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'proposed_value',
      header: 'Proposed',
      cell: row => row.proposed_value != null
        ? <span className="tabular-nums">{formatNumber(Number(row.proposed_value))}</span>
        : <span className="text-muted-foreground">—</span>,
      className: 'text-right',
    },
    {
      key: 'best_case',
      header: `Best Case (${bestPct}%)`,
      cell: row => row.proposed_value != null
        ? <span className="tabular-nums text-green-600 font-medium">{formatNumber(calcProjection(Number(row.proposed_value), bestPct))}</span>
        : <span className="text-muted-foreground">—</span>,
      className: 'text-right',
    },
    {
      key: 'worst_case',
      header: `Worst Case (${worstPct}%)`,
      cell: row => row.proposed_value != null
        ? <span className="tabular-nums text-amber-600 font-medium">{formatNumber(calcProjection(Number(row.proposed_value), worstPct))}</span>
        : <span className="text-muted-foreground">—</span>,
      className: 'text-right',
    },
    {
      key: 'meetings',
      header: 'Meetings',
      cell: row => {
        const ext = (row.external_meetings ?? []).length
        const int = (row.internal_meetings ?? []).length
        const total = ext + int
        return total > 0 ? (
          <span className="tabular-nums" title={`${ext} external · ${int} internal`}>
            {total}
            <span className="text-muted-foreground text-xs ml-1">({ext}e · {int}i)</span>
          </span>
        ) : <span className="text-muted-foreground">—</span>
      },
      className: 'text-center',
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to={`/partnerships/${row.id}`}><Eye className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link to={`/partnerships/${row.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteId(row.id)}
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
        title="Partnerships"
        subtitle={`${data.length} total`}
        actions={
          <Button size="sm" asChild>
            <Link to="/partnerships/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />New Partnership
            </Link>
          </Button>
        }
      />

      <DataTable
        data={data as PartnershipWithRelations[]}
        columns={columns}
        loading={isLoading}
        searchKeys={['title', 'organization']}
        searchPlaceholder="Search partnerships…"
        emptyTitle="No partnerships yet"
        emptyDescription="Create your first partnership to get started"
        emptyAction={
          <Button size="sm" asChild>
            <Link to="/partnerships/new">
              <Handshake className="h-3.5 w-3.5 mr-1.5" />Add Partnership
            </Link>
          </Button>
        }
        onRowClick={row => navigate(`/partnerships/${row.id}`)}
      />

      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
        }}
        loading={deleteMutation.isPending}
        description="The partnership and all related records will be permanently deleted."
      />
    </div>
  )
}
