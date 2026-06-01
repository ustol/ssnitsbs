import { useMemo } from 'react'
import { HardHat } from 'lucide-react'
import { useDataWarehouse, useProjectActivities, buildActivitySummaries } from '@/hooks/useDataWarehouse'
import { Skeleton } from '@/components/ui/skeleton'

export function PerformanceTracker() {
  const { data: projects = [], isLoading: loadingP } = useDataWarehouse()
  const { data: activities = [], isLoading: loadingA } = useProjectActivities()

  const isLoading = loadingP || loadingA

  // Aggregate registration and inspection totals per unique contractor
  const rows = useMemo(() => {
    const summaries = buildActivitySummaries(activities)

    const map: Record<string, { contractor: string; registrations: number; inspections: number }> = {}

    for (const project of projects) {
      const contractor = project.contractor?.trim()
      if (!contractor) continue

      if (!map[contractor]) {
        map[contractor] = { contractor, registrations: 0, inspections: 0 }
      }

      const s = summaries[project.id]
      map[contractor].registrations += s?.registration?.value ?? 0
      map[contractor].inspections   += s?.inspection?.value  ?? 0
    }

    return Object.values(map).sort((a, b) => a.contractor.localeCompare(b.contractor))
  }, [projects, activities])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-zinc-900">Big Push Tracker</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Contractor activity — registrations &amp; inspections</p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Contractor
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Registration
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Inspection
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-48" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><Skeleton className="h-3 w-16 ml-auto" /></td>
                    </tr>
                  ))}
                </>
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
              ) : (
                rows.map((row, i) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
            <span className="text-[11px] text-zinc-400">
              {rows.length} contractor{rows.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
