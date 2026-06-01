import { useMemo, useState } from 'react'
import {
  HardHat, GitMerge, X, Settings2, ChevronRight,
  UserPlus, ClipboardCheck, Pencil, Trash2, Plus, Loader2,
} from 'lucide-react'
import {
  useDataWarehouse, useProjectActivities, buildActivitySummaries,
  useLogActivity, useUpdateActivity, useDeleteActivity,
  type BigPushProject, type ActivityEntry,
} from '@/hooks/useDataWarehouse'
import { useSettings, useUpdateSetting } from '@/hooks/useSettings'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Registration modal ───────────────────────────────────────────────────────

interface RegModalProps {
  project: BigPushProject
  existing?: ActivityEntry
  onClose: () => void
}

function RegistrationModal({ project, existing, onClose }: RegModalProps) {
  const today  = new Date().toISOString().split('T')[0]
  const isEdit = !!existing
  const [value, setValue] = useState(existing ? String(existing.value) : '')
  const [date,  setDate]  = useState(existing?.date ?? today)
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const { mutateAsync: log,    isPending: isLogging   } = useLogActivity()
  const { mutateAsync: update, isPending: isUpdating  } = useUpdateActivity()
  const isPending = isLogging || isUpdating

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(value.replace(/,/g, ''), 10)
    if (isNaN(num) || num < 0) { toast.error('Enter a valid whole number'); return }
    try {
      if (isEdit) {
        await update({ id: existing.id, value: num, activity_date: date, notes: notes || null })
        toast.success('Registration updated')
      } else {
        await log({ project_id: project.id, activity_type: 'registration', value: num, activity_date: date, notes: notes || undefined })
        toast.success('Registration logged')
      }
      onClose()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-xl border shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <UserPlus size={15} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{isEdit ? 'Edit' : 'Add'} Registration</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{project.title}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Count (registrations) <span className="text-red-400">*</span></label>
            <Input type="number" min="0" step="1" placeholder="0" value={value}
              onChange={e => setValue(e.target.value)} required className="h-9 text-sm" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Date <span className="text-red-400">*</span></label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              required max={today} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Notes <span className="text-zinc-400 font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context…" rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 h-9 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Inspection modal ─────────────────────────────────────────────────────────

interface InspModalProps {
  project: BigPushProject
  existing?: ActivityEntry
  onClose: () => void
}

function InspectionModal({ project, existing, onClose }: InspModalProps) {
  const today  = new Date().toISOString().split('T')[0]
  const isEdit = !!existing
  const [date,  setDate]  = useState(existing?.date ?? today)
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const { mutateAsync: log,    isPending: isLogging   } = useLogActivity()
  const { mutateAsync: update, isPending: isUpdating  } = useUpdateActivity()
  const isPending = isLogging || isUpdating

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (isEdit) {
        await update({ id: existing.id, value: 1, activity_date: date, notes: notes || null })
        toast.success('Inspection updated')
      } else {
        await log({ project_id: project.id, activity_type: 'inspection', value: 1, activity_date: date, notes: notes || undefined })
        toast.success('Inspection logged')
      }
      onClose()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-xl border shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <ClipboardCheck size={15} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{isEdit ? 'Edit' : 'Add'} Inspection</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{project.title}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Inspection Date <span className="text-red-400">*</span></label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              required max={today} className="h-9 text-sm" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Notes <span className="text-zinc-400 font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context…" rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 h-9 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Alias modal ──────────────────────────────────────────────────────────────

interface AliasModalProps {
  allContractors: string[]
  aliasMap: Record<string, string>
  onSave: (newMap: Record<string, string>) => Promise<void>
  onClose: () => void
}

function AliasModal({ allContractors, aliasMap, onSave, onClose }: AliasModalProps) {
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [canonical,  setCanonical]  = useState('')
  const [isPending,  setIsPending]  = useState(false)

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) { next.delete(name); if (canonical === name) setCanonical('') }
      else { next.add(name); if (!canonical) setCanonical(name) }
      return next
    })
  }

  async function handleMerge() {
    if (selected.size < 2 || !canonical) return
    const newMap = { ...aliasMap }
    for (const name of selected) {
      if (name === canonical) delete newMap[name]
      else newMap[name] = canonical
    }
    setIsPending(true)
    try { await onSave(newMap); setSelected(new Set()); setCanonical('') }
    finally { setIsPending(false) }
  }

  async function handleRemove(raw: string) {
    const newMap = { ...aliasMap }; delete newMap[raw]
    setIsPending(true)
    try { await onSave(newMap) } finally { setIsPending(false) }
  }

  const existingAliases = Object.entries(aliasMap)

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-xl border shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
            <GitMerge size={15} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Manage Contractor Aliases</p>
            <p className="text-xs text-zinc-500 mt-0.5">Select names to merge into one canonical name</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            {allContractors.length} contractors — tick names to merge
          </p>
          <div className="space-y-0.5">
            {allContractors.map(name => (
              <label key={name} className={cn(
                'flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors border',
                selected.has(name) ? 'bg-brand/5 border-brand/20' : 'hover:bg-zinc-50 border-transparent',
              )}>
                <input type="checkbox" checked={selected.has(name)} onChange={() => toggle(name)} className="w-3.5 h-3.5 accent-brand shrink-0" />
                <span className="text-sm text-zinc-800 flex-1 min-w-0 truncate">{name}</span>
                {aliasMap[name] && <span className="text-[10px] text-zinc-400 shrink-0 truncate max-w-[120px]">→ {aliasMap[name]}</span>}
              </label>
            ))}
          </div>
        </div>

        {selected.size >= 2 && (
          <div className="px-5 py-4 border-t bg-orange-50/60 space-y-3 shrink-0">
            <p className="text-xs font-semibold text-zinc-700">Merging {selected.size} names — choose the canonical (master) name:</p>
            <select value={canonical} onChange={e => setCanonical(e.target.value)}
              className="w-full h-9 rounded-md border border-zinc-200 text-sm px-3 bg-white focus:outline-none focus:ring-1 focus:ring-brand">
              <option value="">Select canonical name…</option>
              {Array.from(selected).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {canonical && <p className="text-[11px] text-zinc-500">All others will redirect to: <strong className="text-zinc-800">{canonical}</strong></p>}
            <div className="flex gap-2">
              <button onClick={() => { setSelected(new Set()); setCanonical('') }}
                className="flex-1 h-8 rounded-md border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100">Clear</button>
              <button onClick={handleMerge} disabled={!canonical || isPending}
                className="flex-1 h-8 rounded-md bg-brand text-white text-xs font-semibold hover:bg-brand/90 disabled:opacity-40">
                {isPending ? 'Saving…' : 'Apply Merge'}
              </button>
            </div>
          </div>
        )}

        {existingAliases.length > 0 && (
          <div className="px-5 py-3 border-t shrink-0">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Active aliases ({existingAliases.length})</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {existingAliases.map(([raw, target]) => (
                <div key={raw} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-zinc-50 text-xs">
                  <span className="text-zinc-500 flex-1 truncate min-w-0">{raw}</span>
                  <span className="text-zinc-300 shrink-0">→</span>
                  <span className="text-zinc-800 font-medium shrink-0 truncate max-w-[140px]">{target}</span>
                  <button onClick={() => handleRemove(raw)} disabled={isPending}
                    className="shrink-0 p-0.5 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 ml-1 disabled:opacity-40">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 pb-4 pt-2 shrink-0 border-t">
          <button onClick={onClose} className="w-full h-9 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 font-medium">Done</button>
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveModal =
  | { kind: 'registration'; project: BigPushProject; existing?: ActivityEntry }
  | { kind: 'inspection';   project: BigPushProject; existing?: ActivityEntry }
  | null

// ─── Main page ────────────────────────────────────────────────────────────────

export function PerformanceTracker() {
  const { data: projects   = [], isLoading: loadingP } = useDataWarehouse()
  const { data: activities = [], isLoading: loadingA } = useProjectActivities()
  const { mutateAsync: deleteActivity } = useDeleteActivity()
  const { data: settings  } = useSettings()
  const { mutateAsync: updateSetting } = useUpdateSetting()

  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())
  const [aliasOpen,  setAliasOpen]  = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  const isLoading = loadingP || loadingA

  const aliasMap: Record<string, string> = useMemo(() => {
    try { return JSON.parse(settings?.contractor_alias_map ?? '{}') }
    catch { return {} }
  }, [settings])

  const allRawContractors = useMemo(() => {
    const s = new Set(projects.map(p => p.contractor?.trim()).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [projects])

  // Build contractor rows with per-project breakdown
  const rows = useMemo(() => {
    const summaries = buildActivitySummaries(activities)
    const map: Record<string, {
      contractor: string
      totalRegistrations: number
      totalInspections: number
      projects: { project: BigPushProject; registration: ActivityEntry | null; inspection: ActivityEntry | null }[]
    }> = {}

    for (const project of projects) {
      const raw = project.contractor?.trim()
      if (!raw) continue
      const canonical = aliasMap[raw] ?? raw
      if (!map[canonical]) map[canonical] = { contractor: canonical, totalRegistrations: 0, totalInspections: 0, projects: [] }
      const s = summaries[project.id]
      const reg  = s?.registration ?? null
      const insp = s?.inspection   ?? null
      map[canonical].totalRegistrations += reg?.value  ?? 0
      map[canonical].totalInspections   += insp?.value ?? 0
      map[canonical].projects.push({ project, registration: reg, inspection: insp })
    }

    return Object.values(map).sort((a, b) => a.contractor.localeCompare(b.contractor))
  }, [projects, activities, aliasMap])

  function toggleExpand(contractor: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(contractor) ? next.delete(contractor) : next.add(contractor)
      return next
    })
  }

  async function handleDelete(entry: ActivityEntry, label: string) {
    if (!window.confirm(`Delete this ${label} entry? This cannot be undone.`)) return
    try { await deleteActivity(entry.id); toast.success(`${label} deleted`) }
    catch (err) { toast.error((err as Error).message) }
  }

  async function saveAliasMap(newMap: Record<string, string>) {
    await updateSetting({ key: 'contractor_alias_map', value: JSON.stringify(newMap) })
    toast.success('Aliases updated')
  }

  const aliasCount = Object.keys(aliasMap).length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">Big Push Tracker</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Contractor activity — registrations &amp; inspections</p>
        </div>
        <button onClick={() => setAliasOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium text-zinc-600 hover:bg-zinc-50 shrink-0">
          <Settings2 size={12} />
          Manage Duplicates
          {aliasCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-brand text-white text-[10px] font-semibold">{aliasCount}</span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 w-8" />
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Contractor / Project</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-blue-500">Registration</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-purple-500">Inspection</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="px-4 py-3"><Skeleton className="h-3 w-3" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3 w-48" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td />
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <HardHat size={18} className="text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">No contractor data yet</p>
                      <p className="text-xs text-zinc-400">Add projects in the Data Warehouse to see them here</p>
                    </div>
                  </td>
                </tr>
              ) : rows.map((row, ri) => {
                const isOpen = expanded.has(row.contractor)
                return (
                  <>
                    {/* ── Contractor summary row ── */}
                    <tr
                      key={`c-${row.contractor}`}
                      className={cn(
                        'border-b border-zinc-100 cursor-pointer select-none',
                        ri % 2 === 0 ? 'bg-white' : 'bg-zinc-50/40',
                        'hover:bg-orange-50/30',
                      )}
                      onClick={() => toggleExpand(row.contractor)}
                    >
                      <td className="px-4 py-3 text-center">
                        <ChevronRight size={13} className={cn('text-zinc-400 transition-transform', isOpen && 'rotate-90')} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand shrink-0" />
                          <span className="text-xs font-semibold text-zinc-900">{row.contractor}</span>
                          <span className="text-[10px] text-zinc-400">{row.projects.length} project{row.projects.length !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold tabular-nums text-blue-600">
                        {row.totalRegistrations > 0 ? row.totalRegistrations.toLocaleString() : <span className="text-zinc-300 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold tabular-nums text-purple-600">
                        {row.totalInspections > 0 ? row.totalInspections.toLocaleString() : <span className="text-zinc-300 font-normal">—</span>}
                      </td>
                      <td />
                    </tr>

                    {/* ── Expanded project rows ── */}
                    {isOpen && row.projects.map(({ project, registration, inspection }) => (
                      <tr key={`p-${project.id}`} className="border-b border-zinc-100 bg-zinc-50/70">
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5 pl-10">
                          <span className="text-xs text-zinc-600">{project.title}</span>
                        </td>

                        {/* Registration cell */}
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {registration ? (
                              <>
                                <div className="text-right">
                                  <span className="text-xs font-semibold tabular-nums text-blue-600">{registration.value.toLocaleString()}</span>
                                  <p className="text-[10px] text-zinc-400">{registration.date}</p>
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); setActiveModal({ kind: 'registration', project, existing: registration }) }}
                                  className="p-1 rounded hover:bg-blue-50 text-zinc-400 hover:text-blue-600"
                                  title="Edit registration"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDelete(registration, 'Registration') }}
                                  className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500"
                                  title="Delete registration"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); setActiveModal({ kind: 'registration', project }) }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-blue-200 text-[10px] text-blue-500 hover:bg-blue-50"
                              >
                                <Plus size={10} /> Add
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Inspection cell */}
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inspection ? (
                              <>
                                <div className="text-right">
                                  <span className="text-xs font-semibold tabular-nums text-purple-600">{inspection.date}</span>
                                  <p className="text-[10px] text-zinc-400">Last inspected</p>
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); setActiveModal({ kind: 'inspection', project, existing: inspection }) }}
                                  className="p-1 rounded hover:bg-purple-50 text-zinc-400 hover:text-purple-600"
                                  title="Edit inspection"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDelete(inspection, 'Inspection') }}
                                  className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500"
                                  title="Delete inspection"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); setActiveModal({ kind: 'inspection', project }) }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-purple-200 text-[10px] text-purple-500 hover:bg-purple-50"
                              >
                                <Plus size={10} /> Add
                              </button>
                            )}
                          </div>
                        </td>
                        <td />
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
            <span className="text-[11px] text-zinc-400">
              {rows.length} contractor{rows.length !== 1 ? 's' : ''}
              {aliasCount > 0 && ` · ${aliasCount} alias${aliasCount !== 1 ? 'es' : ''} active`}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal?.kind === 'registration' && (
        <RegistrationModal
          key={`reg-${activeModal.project.id}-${activeModal.existing?.id ?? 'new'}`}
          project={activeModal.project}
          existing={activeModal.existing}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal?.kind === 'inspection' && (
        <InspectionModal
          key={`insp-${activeModal.project.id}-${activeModal.existing?.id ?? 'new'}`}
          project={activeModal.project}
          existing={activeModal.existing}
          onClose={() => setActiveModal(null)}
        />
      )}
      {aliasOpen && (
        <AliasModal
          allContractors={allRawContractors}
          aliasMap={aliasMap}
          onSave={saveAliasMap}
          onClose={() => setAliasOpen(false)}
        />
      )}
    </div>
  )
}
