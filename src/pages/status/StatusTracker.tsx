import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Network, Building2, Users2, History } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePartnerships, useUpdatePartnership } from '@/hooks/usePartnerships'
import { useExternalMeetings, useUpdateExternalMeeting, useInternalMeetings, useUpdateInternalMeeting } from '@/hooks/useMeetings'
import { useStatusLookup } from '@/hooks/useSettings'
import { useStatusHistory, useCreateStatusHistory } from '@/hooks/useStatusHistory'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { StatusLookup, StatusHistoryWithRelations } from '@/types/database'

const NONE = '__none__'

type EntityType = 'partnership' | 'external_meeting' | 'internal_meeting'

// ─── Status update cell ────────────────────────────────────────────────────

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

// ─── Status history modal ──────────────────────────────────────────────────

function StatusHistoryModal({ entityType, entityId, entityTitle }: {
  entityType: EntityType
  entityId: string
  entityTitle: string
}) {
  const [open, setOpen] = useState(false)
  const { data: history = [], isLoading } = useStatusHistory(entityType, entityId, open)

  function daysBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        title="View status history"
      >
        <History className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Status History</DialogTitle>
            <DialogDescription className="truncate">{entityTitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-px max-h-80 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No status changes recorded yet.</p>
            ) : (history as StatusHistoryWithRelations[]).map((h, idx, arr) => {
              const prevDate = idx > 0 ? arr[idx - 1].status_date : null
              const days = prevDate && h.status_date ? daysBetween(prevDate, h.status_date) : null
              return (
                <div key={h.id} className="flex items-center gap-2 py-2 border-b last:border-0 text-xs">
                  <span className="text-muted-foreground w-[88px] shrink-0">
                    {h.status_date ? new Date(h.status_date + 'T00:00:00').toLocaleDateString() : '—'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                    {h.from_status
                      ? <StatusBadge status={h.from_status.name} color={h.from_status.color} />
                      : <span className="text-muted-foreground italic">none</span>}
                    <span className="text-muted-foreground">→</span>
                    {h.to_status
                      ? <StatusBadge status={h.to_status.name} color={h.to_status.color} />
                      : <span className="text-muted-foreground italic">cleared</span>}
                  </div>
                  {days !== null && (
                    <span className="text-muted-foreground shrink-0 tabular-nums">{days}d</span>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Type badge ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: EntityType }) {
  if (type === 'partnership')
    return <span className="text-[0.68rem] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">Partnership</span>
  if (type === 'external_meeting')
    return <span className="text-[0.68rem] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full whitespace-nowrap">External Mtg</span>
  return <span className="text-[0.68rem] font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full whitespace-nowrap">Internal Mtg</span>
}

// ─── Main page ─────────────────────────────────────────────────────────────

export function StatusTracker() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  const { data: allStatuses = [] } = useStatusLookup()
  const statuses = allStatuses as StatusLookup[]

  const { data: partnerships = [], isLoading: loadingP } = usePartnerships()
  const updatePartnership = useUpdatePartnership()

  const { data: extMeetings = [], isLoading: loadingExt } = useExternalMeetings()
  const updateExt = useUpdateExternalMeeting()

  const { data: intMeetings = [], isLoading: loadingInt } = useInternalMeetings()
  const updateInt = useUpdateInternalMeeting()

  const createHistory = useCreateStatusHistory()

  // Group meetings by partnership_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extByPartnership = useMemo<Record<string, any[]>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: Record<string, any[]> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of extMeetings as any[]) {
      const pid = m.partnership_id ?? '__unaffiliated__'
      ;(map[pid] ??= []).push(m)
    }
    return map
  }, [extMeetings])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intByPartnership = useMemo<Record<string, any[]>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: Record<string, any[]> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of intMeetings as any[]) {
      const pid = m.partnership_id ?? '__unaffiliated__'
      ;(map[pid] ??= []).push(m)
    }
    return map
  }, [intMeetings])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredPartnerships = useMemo<any[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = partnerships as any[]
    if (!q) return all
    return all.filter(p => {
      if (p.title?.toLowerCase().includes(q) || p.organization?.toLowerCase().includes(q)) return true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extHit = (extByPartnership[p.id] ?? []).some((m: any) => m.title?.toLowerCase().includes(q))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intHit = (intByPartnership[p.id] ?? []).some((m: any) => m.title?.toLowerCase().includes(q))
      return extHit || intHit
    })
  }, [partnerships, extByPartnership, intByPartnership, q])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unaffiliatedExt = useMemo<any[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = extByPartnership['__unaffiliated__'] ?? []
    if (!q) return rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.filter((m: any) => m.title?.toLowerCase().includes(q))
  }, [extByPartnership, q])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unaffiliatedInt = useMemo<any[]>(() => {
    const rows = intByPartnership['__unaffiliated__'] ?? []
    if (!q) return rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.filter((m: any) => m.title?.toLowerCase().includes(q))
  }, [intByPartnership, q])

  // Save handlers ──────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function savePartnership(r: any, newStatusId: string | null, date: string | null) {
    const oldStatusId = r.status_id
    await updatePartnership.mutateAsync({ id: r.id, values: { status_id: newStatusId, status_date: date } })
    if (newStatusId !== oldStatusId) {
      createHistory.mutateAsync({
        entity_type: 'partnership',
        entity_id: r.id,
        from_status_id: oldStatusId,
        to_status_id: newStatusId,
        status_date: date,
        changed_by: user?.id ?? null,
      }).catch(() => {})
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function saveExtMeeting(r: any, newStatusId: string | null, date: string | null) {
    const oldStatusId = r.status_id
    await updateExt.mutateAsync({ id: r.id, values: { status_id: newStatusId, status_date: date } })
    if (newStatusId !== oldStatusId) {
      createHistory.mutateAsync({
        entity_type: 'external_meeting',
        entity_id: r.id,
        from_status_id: oldStatusId,
        to_status_id: newStatusId,
        status_date: date,
        changed_by: user?.id ?? null,
      }).catch(() => {})
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function saveIntMeeting(r: any, newStatusId: string | null, date: string | null) {
    const oldStatusId = r.status_id
    await updateInt.mutateAsync({ id: r.id, values: { status_id: newStatusId, status_date: date } })
    if (newStatusId !== oldStatusId) {
      createHistory.mutateAsync({
        entity_type: 'internal_meeting',
        entity_id: r.id,
        from_status_id: oldStatusId,
        to_status_id: newStatusId,
        status_date: date,
        changed_by: user?.id ?? null,
      }).catch(() => {})
    }
  }

  const isLoading = loadingP || loadingExt || loadingInt
  const hasContent = filteredPartnerships.length > 0 || unaffiliatedExt.length > 0 || unaffiliatedInt.length > 0

  return (
    <div className="p-6">
      <PageHeader
        title="Status Tracker"
        subtitle="Assign or update the engagement status for partnerships and their meetings"
      />

      <div className="mb-4">
        <Input
          placeholder="Search partnerships and meetings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm h-8 text-sm"
        />
      </div>

      <div className="rounded-lg border bg-background overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-[44px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="w-[130px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="w-[180px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Current Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Update Status / Date</th>
              <th className="w-[64px] px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">History</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            ) : !hasContent ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  {q ? 'No results match your search.' : 'No partnerships found.'}
                </td>
              </tr>
            ) : (
              <>
                {/* ── Partnership groups ── */}
                {filteredPartnerships.map((p, pi) => {
                  const pNameMatch = !q || p.title?.toLowerCase().includes(q) || p.organization?.toLowerCase().includes(q)
                  // If partnership name matched → show all its meetings; else show only matches
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const pExt: any[] = pNameMatch
                    ? (extByPartnership[p.id] ?? [])
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    : (extByPartnership[p.id] ?? []).filter((m: any) => m.title?.toLowerCase().includes(q))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const pInt: any[] = pNameMatch
                    ? (intByPartnership[p.id] ?? [])
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    : (intByPartnership[p.id] ?? []).filter((m: any) => m.title?.toLowerCase().includes(q))

                  return (
                    <React.Fragment key={p.id}>
                      {/* Partnership row */}
                      <tr className="border-b bg-muted/20 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums text-center align-middle">
                          {pi + 1}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center gap-1.5">
                            <Network size={12} className="text-muted-foreground/60 shrink-0" />
                            <Link
                              to={`/partnerships/${p.id}`}
                              className="font-medium hover:text-brand transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              {p.title}
                            </Link>
                            {p.organization && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">· {p.organization}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle"><TypeBadge type="partnership" /></td>
                        <td className="px-3 py-2 align-middle">
                          {p.status
                            ? <StatusBadge status={p.status.name} color={p.status.color} />
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <StatusUpdateCell
                            currentStatusId={p.status_id}
                            currentDate={p.status_date ?? null}
                            statuses={statuses}
                            onSave={(sid, d) => savePartnership(p, sid, d)}
                          />
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <StatusHistoryModal entityType="partnership" entityId={p.id} entityTitle={p.title} />
                        </td>
                      </tr>

                      {/* External meeting sub-rows */}
                      {pExt.map(m => (
                        <tr key={`ext-${m.id}`} className="border-b hover:bg-sky-50/30 transition-colors">
                          <td className="px-3 py-1.5" />
                          <td className="px-3 py-1.5 align-middle">
                            <div className="flex items-center gap-1.5 pl-6">
                              <Building2 size={11} className="text-sky-500 shrink-0" />
                              <Link
                                to={`/meetings/external/${m.id}`}
                                className="text-xs text-muted-foreground hover:text-brand transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                {m.title}
                              </Link>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 align-middle"><TypeBadge type="external_meeting" /></td>
                          <td className="px-3 py-1.5 align-middle">
                            {m.status
                              ? <StatusBadge status={m.status.name} color={m.status.color} />
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-3 py-1.5 align-middle">
                            <StatusUpdateCell
                              currentStatusId={m.status_id}
                              currentDate={m.status_date ?? null}
                              statuses={statuses}
                              onSave={(sid, d) => saveExtMeeting(m, sid, d)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center align-middle">
                            <StatusHistoryModal entityType="external_meeting" entityId={m.id} entityTitle={m.title} />
                          </td>
                        </tr>
                      ))}

                      {/* Internal meeting sub-rows */}
                      {pInt.map(m => (
                        <tr key={`int-${m.id}`} className="border-b hover:bg-violet-50/30 transition-colors">
                          <td className="px-3 py-1.5" />
                          <td className="px-3 py-1.5 align-middle">
                            <div className="flex items-center gap-1.5 pl-6">
                              <Users2 size={11} className="text-violet-500 shrink-0" />
                              <Link
                                to={`/meetings/internal/${m.id}`}
                                className="text-xs text-muted-foreground hover:text-brand transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                {m.title}
                              </Link>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 align-middle"><TypeBadge type="internal_meeting" /></td>
                          <td className="px-3 py-1.5 align-middle">
                            {m.status
                              ? <StatusBadge status={m.status.name} color={m.status.color} />
                              : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="px-3 py-1.5 align-middle">
                            <StatusUpdateCell
                              currentStatusId={m.status_id}
                              currentDate={m.status_date ?? null}
                              statuses={statuses}
                              onSave={(sid, d) => saveIntMeeting(m, sid, d)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center align-middle">
                            <StatusHistoryModal entityType="internal_meeting" entityId={m.id} entityTitle={m.title} />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}

                {/* ── Unaffiliated meetings ── */}
                {(unaffiliatedExt.length > 0 || unaffiliatedInt.length > 0) && (
                  <>
                    <tr className="border-b bg-amber-50/60">
                      <td colSpan={6} className="px-3 py-2 text-xs font-semibold text-amber-700 tracking-wide">
                        Unaffiliated Meetings
                      </td>
                    </tr>
                    {unaffiliatedExt.map(m => (
                      <tr key={`ua-ext-${m.id}`} className="border-b hover:bg-sky-50/30 transition-colors">
                        <td className="px-3 py-1.5" />
                        <td className="px-3 py-1.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={11} className="text-sky-500 shrink-0" />
                            <Link
                              to={`/meetings/external/${m.id}`}
                              className="text-xs text-muted-foreground hover:text-brand transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              {m.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 align-middle"><TypeBadge type="external_meeting" /></td>
                        <td className="px-3 py-1.5 align-middle">
                          {m.status
                            ? <StatusBadge status={m.status.name} color={m.status.color} />
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-3 py-1.5 align-middle">
                          <StatusUpdateCell
                            currentStatusId={m.status_id}
                            currentDate={m.status_date ?? null}
                            statuses={statuses}
                            onSave={(sid, d) => saveExtMeeting(m, sid, d)}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-center align-middle">
                          <StatusHistoryModal entityType="external_meeting" entityId={m.id} entityTitle={m.title} />
                        </td>
                      </tr>
                    ))}
                    {unaffiliatedInt.map(m => (
                      <tr key={`ua-int-${m.id}`} className="border-b hover:bg-violet-50/30 transition-colors">
                        <td className="px-3 py-1.5" />
                        <td className="px-3 py-1.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <Users2 size={11} className="text-violet-500 shrink-0" />
                            <Link
                              to={`/meetings/internal/${m.id}`}
                              className="text-xs text-muted-foreground hover:text-brand transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              {m.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 align-middle"><TypeBadge type="internal_meeting" /></td>
                        <td className="px-3 py-1.5 align-middle">
                          {m.status
                            ? <StatusBadge status={m.status.name} color={m.status.color} />
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-3 py-1.5 align-middle">
                          <StatusUpdateCell
                            currentStatusId={m.status_id}
                            currentDate={m.status_date ?? null}
                            statuses={statuses}
                            onSave={(sid, d) => saveIntMeeting(m, sid, d)}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-center align-middle">
                          <StatusHistoryModal entityType="internal_meeting" entityId={m.id} entityTitle={m.title} />
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
