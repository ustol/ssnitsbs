import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, Clock, XCircle, Pencil, Trash2, RefreshCw, Search,
  ExternalLink, X, Save, Loader2, ListChecks,
} from 'lucide-react'
import {
  useActionPoints,
  useSyncActionPoints,
  useUpdateActionPoint,
  useDeleteActionPoint,
  type ActionPoint,
} from '@/hooks/useActionPoints'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'pending' | 'done' | 'failed' }) {
  if (status === 'done')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-green-50 text-green-700">
        <CheckCircle2 size={9} /> Done
      </span>
    )
  if (status === 'failed')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-red-50 text-red-700">
        <XCircle size={9} /> Failed
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-amber-50 text-amber-700">
      <Clock size={9} /> Pending
    </span>
  )
}

// ─── Meeting type badge ───────────────────────────────────────────────────────
function TypeBadge({ type }: { type: 'external' | 'internal' }) {
  return type === 'external' ? (
    <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-orange-50 text-brand">External</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-blue-50 text-blue-700">Internal</span>
  )
}

// ─── Update notes dialog (inline) ─────────────────────────────────────────────
function UpdateDialog({
  item,
  onClose,
}: {
  item: ActionPoint
  onClose: () => void
}) {
  const [notes, setNotes] = useState(item.notes ?? '')
  const { mutate: update, isPending } = useUpdateActionPoint()

  function handleSave() {
    update(
      { id: item.id, notes, content: item.content },
      {
        onSuccess: () => { toast.success('Notes saved'); onClose() },
        onError: () => toast.error('Failed to save notes'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-xl border shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <Pencil size={15} className="text-zinc-400" />
          <p className="text-sm font-semibold flex-1 min-w-0 truncate">Update Notes</p>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Action Point</p>
            <p className="text-sm text-zinc-700 bg-zinc-50 rounded-lg px-3 py-2 border">{item.content}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Notes / Update</p>
            <textarea
              className="w-full h-28 rounded-lg border px-3 py-2 text-sm text-zinc-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Add notes, context or follow-up details…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-md border text-sm text-zinc-600 hover:bg-zinc-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 h-9 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand/90 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Notes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function ActionPointTracker() {
  const { data: items = [], isLoading } = useActionPoints()
  const { mutate: sync, isPending: syncing } = useSyncActionPoints()
  const { mutate: update, isPending: updating } = useUpdateActionPoint()
  const { mutate: remove } = useDeleteActionPoint()

  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState<'all' | 'external' | 'internal'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [updateItem, setUpdateItem]   = useState<ActionPoint | null>(null)
  const [updatingId, setUpdatingId]   = useState<string | null>(null)

  // Auto-sync from meetings on first load
  useEffect(() => {
    sync()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = items.filter(item => {
    if (typeFilter !== 'all' && item.meeting_type !== typeFilter) return false
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        item.content.toLowerCase().includes(q) ||
        item.meeting_title.toLowerCase().includes(q) ||
        (item.notes ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const pendingCount = items.filter(i => i.status === 'pending').length
  const doneCount    = items.filter(i => i.status === 'done').length

  function handleSetStatus(item: ActionPoint, status: 'pending' | 'done' | 'failed') {
    if (item.status === status) return
    setUpdatingId(item.id)
    update(
      { id: item.id, status, content: item.content },
      {
        onSuccess: () => { toast.success(status === 'done' ? 'Marked as done' : 'Reset to pending') },
        onError:   () => toast.error('Failed to update status'),
        onSettled: () => setUpdatingId(null),
      },
    )
  }

  function handleDelete(id: string) {
    remove(id, {
      onSuccess: () => toast.success('Action point removed'),
      onError:   () => toast.error('Failed to remove'),
    })
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Action Point Tracker"
        subtitle={`${pendingCount} pending · ${doneCount} done`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync()}
            disabled={syncing}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw size={12} className={cn(syncing && 'animate-spin')} />
            Sync from Meetings
          </Button>
        }
      />

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',   value: items.length,  bg: 'bg-zinc-50',   text: 'text-zinc-800',  border: 'border-zinc-200'  },
          { label: 'Pending', value: pendingCount,   bg: 'bg-amber-50',  text: 'text-amber-700', border: 'border-amber-100' },
          { label: 'Done',    value: doneCount,      bg: 'bg-green-50',  text: 'text-green-700', border: 'border-green-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3 text-center`}>
            <p className={`text-2xl font-bold tabular-nums ${s.text}`}>{isLoading ? '—' : s.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search action points or meetings…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'pending', 'done'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
                statusFilter === s ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'external', 'internal'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
                typeFilter === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto shrink-0">{filtered.length} of {items.length}</span>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-zinc-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 w-[90px]">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 min-w-[160px]">Meeting</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 w-[100px]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Action Point</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 w-[90px]">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || syncing ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 mx-auto" /></td>
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((item, i) => {
                  const isUpdating = updatingId === item.id && updating
                  const meetingPath = item.meeting_type === 'external'
                    ? `/meetings/external/${item.meeting_id}`
                    : `/meetings/internal/${item.meeting_id}`

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'border-b last:border-0 transition-colors',
                        i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30',
                        item.status === 'done'   && 'opacity-50',
                        item.status === 'failed' && 'bg-red-50/40',
                      )}
                    >
                      {/* Type */}
                      <td className="px-4 py-3">
                        <TypeBadge type={item.meeting_type} />
                      </td>

                      {/* Meeting */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <Link
                          to={meetingPath}
                          className="flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-brand transition-colors group"
                        >
                          <span className="truncate">{item.meeting_title}</span>
                          <ExternalLink size={10} className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        {item.meeting_date
                          ? new Date(item.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : <span className="text-zinc-300">—</span>}
                      </td>

                      {/* Content */}
                      <td className="px-4 py-3">
                        <p className={cn(
                          'text-xs leading-snug',
                          item.status === 'done'   && 'line-through text-zinc-400',
                          item.status === 'failed' && 'line-through text-red-400',
                          item.status === 'pending' && 'text-zinc-800',
                        )}>
                          {item.content}
                        </p>
                        {item.notes && (
                          <p className="text-[10px] text-zinc-400 mt-0.5 italic">{item.notes}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Done */}
                          <button
                            onClick={() => handleSetStatus(item, 'done')}
                            disabled={isUpdating}
                            title="Mark as Done"
                            className={cn(
                              'p-1.5 rounded-md transition-colors',
                              item.status === 'done'
                                ? 'bg-green-100 text-green-600'
                                : 'text-zinc-300 hover:bg-green-50 hover:text-green-600',
                            )}
                          >
                            <CheckCircle2 size={15} />
                          </button>

                          {/* Pending */}
                          <button
                            onClick={() => handleSetStatus(item, 'pending')}
                            disabled={isUpdating}
                            title="Reset to Pending"
                            className={cn(
                              'p-1.5 rounded-md transition-colors',
                              item.status === 'pending'
                                ? 'bg-amber-100 text-amber-600'
                                : 'text-zinc-300 hover:bg-amber-50 hover:text-amber-600',
                            )}
                          >
                            <Clock size={15} />
                          </button>

                          {/* Failed */}
                          <button
                            onClick={() => handleSetStatus(item, 'failed')}
                            disabled={isUpdating}
                            title="Mark as Failed"
                            className={cn(
                              'p-1.5 rounded-md transition-colors',
                              item.status === 'failed'
                                ? 'bg-red-100 text-red-600'
                                : 'text-zinc-300 hover:bg-red-50 hover:text-red-500',
                            )}
                          >
                            <XCircle size={15} />
                          </button>

                          {/* Update notes */}
                          <button
                            onClick={() => setUpdateItem(item)}
                            title="Add / Edit Notes"
                            className="p-1.5 rounded-md text-zinc-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(item.id)}
                            title="Remove"
                            className="p-1.5 rounded-md text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <ListChecks size={28} className="mx-auto text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-400">
                      {search || statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'No action points match your filters'
                        : 'No action points found — add action points to your meetings to track them here'}
                    </p>
                    {!search && statusFilter === 'all' && typeFilter === 'all' && (
                      <div className="flex gap-2 justify-center mt-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/meetings/external/new">New External Meeting</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/meetings/internal/new">New Internal Meeting</Link>
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-2.5 bg-zinc-50 border-t flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Showing {filtered.length} action point{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-zinc-400">
              {pendingCount} pending · {doneCount} done
            </span>
          </div>
        )}
      </div>

      {/* Update notes dialog */}
      {updateItem && (
        <UpdateDialog item={updateItem} onClose={() => setUpdateItem(null)} />
      )}
    </div>
  )
}
