import { useMemo, useState } from 'react'
import { Search, Database, RefreshCw, ExternalLink } from 'lucide-react'
import { useDataWarehouse, type BigPushProject } from '@/hooks/useDataWarehouse'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Progress badge ───────────────────────────────────────────────────────────

function ProgressBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-zinc-300">—</span>

  // Extract numeric percentage if present
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/)
  const pct = match ? parseFloat(match[1]) : null

  const color =
    pct === null ? 'text-zinc-600 bg-zinc-100' :
    pct >= 75 ? 'text-green-700 bg-green-50' :
    pct >= 40 ? 'text-amber-700 bg-amber-50' :
    'text-red-700 bg-red-50'

  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      {pct !== null && (
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400')}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
      <span className={cn('text-[0.68rem] font-semibold px-1.5 py-0.5 rounded-full shrink-0', color)}>
        {value}
      </span>
    </div>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

function ProjectRow({ project, index }: { project: BigPushProject; index: number }) {
  return (
    <tr className={cn('border-b last:border-0 hover:bg-zinc-50/60 transition-colors', index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30')}>
      <td className="px-4 py-3 text-xs font-medium text-zinc-800 max-w-[220px]">
        <div className="flex items-start gap-1.5">
          {project.source_url ? (
            <a
              href={project.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1 group hover:text-brand transition-colors"
            >
              <span className="leading-snug">{project.title}</span>
              <ExternalLink size={10} className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
            </a>
          ) : (
            <span className="leading-snug">{project.title}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-700 max-w-[180px]">
        <span className="leading-snug">{project.contractor ?? <span className="text-zinc-300">—</span>}</span>
      </td>
      <td className="px-4 py-3 text-xs font-mono text-zinc-800 whitespace-nowrap">
        {project.contract_sum ?? <span className="text-zinc-300">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
        {project.start_date ?? <span className="text-zinc-300">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
        {project.exp_completion_date ?? <span className="text-zinc-300">—</span>}
      </td>
      <td className="px-4 py-3">
        <ProgressBadge value={project.current_progress} />
      </td>
      <td className="px-4 py-3 text-xs">
        {project.agency ? (
          <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-brand/10 text-brand">
            {project.agency}
          </span>
        ) : <span className="text-zinc-300">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-zinc-600">
        {project.region ?? <span className="text-zinc-300">—</span>}
      </td>
    </tr>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="rounded-xl border overflow-hidden">
        <Skeleton className="h-10 w-full rounded-none" />
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none border-t" />
        ))}
      </div>
    </div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
        active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80',
      )}
    >
      {label}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type SortCol = 'title' | 'contractor' | 'agency' | 'region' | 'progress'
type SortDir = 'asc' | 'desc'

function SortTh({
  col, label, className, activeCol, activeDir, onSort,
}: {
  col: SortCol; label: string; className?: string
  activeCol: SortCol; activeDir: SortDir; onSort: (c: SortCol) => void
}) {
  const active = activeCol === col
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-zinc-500 cursor-pointer select-none whitespace-nowrap hover:text-zinc-800 transition-colors',
        active && 'text-zinc-800',
        className,
      )}
      onClick={() => onSort(col)}
    >
      {label}
      <span className="ml-1 opacity-50">{active ? (activeDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )
}

export function DataWarehouse() {
  const { data: projects = [], isLoading, error, refetch, isFetching } = useDataWarehouse()

  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string | null>(null)
  const [agencyFilter, setAgencyFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'title', dir: 'asc' })

  const regions = useMemo(() => {
    const set = new Set(projects.map(p => p.region).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [projects])

  const agencies = useMemo(() => {
    const set = new Set(projects.map(p => p.agency).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [projects])

  const filtered = useMemo(() => {
    let list = [...projects]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          (p.contractor ?? '').toLowerCase().includes(q) ||
          (p.agency ?? '').toLowerCase().includes(q) ||
          (p.region ?? '').toLowerCase().includes(q),
      )
    }

    if (regionFilter) list = list.filter(p => p.region === regionFilter)
    if (agencyFilter) list = list.filter(p => p.agency === agencyFilter)

    list.sort((a, b) => {
      let av = '', bv = ''
      if (sort.col === 'title') { av = a.title; bv = b.title }
      else if (sort.col === 'contractor') { av = a.contractor ?? ''; bv = b.contractor ?? '' }
      else if (sort.col === 'agency') { av = a.agency ?? ''; bv = b.agency ?? '' }
      else if (sort.col === 'region') { av = a.region ?? ''; bv = b.region ?? '' }
      else if (sort.col === 'progress') {
        const extractPct = (p: BigPushProject) => {
          const m = (p.current_progress ?? '').match(/(\d+(?:\.\d+)?)/)
          return m ? parseFloat(m[1]) : -1
        }
        return sort.dir === 'asc' ? extractPct(a) - extractPct(b) : extractPct(b) - extractPct(a)
      }
      const cmp = av.localeCompare(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return list
  }, [projects, search, regionFilter, agencyFilter, sort])

  function toggleSort(col: SortCol) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Data Warehouse"
        subtitle={`Big Push Infrastructure Programme · ${projects.length} projects`}
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
            Refresh
          </button>
        }
      />

      {/* Source attribution */}
      <div className="flex items-center gap-2 text-xs text-zinc-400 -mt-2">
        <Database size={11} />
        <span>Source: Ministry of Roads &amp; Highways — Big Push Infrastructure Programme</span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-red-700">Failed to load project data</p>
          <p className="text-xs text-red-500">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search projects, contractors, agencies…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {filtered.length} of {projects.length} projects
              </span>
            </div>

            {/* Region filters */}
            {regions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400 mr-1">Region:</span>
                <FilterPill label="All" active={regionFilter === null} onClick={() => setRegionFilter(null)} />
                {regions.map(r => (
                  <FilterPill key={r} label={r} active={regionFilter === r} onClick={() => setRegionFilter(r === regionFilter ? null : r)} />
                ))}
              </div>
            )}

            {/* Agency filters */}
            {agencies.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400 mr-1">Agency:</span>
                <FilterPill label="All" active={agencyFilter === null} onClick={() => setAgencyFilter(null)} />
                {agencies.map(a => (
                  <FilterPill key={a} label={a} active={agencyFilter === a} onClick={() => setAgencyFilter(a === agencyFilter ? null : a)} />
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-zinc-50 border-b">
                    <SortTh col="title" label="Project" className="min-w-[200px]" activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    <SortTh col="contractor" label="Contractor" className="min-w-[160px]" activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Contract Sum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Start Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Exp. Completion</th>
                    <SortTh col="progress" label="Progress" activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    <SortTh col="agency" label="Agency" activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    <SortTh col="region" label="Region" activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((p, i) => <ProjectRow key={p.id} project={p} index={i} />)
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-400">
                        {search || regionFilter || agencyFilter
                          ? 'No projects match your filters'
                          : 'No project data loaded yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer row */}
            {filtered.length > 0 && (
              <div className="px-4 py-2.5 bg-zinc-50 border-t flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Showing {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-zinc-400">
                  Big Push Infrastructure Programme · Ministry of Roads &amp; Highways
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
