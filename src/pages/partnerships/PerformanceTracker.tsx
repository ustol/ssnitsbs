import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { usePartnerships } from '@/hooks/usePartnerships'
import { useSettings } from '@/hooks/useSettings'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { PartnershipWithRelations, StatusLookup } from '@/types/database'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

interface CardProps {
  partnership: PartnershipWithRelations
  bestPct: number
  worstPct: number
}

function PartnershipCard({ partnership, bestPct, worstPct }: CardProps) {
  const expected = partnership.proposed_value ?? 0
  const best = Math.round(expected * bestPct / 100)
  const worst = Math.round(expected * worstPct / 100)
  const status = partnership.status as StatusLookup | null
  const accentColor = status?.color ?? '#E8621A'
  const hasNumbers = expected > 0

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div className="w-full rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-150">
        {/* Status accent bar */}
        <div className="h-[3px]" style={{ background: accentColor }} />

        <div className="px-5 pt-5 pb-5">
          {/* Expected — hero number */}
          <div className="text-center mb-5">
            <p
              className={cn(
                'font-extrabold tabular-nums leading-none tracking-tight',
                hasNumbers ? 'text-4xl text-zinc-900' : 'text-2xl text-zinc-300',
              )}
            >
              {hasNumbers ? fmt(expected) : '—'}
            </p>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-zinc-400 mt-2">
              Expected Registrations
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-100 mb-4" />

          {/* Best case */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.72rem] font-medium text-zinc-500">
                  Best Case
                  <span className="ml-1 text-zinc-400">({bestPct}%)</span>
                </span>
                <span className="text-sm font-bold tabular-nums text-green-600">
                  {hasNumbers ? fmt(best) : '—'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${bestPct}%` }}
                />
              </div>
            </div>

            {/* Worst case */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.72rem] font-medium text-zinc-500">
                  Worst Case
                  <span className="ml-1 text-zinc-400">({worstPct}%)</span>
                </span>
                <span className="text-sm font-bold tabular-nums text-amber-600">
                  {hasNumbers ? fmt(worst) : '—'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${worstPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status pill */}
          {status && (
            <div className="mt-4 flex justify-center">
              <span
                className="text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: `${accentColor}22`, color: accentColor }}
              >
                {status.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Partnership name — below card, centred */}
      <div className="mt-3 text-center px-1 w-full">
        <p className="text-sm font-semibold text-zinc-800 leading-snug">{partnership.title}</p>
        {partnership.organization && (
          <p className="text-xs text-zinc-400 mt-0.5">{partnership.organization}</p>
        )}
      </div>
    </div>
  )
}

type SortKey = 'expected-desc' | 'expected-asc' | 'name'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'expected-desc', label: 'Expected ↓' },
  { value: 'expected-asc', label: 'Expected ↑' },
  { value: 'name', label: 'Name A–Z' },
]

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PerformanceTracker() {
  const { data: partnerships = [], isLoading: loadingP } = usePartnerships()
  const { data: settings = {}, isLoading: loadingS } = useSettings()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('expected-desc')

  const isLoading = loadingP || loadingS
  const bestPct = Number(settings.best_case_pct ?? 60)
  const worstPct = Number(settings.worst_case_pct ?? 30)

  const allPartnerships = partnerships as PartnershipWithRelations[]

  const filtered = useMemo(() => {
    let list = search
      ? allPartnerships.filter(
          p =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            (p.organization ?? '').toLowerCase().includes(search.toLowerCase()),
        )
      : [...allPartnerships]

    if (sortBy === 'expected-desc') {
      list.sort((a, b) => (b.proposed_value ?? 0) - (a.proposed_value ?? 0))
    } else if (sortBy === 'expected-asc') {
      list.sort((a, b) => (a.proposed_value ?? 0) - (b.proposed_value ?? 0))
    } else {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }

    return list
  }, [allPartnerships, search, sortBy])

  const totalExpected = allPartnerships.reduce((s, p) => s + (p.proposed_value ?? 0), 0)
  const totalBest = Math.round(totalExpected * bestPct / 100)
  const totalWorst = Math.round(totalExpected * worstPct / 100)
  const withNumbers = allPartnerships.filter(p => (p.proposed_value ?? 0) > 0).length

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Performance Tracker"
        subtitle={`${allPartnerships.length} partnerships · ${withNumbers} with targets set`}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-white">
          <p className="text-xs font-medium text-zinc-500">Total Expected</p>
          <p className="text-2xl font-bold tabular-nums text-zinc-900 mt-1">
            {fmt(totalExpected)}
          </p>
        </div>
        <div className="p-4 rounded-xl border bg-white">
          <p className="text-xs font-medium text-zinc-500">
            Best Case <span className="text-zinc-400 font-normal">({bestPct}%)</span>
          </p>
          <p className="text-2xl font-bold tabular-nums text-green-600 mt-1">{fmt(totalBest)}</p>
        </div>
        <div className="p-4 rounded-xl border bg-white">
          <p className="text-xs font-medium text-zinc-500">
            Worst Case <span className="text-zinc-400 font-normal">({worstPct}%)</span>
          </p>
          <p className="text-2xl font-bold tabular-nums text-amber-600 mt-1">{fmt(totalWorst)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search partnerships…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                sortBy === opt.value
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          {search ? 'No partnerships match your search' : 'No partnerships found'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8">
          {filtered.map(p => (
            <PartnershipCard
              key={p.id}
              partnership={p}
              bestPct={bestPct}
              worstPct={worstPct}
            />
          ))}
        </div>
      )}
    </div>
  )
}
