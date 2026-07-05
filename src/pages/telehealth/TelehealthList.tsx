import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, AlertTriangle, Phone, Copy } from 'lucide-react'
import { format } from 'date-fns'
import { useTelehealthEntries, useDeleteTelehealthEntry, useTelehealthConfig } from '@/hooks/useTelehealth'
import { useAuth } from '@/hooks/useAuth'
import type { TelehealthEntry, TelehealthFilters } from '@/types/database'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const SSNIT_ROLES = ['ssnit_viewer', 'ssnit_executive']

function statusColor(s: string) {
  if (s === 'Closed')      return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'In Progress') return 'bg-blue-50 text-blue-700 border-blue-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

function priorityColor(p: string | null) {
  if (p === 'High')   return 'bg-red-50 text-red-700 border-red-200'
  if (p === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (p === 'Low')    return 'bg-green-50 text-green-700 border-green-200'
  return 'bg-zinc-50 text-zinc-500 border-zinc-200'
}

export function TelehealthList() {
  const navigate  = useNavigate()
  const { profile } = useAuth()
  const isReadOnly = SSNIT_ROLES.includes(profile?.role ?? '')

  const [filters, setFilters] = useState<TelehealthFilters>({})
  const [toDelete, setToDelete] = useState<TelehealthEntry | null>(null)

  const { data: entries = [], isLoading, refetch } = useTelehealthEntries(filters)
  const { data: cfg } = useTelehealthConfig()
  const deleteMut = useDeleteTelehealthEntry()

  function setFilter(key: keyof TelehealthFilters, val: string) {
    setFilters(prev => ({ ...prev, [key]: val === 'all' ? undefined : val }))
  }

  const columns = [
    {
      key: 'entry_id',
      header: 'Entry ID',
      cell: (row: TelehealthEntry) => (
        <span className="font-mono text-xs font-semibold text-brand">{row.entry_id ?? '—'}</span>
      ),
    },
    {
      key: 'date_of_interaction',
      header: 'Date',
      cell: (row: TelehealthEntry) => (
        <span className="text-xs whitespace-nowrap">
          {row.date_of_interaction ? format(new Date(row.date_of_interaction), 'dd MMM yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'reporting_period',
      header: 'Period / Week',
      cell: (row: TelehealthEntry) => (
        <div className="text-xs">
          <div className="font-medium">{row.reporting_period}</div>
          <div className="text-muted-foreground">{row.weekly_cycle}</div>
        </div>
      ),
    },
    {
      key: 'patient_full_name',
      header: 'Patient',
      cell: (row: TelehealthEntry) => (
        <div className="text-xs">
          <div className="font-medium">{row.patient_full_name}</div>
          <div className="text-muted-foreground">{row.region}</div>
        </div>
      ),
    },
    {
      key: 'cro_name',
      header: 'CRO',
      cell: (row: TelehealthEntry) => <span className="text-xs">{row.cro_name}</span>,
    },
    {
      key: 'engagement_type',
      header: 'Engagement',
      cell: (row: TelehealthEntry) => (
        <span className="text-xs text-muted-foreground">{row.engagement_type}</span>
      ),
    },
    {
      key: 'feedback_category',
      header: 'Feedback',
      cell: (row: TelehealthEntry) => (
        <Badge variant="outline" className="text-[0.65rem]">{row.feedback_category}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: TelehealthEntry) => (
        <Badge variant="outline" className={cn('text-[0.65rem]', statusColor(row.status))}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'flags',
      header: 'Flags',
      cell: (row: TelehealthEntry) => (
        <div className="flex gap-1 flex-wrap">
          {row.duplicate_flag && (
            <span title="Duplicate" className="inline-flex items-center gap-0.5 text-[0.6rem] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1">
              <Copy size={9} /> DUP
            </span>
          )}
          {row.contact_missing && (
            <span title="Missing contact" className="inline-flex items-center gap-0.5 text-[0.6rem] text-red-700 bg-red-50 border border-red-200 rounded px-1">
              <Phone size={9} /> ∅
            </span>
          )}
          {row.phone_check && (
            <span title="Phone number too short" className="inline-flex items-center gap-0.5 text-[0.6rem] text-orange-700 bg-orange-50 border border-orange-200 rounded px-1">
              <AlertTriangle size={9} /> CHK
            </span>
          )}
          {row.priority_level && (
            <Badge variant="outline" className={cn('text-[0.6rem] px-1', priorityColor(row.priority_level))}>
              {row.priority_level}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row: TelehealthEntry) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {!isReadOnly && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => navigate(`/telehealth/${row.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => setToDelete(row)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period filter */}
      <Select onValueChange={v => setFilter('reporting_period', v)}>
        <SelectTrigger className="h-8 text-xs w-36">
          <SelectValue placeholder="All Periods" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Periods</SelectItem>
          {cfg?.periods.map(p => (
            <SelectItem key={p.id} value={p.value}>{p.value}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Week filter */}
      <Select onValueChange={v => setFilter('weekly_cycle', v)}>
        <SelectTrigger className="h-8 text-xs w-28">
          <SelectValue placeholder="All Weeks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Weeks</SelectItem>
          {cfg?.cycles.map(c => (
            <SelectItem key={c.id} value={c.value}>{c.value}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Region filter */}
      <Select onValueChange={v => setFilter('region', v)}>
        <SelectTrigger className="h-8 text-xs w-36">
          <SelectValue placeholder="All Regions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          {cfg?.regions.map(r => (
            <SelectItem key={r.id} value={r.value}>{r.value}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select onValueChange={v => setFilter('status', v)}>
        <SelectTrigger className="h-8 text-xs w-32">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {cfg?.statuses.map(s => (
            <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} title="Refresh">
        <RefreshCw size={14} />
      </Button>

      {!isReadOnly && (
        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => navigate('/telehealth/new')}>
          <Plus size={13} /> New Entry
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Telehealth Interactions"
        subtitle="SSNIT pensioner telemedicine interaction records"
        actions={
          !isReadOnly ? (
            <Button size="sm" className="gap-1.5" onClick={() => navigate('/telehealth/new')}>
              <Plus size={14} /> New Entry
            </Button>
          ) : undefined
        }
      />

      <DataTable
        data={entries}
        columns={columns}
        loading={isLoading}
        searchable
        searchPlaceholder="Search patient name, CRO, entry ID…"
        searchKeys={['patient_full_name', 'cro_name', 'entry_id', 'region']}
        toolbar={toolbar}
        emptyTitle="No telehealth entries found"
        emptyDescription="Adjust your filters or add the first interaction record."
        emptyAction={
          !isReadOnly ? (
            <Button size="sm" onClick={() => navigate('/telehealth/new')}>
              <Plus size={13} className="mr-1" /> New Entry
            </Button>
          ) : undefined
        }
        pageSize={20}
      />

      {toDelete && (
        <ConfirmDelete
          open
          title="Delete Interaction Record"
          description={`Delete ${toDelete.entry_id} for ${toDelete.patient_full_name}? This action cannot be undone.`}
          onConfirm={async () => {
            await deleteMut.mutateAsync(toDelete)
            toast.success('Entry deleted')
            setToDelete(null)
          }}
          onCancel={() => setToDelete(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
