import { ReactNode, useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './EmptyState'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: string
  header: string
  cell: (row: T, index: number) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  toolbar?: ReactNode
  onRowClick?: (row: T) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading,
  searchable = true,
  searchPlaceholder = 'Search…',
  searchKeys = [],
  pageSize = 15,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  toolbar,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = searchable && query
    ? data.filter(row =>
        searchKeys.some(key => {
          const val = row[key]
          return typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase())
        })
      )
    : data

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  return (
    <div className="space-y-3">
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1) }}
                className="pl-8 h-8 text-xs"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50/80">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn('px-3 py-2.5 text-left text-xs font-medium text-muted-foreground', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map(col => (
                    <td key={col.key} className="px-3 py-2.5">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b last:border-0 transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-zinc-50' : 'hover:bg-zinc-50/60',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-3 py-2.5 text-[0.8125rem]', col.className)}>
                      {col.cell(row, start + i + 1)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2">Page {currentPage} of {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
