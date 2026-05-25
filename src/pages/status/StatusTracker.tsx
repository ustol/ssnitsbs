import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Network, Building2, Users2, History } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePartnerships, useUpdatePartnership } from '@/hooks/usePartnerships'
import { useExternalMeetings, useInternalMeetings } from '@/hooks/useMeetings'
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

function StatusHistoryModal({ entityId, entityTitle }: {
  entityId: string
  entityTitle: string
}) {
  const [open, setOpen] = useState(false)
  const { data: history = [], isLoading } = useStatusHistory('partnership', entityId, open)

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

// ─── Main page ─────────────────────────────────────────────────────────────

export function StatusTracker() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const q = search.toLowerCase()

  const { data: allStatuses = [] } = useStatusLookup()
  const statuses = allStatuses as StatusLookup[]

  const { data: partnerships = [], isLoading: loadingP } = usePartnerships()
  const updatePartnership = useUpdatePartnership()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: extMeetings = [] } = useExternalMeetings() as { data: any[] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: intMeetings = [] } = useInternalMeetings() as { data: any[] }

  const createHistory = useCreateStatusHistory()

  // Group meetings by partnership_id, sorted newest first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extByPartnership = useMemo<Record<string, any[]>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: Record<string, any[]> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of extMeetings) {
      if (!m.partnership_id) continue
      ;(map[m.partnership_id] ??= []).push(m)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a: { meeting_date: string | null }, b: { meeting_date: string | null }) =>
        (b.meeting_date ?? '') > (a.meeting_date ?? '') ? 1 : -1
      )
    }
    return map
  }, [extMeetings])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intByPartnership = useMemo<Record<string, any[]>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: Record<string, any[]> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of intMeetings) {
      if (!m.partnership_id) continue
      ;(map[m.partnership_id] ??= []).push(m)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a: { meeting_date: string | null }, b: { meeting_date: string | null }) =>
        (b.meeting_date ?? '') > (a.meeting_date ?? '') ? 1 : -1
      )
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
      // Also match if any of the partnership's meetings match the search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extHit = (extByPartnership[p.id] ?? []).some((m: any) => m.title?.toLowerCase().includes(q))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intHit = (intByPartnership[p.id] ?? []).some((m: any) => m.title?.toLowerCase().includes(q))
      return extHit || intHit
    })
  }, [partnerships, extByPartnership, intByPartnership, q])

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

  const isLoading = loadingP

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Status Tracker"
        subtitle="Assign or update the engagement status for partnerships"
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
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-[44px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Partnership / Meetings</th>
              <th className="w-[180px] px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Current Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Update Status / Date</th>
              <th className="w-[64px] px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">History</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            ) : filteredPartnerships.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  {q ? 'No results match your search.' : 'No partnerships found.'}
                </td>
              </tr>
            ) : (
              filteredPartnerships.map((p, pi) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pExt: any[] = extByPartnership[p.id] ?? []
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pInt: any[] = intByPartnership[p.id] ?? []

                // If search matched a meeting, filter which meetings to show; otherwise show all
                const showAllMeetings = !q || p.title?.toLowerCase().includes(q) || p.organization?.toLowerCase().includes(q)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const visibleExt = showAllMeetings ? pExt : pExt.filter((m: any) => m.title?.toLowerCase().includes(q))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const visibleInt = showAllMeetings ? pInt : pInt.filter((m: any) => m.title?.toLowerCase().includes(q))

                return (
                  <React.Fragment key={p.id}>
                    {/* Partnership row */}
                    <tr className="border-b bg-muted/20 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums text-center align-middle">
                        {pi + 1}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
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
                      <td className="px-3 py-2.5 align-middle">
                        {p.status
                          ? <StatusBadge status={p.status.name} color={p.status.color} />
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <StatusUpdateCell
                          currentStatusId={p.status_id}
                          currentDate={p.status_date ?? null}
                          statuses={statuses}
                          onSave={(sid, d) => savePartnership(p, sid, d)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <StatusHistoryModal entityId={p.id} entityTitle={p.title} />
                      </td>
                    </tr>

                    {/* External meeting activity rows — read-only */}
                    {visibleExt.map((m: { id: string; title: string; meeting_date: string | null }) => (
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
                            {m.meeting_date && (
                              <span className="text-xs text-zinc-400 ml-1.5 shrink-0">· {fmtDate(m.meeting_date)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 align-middle">
                          <span className="text-[0.68rem] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full whitespace-nowrap">External Mtg</span>
                        </td>
                        <td className="px-3 py-1.5" colSpan={2} />
                      </tr>
                    ))}

                    {/* Internal meeting activity rows — read-only */}
                    {visibleInt.map((m: { id: string; title: string; meeting_date: string | null }) => (
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
                            {m.meeting_date && (
                              <span className="text-xs text-zinc-400 ml-1.5 shrink-0">· {fmtDate(m.meeting_date)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 align-middle">
                          <span className="text-[0.68rem] font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full whitespace-nowrap">Internal Mtg</span>
                        </td>
                        <td className="px-3 py-1.5" colSpan={2} />
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
