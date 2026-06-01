import { useMemo, useState } from 'react'
import { HardHat, GitMerge, X, Settings2 } from 'lucide-react'
import { useDataWarehouse, useProjectActivities, buildActivitySummaries } from '@/hooks/useDataWarehouse'
import { useSettings, useUpdateSetting } from '@/hooks/useSettings'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// ─── Alias modal ──────────────────────────────────────────────────────────────

interface AliasModalProps {
  allContractors: string[]
  aliasMap: Record<string, string>
  onSave: (newMap: Record<string, string>) => Promise<void>
  onClose: () => void
}

function AliasModal({ allContractors, aliasMap, onSave, onClose }: AliasModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [canonical, setCanonical] = useState('')
  const [isPending, setIsPending] = useState(false)

  function toggle(name: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
        if (canonical === name) setCanonical('')
      } else {
        next.add(name)
        if (!canonical) setCanonical(name)
      }
      return next
    })
  }

  async function handleMerge() {
    if (selected.size < 2 || !canonical) return
    const newMap = { ...aliasMap }
    for (const name of selected) {
      if (name === canonical) {
        delete newMap[name]      // canonical should not point to itself
      } else {
        newMap[name] = canonical // all others point to canonical
      }
    }
    setIsPending(true)
    try { await onSave(newMap); setSelected(new Set()); setCanonical('') }
    finally { setIsPending(false) }
  }

  async function handleRemove(raw: string) {
    const newMap = { ...aliasMap }
    delete newMap[raw]
    setIsPending(true)
    try { await onSave(newMap) }
    finally { setIsPending(false) }
  }

  const existingAliases = Object.entries(aliasMap)
  const selectedArr = Array.from(selected)

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-xl border shadow-xl overflow-hidden flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
            <GitMerge size={15} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Manage Contractor Aliases</p>
            <p className="text-xs text-zinc-500 mt-0.5">Select names to merge into one canonical name</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
            <X size={15} />
          </button>
        </div>

        {/* Contractor list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            {allContractors.length} contractors — tick names to merge
          </p>
          <div className="space-y-0.5">
            {allContractors.map(name => {
              const aliasTarget = aliasMap[name]
              const isSelected  = selected.has(name)
              return (
                <label
                  key={name}
                  className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-brand/5 border border-brand/20' : 'hover:bg-zinc-50 border border-transparent'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(name)}
                    className="w-3.5 h-3.5 accent-brand shrink-0"
                  />
                  <span className="text-sm text-zinc-800 flex-1 min-w-0 truncate">{name}</span>
                  {aliasTarget && (
                    <span className="text-[10px] text-zinc-400 shrink-0 truncate max-w-[120px]">
                      → {aliasTarget}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </div>

        {/* Merge panel — visible when 2+ selected */}
        {selected.size >= 2 && (
          <div className="px-5 py-4 border-t bg-orange-50/60 space-y-3 shrink-0">
            <p className="text-xs font-semibold text-zinc-700">
              Merging {selected.size} names — choose the canonical (master) name:
            </p>
            <select
              value={canonical}
              onChange={e => setCanonical(e.target.value)}
              className="w-full h-9 rounded-md border border-zinc-200 text-sm px-3 bg-white focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">Select canonical name…</option>
              {selectedArr.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {canonical && (
              <p className="text-[11px] text-zinc-500">
                All other selected names will redirect to: <strong className="text-zinc-800">{canonical}</strong>
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setSelected(new Set()); setCanonical('') }}
                className="flex-1 h-8 rounded-md border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100"
              >
                Clear selection
              </button>
              <button
                onClick={handleMerge}
                disabled={!canonical || isPending}
                className="flex-1 h-8 rounded-md bg-brand text-white text-xs font-semibold hover:bg-brand/90 disabled:opacity-40"
              >
                {isPending ? 'Saving…' : 'Apply Merge'}
              </button>
            </div>
          </div>
        )}

        {/* Existing aliases */}
        {existingAliases.length > 0 && (
          <div className="px-5 py-3 border-t shrink-0">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Active aliases ({existingAliases.length})
            </p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {existingAliases.map(([raw, target]) => (
                <div key={raw} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-zinc-50 text-xs">
                  <span className="text-zinc-500 flex-1 truncate min-w-0">{raw}</span>
                  <span className="text-zinc-300 shrink-0">→</span>
                  <span className="text-zinc-800 font-medium shrink-0 truncate max-w-[140px]">{target}</span>
                  <button
                    onClick={() => handleRemove(raw)}
                    disabled={isPending}
                    className="shrink-0 p-0.5 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 ml-1 disabled:opacity-40"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer close */}
        <div className="px-5 pb-4 pt-2 shrink-0 border-t">
          <button
            onClick={onClose}
            className="w-full h-9 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PerformanceTracker() {
  const { data: projects  = [], isLoading: loadingP } = useDataWarehouse()
  const { data: activities = [], isLoading: loadingA } = useProjectActivities()
  const { data: settings }  = useSettings()
  const { mutateAsync: updateSetting } = useUpdateSetting()

  const [aliasOpen, setAliasOpen] = useState(false)

  const isLoading = loadingP || loadingA

  // Parse alias map from settings
  const aliasMap: Record<string, string> = useMemo(() => {
    try { return JSON.parse(settings?.contractor_alias_map ?? '{}') }
    catch { return {} }
  }, [settings])

  // All raw unique contractor names (for the alias modal)
  const allRawContractors = useMemo(() => {
    const s = new Set(projects.map(p => p.contractor?.trim()).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [projects])

  // Table rows: aggregate by canonical contractor name
  const rows = useMemo(() => {
    const summaries = buildActivitySummaries(activities)
    const map: Record<string, { contractor: string; registrations: number; inspections: number }> = {}

    for (const project of projects) {
      const raw = project.contractor?.trim()
      if (!raw) continue
      const canonical = aliasMap[raw] ?? raw

      if (!map[canonical]) map[canonical] = { contractor: canonical, registrations: 0, inspections: 0 }
      const s = summaries[project.id]
      map[canonical].registrations += s?.registration?.value ?? 0
      map[canonical].inspections   += s?.inspection?.value  ?? 0
    }

    return Object.values(map).sort((a, b) => a.contractor.localeCompare(b.contractor))
  }, [projects, activities, aliasMap])

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
        <button
          onClick={() => setAliasOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium text-zinc-600 hover:bg-zinc-50 shrink-0"
        >
          <Settings2 size={12} />
          Manage Duplicates
          {aliasCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-brand text-white text-[10px] font-semibold">
              {aliasCount}
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Contractor</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Registration</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-3 w-48" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <HardHat size={18} className="text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">No contractor data yet</p>
                      <p className="text-xs text-zinc-400">Add projects in the Data Warehouse to see them here</p>
                    </div>
                  </td>
                </tr>
              ) : rows.map((row, i) => (
                <tr key={row.contractor} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand shrink-0" />
                      <span className="text-xs font-medium text-zinc-900">{row.contractor}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-blue-600">
                    {row.registrations > 0 ? row.registrations.toLocaleString() : <span className="text-zinc-300 font-normal">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-purple-600">
                    {row.inspections > 0 ? row.inspections.toLocaleString() : <span className="text-zinc-300 font-normal">—</span>}
                  </td>
                </tr>
              ))}
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

      {/* Alias modal */}
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
