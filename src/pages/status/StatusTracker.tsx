import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePartnerships, useUpdatePartnership } from '@/hooks/usePartnerships'
import { useExternalMeetings, useUpdateExternalMeeting, useInternalMeetings, useUpdateInternalMeeting } from '@/hooks/useMeetings'
import { useStatusLookup } from '@/hooks/useSettings'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import type { StatusLookup } from '@/types/database'

const TRACKER_STATUS_CONFIGS = [
  { name: 'Initial Letter Sent',          color: '#6366f1', sort_order: 10 },
  { name: 'Initial Meeting',              color: '#0ea5e9', sort_order: 20 },
  { name: 'Follow-Up Meeting',            color: '#f59e0b', sort_order: 30 },
  { name: 'Request for more Information', color: '#8b5cf6', sort_order: 40 },
  { name: 'Other',                        color: '#6b7280', sort_order: 50 },
]

const TRACKER_STATUSES = TRACKER_STATUS_CONFIGS.map(s => s.name)

const NONE = '__none__'

function StatusUpdateCell({ currentStatusId, currentDate, statuses, onSave }: {
  currentStatusId: string | null
  currentDate: string | null
  statuses: StatusLookup[]
  onSave: (statusId: string | null, date: string | null) => Promise<void>
}) {
  const [statusId, setStatusId] = useState(currentStatusId ?? NONE)
  const [date, setDate] = useState(currentDate ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatusId(currentStatusId ?? NONE)
    setDate(currentDate ?? '')
  }, [currentStatusId, currentDate])

  const isDirty = statusId !== (currentStatusId ?? NONE) || date !== (currentDate ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(statusId === NONE ? null : statusId, date || null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <Select value={statusId} onValueChange={setStatusId} disabled={saving}>
        <SelectTrigger className="h-7 text-xs w-[185px]">
          <SelectValue placeholder="Select status…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— None —</SelectItem>
          {statuses.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        disabled={saving}
        className="h-7 text-xs w-[130px] px-2"
      />
      <Button
        size="sm"
        className="h-7 text-xs px-2.5"
        disabled={!isDirty || saving}
        onClick={handleSave}
      >
        {saving ? '…' : 'Save'}
      </Button>
    </div>
  )
}

export function StatusTracker() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'partnerships'
  const qc = useQueryClient()

  const { data: allStatuses = [], isLoading: loadingStatuses } = useStatusLookup()
  const statuses = (allStatuses as StatusLookup[]).filter(s => TRACKER_STATUSES.includes(s.name))

  useEffect(() => {
    if (loadingStatuses || statuses.length > 0) return
    const existingNames = new Set((allStatuses as StatusLookup[]).map(s => s.name))
    const toInsert = TRACKER_STATUS_CONFIGS.filter(s => !existingNames.has(s.name))
    if (toInsert.length === 0) return
    supabase.from('status_lookup').insert(toInsert).then(() => {
      qc.invalidateQueries({ queryKey: ['status-lookup'] })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingStatuses])

  const { data: partnerships = [], isLoading: loadingP } = usePartnerships()
  const updatePartnership = useUpdatePartnership()

  const { data: extMeetings = [], isLoading: loadingExt } = useExternalMeetings()
  const updateExt = useUpdateExternalMeeting()

  const { data: intMeetings = [], isLoading: loadingInt } = useInternalMeetings()
  const updateInt = useUpdateInternalMeeting()

  function handleTabChange(tab: string) {
    setSearchParams(tab === 'partnerships' ? {} : { tab })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partnershipCols: Column<any>[] = [
    {
      key: '#', header: '#',
      cell: (_r, i) => <span className="text-muted-foreground tabular-nums">{i}</span>,
      className: 'w-[40px] text-center',
    },
    {
      key: 'title', header: 'Partnership',
      cell: r => (
        <Link to={`/partnerships/${r.id}`} className="font-medium hover:text-brand transition-colors" onClick={e => e.stopPropagation()}>
          {r.title}
        </Link>
      ),
    },
    {
      key: 'organization', header: 'Organization',
      cell: r => <span className="text-muted-foreground text-xs">{r.organization || '—'}</span>,
    },
    {
      key: 'status', header: 'Current Status',
      cell: r => r.status
        ? <StatusBadge status={r.status.name} color={r.status.color} />
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'update', header: 'Status / Date',
      cell: r => (
        <StatusUpdateCell
          currentStatusId={r.status_id}
          currentDate={r.status_date ?? null}
          statuses={statuses}
          onSave={(sid, d) => updatePartnership.mutateAsync({ id: r.id, values: { status_id: sid, status_date: d } })}
        />
      ),
    },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extMeetingCols: Column<any>[] = [
    {
      key: '#', header: '#',
      cell: (_r, i) => <span className="text-muted-foreground tabular-nums">{i}</span>,
      className: 'w-[40px] text-center',
    },
    {
      key: 'title', header: 'Meeting',
      cell: r => (
        <Link to={`/meetings/external/${r.id}`} className="font-medium hover:text-brand transition-colors" onClick={e => e.stopPropagation()}>
          {r.title}
        </Link>
      ),
    },
    {
      key: 'partnership', header: 'Partnership',
      cell: r => r.partnership
        ? <span className="text-muted-foreground text-xs">{r.partnership.title}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'status', header: 'Current Status',
      cell: r => r.status
        ? <StatusBadge status={r.status.name} color={r.status.color} />
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'update', header: 'Status / Date',
      cell: r => (
        <StatusUpdateCell
          currentStatusId={r.status_id}
          currentDate={r.status_date ?? null}
          statuses={statuses}
          onSave={(sid, d) => updateExt.mutateAsync({ id: r.id, values: { status_id: sid, status_date: d } })}
        />
      ),
    },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intMeetingCols: Column<any>[] = [
    {
      key: '#', header: '#',
      cell: (_r, i) => <span className="text-muted-foreground tabular-nums">{i}</span>,
      className: 'w-[40px] text-center',
    },
    {
      key: 'title', header: 'Meeting',
      cell: r => (
        <Link to={`/meetings/internal/${r.id}`} className="font-medium hover:text-brand transition-colors" onClick={e => e.stopPropagation()}>
          {r.title}
        </Link>
      ),
    },
    {
      key: 'partnership', header: 'Partnership',
      cell: r => r.partnership
        ? <span className="text-muted-foreground text-xs">{r.partnership.title}</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'status', header: 'Current Status',
      cell: r => r.status
        ? <StatusBadge status={r.status.name} color={r.status.color} />
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: 'update', header: 'Status / Date',
      cell: r => (
        <StatusUpdateCell
          currentStatusId={r.status_id}
          currentDate={r.status_date ?? null}
          statuses={statuses}
          onSave={(sid, d) => updateInt.mutateAsync({ id: r.id, values: { status_id: sid, status_date: d } })}
        />
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Status Tracker"
        subtitle="Assign or update the engagement status for partnerships and meetings"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="partnerships">
            Partnerships
            {!loadingP && <span className="ml-1.5 text-[0.65rem] opacity-60">({partnerships.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="external">
            External Meetings
            {!loadingExt && <span className="ml-1.5 text-[0.65rem] opacity-60">({extMeetings.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="internal">
            Internal Meetings
            {!loadingInt && <span className="ml-1.5 text-[0.65rem] opacity-60">({intMeetings.length})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partnerships">
          <DataTable
            data={partnerships}
            columns={partnershipCols}
            loading={loadingP}
            searchKeys={['title', 'organization']}
            searchPlaceholder="Search partnerships…"
            emptyTitle="No partnerships found"
          />
        </TabsContent>

        <TabsContent value="external">
          <DataTable
            data={extMeetings}
            columns={extMeetingCols}
            loading={loadingExt}
            searchKeys={['title']}
            searchPlaceholder="Search external meetings…"
            emptyTitle="No external meetings found"
          />
        </TabsContent>

        <TabsContent value="internal">
          <DataTable
            data={intMeetings}
            columns={intMeetingCols}
            loading={loadingInt}
            searchKeys={['title']}
            searchPlaceholder="Search internal meetings…"
            emptyTitle="No internal meetings found"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
