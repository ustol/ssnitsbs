import { useMemo, useState, useRef, useEffect } from 'react'
import { Search, Database, RefreshCw, ExternalLink, UserPlus, BadgeCheck, Wallet, X, Loader2, ClipboardCheck, Pencil, Trash2, Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  useDataWarehouse, useProjectActivities, buildActivitySummaries,
  useLogActivity, useUpdateActivity, useDeleteActivity,
  type BigPushProject, type ActivityType, type ActivityEntry,
} from '@/hooks/useDataWarehouse'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Activity log/edit modal ───────────────────────────────────────────────────

const ACTIVITY_META: Record<Exclude<ActivityType, 'inspection'>, { label: string; icon: React.ElementType; color: string; isCurrency: boolean }> = {
  registration: { label: 'Registrations', icon: UserPlus,   color: 'text-blue-600',  isCurrency: false },
  validation:   { label: 'Validations',   icon: BadgeCheck, color: 'text-green-600', isCurrency: true  },
  payment:      { label: 'Payments',      icon: Wallet,     color: 'text-amber-600', isCurrency: true  },
}

interface ActivityModalProps {
  open: boolean
  onClose: () => void
  project: BigPushProject
  activityType: Exclude<ActivityType, 'inspection'>
  existing?: ActivityEntry
}

function ActivityModal({ open, onClose, project, activityType, existing }: ActivityModalProps) {
  const meta = ACTIVITY_META[activityType]
  const today = new Date().toISOString().split('T')[0]
  const isEdit = !!existing

  const [value, setValue] = useState(existing ? String(existing.value) : '')
  const [date, setDate] = useState(existing?.date ?? today)
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const { mutateAsync: logActivity, isPending: isLogging } = useLogActivity()
  const { mutateAsync: updateActivity, isPending: isUpdating } = useUpdateActivity()
  const isPending = isLogging || isUpdating

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(value.replace(/,/g, ''))
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid number')
      return
    }
    try {
      if (isEdit) {
        await updateActivity({ id: existing.id, value: num, activity_date: date, notes: notes || null })
        toast.success(`${meta.label} updated`)
      } else {
        await logActivity({ project_id: project.id, activity_type: activityType, value: num, activity_date: date, notes: notes || undefined })
        toast.success(`${meta.label} logged successfully`)
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-zinc-100')}>
            <meta.icon size={14} className={meta.color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{isEdit ? 'Edit' : 'Log'} {meta.label}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{project.title}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Value */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              {meta.isCurrency ? 'Amount (GHS)' : 'Count (registrations)'}
            </label>
            <div className="relative">
              {meta.isCurrency && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium pointer-events-none">
                  GHS
                </span>
              )}
              <Input
                type="number"
                min="0"
                step={meta.isCurrency ? '0.01' : '1'}
                placeholder={meta.isCurrency ? '0.00' : '0'}
                value={value}
                onChange={e => setValue(e.target.value)}
                required
                className={cn('h-9 text-sm', meta.isCurrency && 'pl-11')}
                autoFocus
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Date of Activity</label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              max={today}
              className="h-9 text-sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context…"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <meta.icon size={14} />}
            {isPending ? 'Saving…' : isEdit ? `Update ${meta.label}` : `Save ${meta.label}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Progress badge ────────────────────────────────────────────────────────────

function ProgressBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-zinc-300 text-xs">—</span>
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/)
  const pct = match ? parseFloat(match[1]) : null
  const color = pct === null ? 'text-zinc-600 bg-zinc-100'
    : pct >= 75 ? 'text-green-700 bg-green-50'
    : pct >= 40 ? 'text-amber-700 bg-amber-50'
    : 'text-red-700 bg-red-50'
  return (
    <div className="flex items-center gap-1.5 min-w-[90px]">
      {pct !== null && (
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full', pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400')}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
      <span className={cn('text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full shrink-0', color)}>
        {value}
      </span>
    </div>
  )
}

// ─── Activity cell ─────────────────────────────────────────────────────────────

function ActivityCell({
  activityType, projectId, summaries, onEdit, onDelete,
}: {
  activityType: Exclude<ActivityType, 'inspection'>
  projectId: string
  summaries: Record<string, { registration: ActivityEntry | null; validation: ActivityEntry | null; payment: ActivityEntry | null; inspection: ActivityEntry | null }>
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = ACTIVITY_META[activityType]
  const entry = summaries[projectId]?.[activityType] ?? null

  const fmt = (v: number) =>
    activityType === 'registration'
      ? v.toLocaleString()
      : `GHS ${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="flex items-center gap-1 group">
      <div className="flex flex-col min-w-0">
        {entry ? (
          <>
            <span className={cn('text-xs font-semibold tabular-nums', meta.color)}>{fmt(entry.value)}</span>
            <span className="text-[0.6rem] text-zinc-400 leading-tight">{entry.date}</span>
          </>
        ) : (
          <span className="text-zinc-300 text-xs">—</span>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {entry ? (
          <>
            <button onClick={onEdit} title={`Edit ${meta.label}`} className="p-0.5 rounded hover:bg-zinc-100">
              <Pencil size={11} className={cn(meta.color, 'opacity-70')} />
            </button>
            <button onClick={onDelete} title={`Delete ${meta.label}`} className="p-0.5 rounded hover:bg-red-50">
              <Trash2 size={11} className="text-red-400 opacity-70" />
            </button>
          </>
        ) : (
          <button onClick={onEdit} title={`Log ${meta.label}`} className="p-0.5 rounded hover:bg-zinc-100">
            <meta.icon size={12} className={cn(meta.color, 'opacity-70')} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Inspection modal ──────────────────────────────────────────────────────────

interface InspectionModalProps {
  open: boolean
  onClose: () => void
  project: BigPushProject
  existing?: ActivityEntry
}

function InspectionModal({ open, onClose, project, existing }: InspectionModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const isEdit = !!existing

  const [date, setDate] = useState(existing?.date ?? today)
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const { mutateAsync: logActivity, isPending: isLogging } = useLogActivity()
  const { mutateAsync: updateActivity, isPending: isUpdating } = useUpdateActivity()
  const isPending = isLogging || isUpdating

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (isEdit) {
        await updateActivity({ id: existing.id, value: 1, activity_date: date, notes: notes || null })
        toast.success('Inspection updated')
      } else {
        await logActivity({ project_id: project.id, activity_type: 'inspection', value: 1, activity_date: date, notes: notes || undefined })
        toast.success('Inspection logged successfully')
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-zinc-100">
            <ClipboardCheck size={14} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{isEdit ? 'Edit' : 'Log'} Inspection</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{project.title}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Inspection Date</label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              max={today}
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context…"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
            {isPending ? 'Saving…' : isEdit ? 'Update Inspection' : 'Save Inspection'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Inspection cell ───────────────────────────────────────────────────────────

function InspectionCell({ projectId, summaries, onEdit, onDelete }: {
  projectId: string
  summaries: Record<string, { inspection: ActivityEntry | null }>
  onEdit: () => void
  onDelete: () => void
}) {
  const entry = summaries[projectId]?.inspection ?? null
  return (
    <div className="flex items-center gap-1 group">
      <div className="flex flex-col min-w-0">
        {entry ? (
          <>
            <span className="text-xs font-semibold text-purple-600 tabular-nums">{entry.date}</span>
            <span className="text-[0.6rem] text-zinc-400 leading-tight">Last inspected</span>
          </>
        ) : (
          <span className="text-zinc-300 text-xs">—</span>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {entry ? (
          <>
            <button onClick={onEdit} title="Edit Inspection" className="p-0.5 rounded hover:bg-zinc-100">
              <Pencil size={11} className="text-purple-600 opacity-70" />
            </button>
            <button onClick={onDelete} title="Delete Inspection" className="p-0.5 rounded hover:bg-red-50">
              <Trash2 size={11} className="text-red-400 opacity-70" />
            </button>
          </>
        ) : (
          <button onClick={onEdit} title="Log Inspection" className="p-0.5 rounded hover:bg-zinc-100">
            <ClipboardCheck size={12} className="text-purple-600 opacity-70" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Download columns definition ─────────────────────────────────────────────

const DOWNLOAD_COLUMNS = [
  { key: 'title',               label: 'Project' },
  { key: 'contractor',          label: 'Contractor' },
  { key: 'contract_sum',        label: 'Contract Sum' },
  { key: 'start_date',          label: 'Start Date' },
  { key: 'exp_completion_date', label: 'Exp. Completion Date' },
  { key: 'current_progress',    label: 'Progress' },
  { key: 'agency',              label: 'Agency' },
  { key: 'region',              label: 'Region' },
] as const

type DownloadColKey = typeof DOWNLOAD_COLUMNS[number]['key']
type DownloadFormat = 'excel' | 'pdf'

// ─── Export helpers ───────────────────────────────────────────────────────────

function getRowValues(p: BigPushProject, cols: DownloadColKey[]): string[] {
  return cols.map(k => (p as unknown as Record<string, string | null>)[k] ?? '—')
}

function exportToExcel(rows: BigPushProject[], cols: DownloadColKey[]) {
  const headers = cols.map(k => DOWNLOAD_COLUMNS.find(c => c.key === k)!.label)
  const data = rows.map(p => getRowValues(p, cols))
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

  // Column widths
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Big Push Projects')
  XLSX.writeFile(wb, `big-push-projects-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function exportToPDF(rows: BigPushProject[], cols: DownloadColKey[]) {
  const doc = new jsPDF({ orientation: cols.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const headers = cols.map(k => DOWNLOAD_COLUMNS.find(c => c.key === k)!.label)

  doc.setFontSize(13)
  doc.setTextColor(24, 24, 27)
  doc.text('Big Push Infrastructure Programme', 14, 18)
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}   ·   ${rows.length} project${rows.length !== 1 ? 's' : ''}`, 14, 25)

  autoTable(doc, {
    startY: 31,
    head: [headers],
    body: rows.map(p => getRowValues(p, cols)),
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [232, 98, 26], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    tableLineColor: [228, 228, 231],
    tableLineWidth: 0.1,
  })

  doc.save(`big-push-projects-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── Download modal ───────────────────────────────────────────────────────────

interface DownloadModalProps {
  format: DownloadFormat
  rows: BigPushProject[]
  onClose: () => void
}

function DownloadModal({ format, rows, onClose }: DownloadModalProps) {
  const allKeys = DOWNLOAD_COLUMNS.map(c => c.key)
  const [selected, setSelected] = useState<Set<DownloadColKey>>(new Set(allKeys))

  function toggle(key: DownloadColKey) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handleDownload() {
    const cols = allKeys.filter(k => selected.has(k))
    if (cols.length === 0) { return }
    if (format === 'excel') exportToExcel(rows, cols)
    else exportToPDF(rows, cols)
    onClose()
  }

  const isExcel = format === 'excel'
  const Icon = isExcel ? FileSpreadsheet : FileText
  const accent = isExcel ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-xl border shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border', accent)}>
            <Icon size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Download as {isExcel ? 'Excel' : 'PDF'}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{rows.length} project{rows.length !== 1 ? 's' : ''} · select columns to include</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
            <X size={15} />
          </button>
        </div>

        {/* Column checkboxes */}
        <div className="px-5 py-4 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-700">Columns</p>
            <button
              className="text-[11px] text-brand hover:underline"
              onClick={() => setSelected(selected.size === allKeys.length ? new Set() : new Set(allKeys))}
            >
              {selected.size === allKeys.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          {DOWNLOAD_COLUMNS.map(col => (
            <label key={col.key} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-zinc-50 group">
              <input
                type="checkbox"
                checked={selected.has(col.key)}
                onChange={() => toggle(col.key)}
                className="w-3.5 h-3.5 accent-brand rounded"
              />
              <span className="text-sm text-zinc-700 group-hover:text-zinc-900">{col.label}</span>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-md border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={selected.size === 0}
            className={cn(
              'flex-1 h-9 rounded-md text-sm font-medium text-white flex items-center justify-center gap-2',
              isExcel ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300' : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300',
              selected.size === 0 && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Download size={13} />
            Download {isExcel ? 'Excel' : 'PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sort helpers ──────────────────────────────────────────────────────────────

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
        active && 'text-zinc-800', className,
      )}
      onClick={() => onSort(col)}
    >
      {label}
      <span className="ml-1 opacity-50">{active ? (activeDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )
}

// ─── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2"><Skeleton className="h-8 w-60" /><Skeleton className="h-8 w-28" /></div>
      <div className="rounded-xl border overflow-hidden">
        <Skeleton className="h-10 w-full rounded-none" />
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none border-t" />)}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type ModalState = { project: BigPushProject; type: ActivityType; existing?: ActivityEntry } | null

export function DataWarehouse() {
  const { data: projects = [], isLoading: loadingP, error, refetch, isFetching } = useDataWarehouse()
  const { data: activities = [], isLoading: loadingA } = useProjectActivities()
  const { mutateAsync: deleteActivity } = useDeleteActivity()

  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string | null>(null)
  const [agencyFilter, setAgencyFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'title', dir: 'asc' })
  const [modal, setModal] = useState<ModalState>(null)
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat | null>(null)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const downloadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activitySummaries = useMemo(() => buildActivitySummaries(activities), [activities])

  const regions = useMemo(() => {
    const s = new Set(projects.map(p => p.region).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [projects])

  const agencies = useMemo(() => {
    const s = new Set(projects.map(p => p.agency).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [projects])

  const filtered = useMemo(() => {
    let list = [...projects]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.contractor ?? '').toLowerCase().includes(q) ||
        (p.agency ?? '').toLowerCase().includes(q) ||
        (p.region ?? '').toLowerCase().includes(q),
      )
    }
    if (regionFilter) list = list.filter(p => p.region === regionFilter)
    if (agencyFilter) list = list.filter(p => p.agency === agencyFilter)

    list.sort((a, b) => {
      if (sort.col === 'progress') {
        const pct = (p: BigPushProject) => {
          const m = (p.current_progress ?? '').match(/(\d+(?:\.\d+)?)/)
          return m ? parseFloat(m[1]) : -1
        }
        return sort.dir === 'asc' ? pct(a) - pct(b) : pct(b) - pct(a)
      }
      const map: Record<SortCol, string> = {
        title: a.title, contractor: a.contractor ?? '', agency: a.agency ?? '', region: a.region ?? '', progress: '',
      }
      const bMap: Record<SortCol, string> = {
        title: b.title, contractor: b.contractor ?? '', agency: b.agency ?? '', region: b.region ?? '', progress: '',
      }
      const cmp = map[sort.col].localeCompare(bMap[sort.col])
      return sort.dir === 'asc' ? cmp : -cmp
    })

    return list
  }, [projects, search, regionFilter, agencyFilter, sort])

  function toggleSort(col: SortCol) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }

  async function handleDelete(entry: ActivityEntry, label: string) {
    if (!window.confirm(`Delete this ${label} entry? This cannot be undone.`)) return
    try {
      await deleteActivity(entry.id)
      toast.success(`${label} entry deleted`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const isLoading = loadingP || loadingA
  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Data Warehouse"
        subtitle={`Big Push Infrastructure Programme · ${projects.length} projects`}
        actions={
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
              Refresh
            </button>

            {/* Download dropdown */}
            <div ref={downloadRef} className="relative">
              <button
                onClick={() => setDownloadMenuOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                <Download size={12} />
                Download
                <ChevronDown size={11} className={cn('transition-transform', downloadMenuOpen && 'rotate-180')} />
              </button>

              {downloadMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg border shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => { setDownloadFormat('excel'); setDownloadMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <FileSpreadsheet size={13} className="text-green-600 shrink-0" />
                    Excel (.xlsx)
                  </button>
                  <div className="border-t" />
                  <button
                    onClick={() => { setDownloadFormat('pdf'); setDownloadMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <FileText size={13} className="text-red-600 shrink-0" />
                    PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      <div className="flex items-center gap-2 text-xs text-zinc-400 -mt-2">
        <Database size={11} />
        <span>Source: Ministry of Roads &amp; Highways — Big Push Infrastructure Programme</span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-red-700">Failed to load project data</p>
          <p className="text-xs text-red-500">{(error as Error).message}</p>
          <button onClick={() => refetch()} className="mt-2 px-4 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">Retry</button>
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
              <span className="text-xs text-muted-foreground shrink-0">{filtered.length} of {projects.length} projects</span>
            </div>

            {regions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400 mr-1">Region:</span>
                <FilterPill label="All" active={regionFilter === null} onClick={() => setRegionFilter(null)} />
                {regions.map(r => <FilterPill key={r} label={r} active={regionFilter === r} onClick={() => setRegionFilter(r === regionFilter ? null : r)} />)}
              </div>
            )}

            {agencies.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-400 mr-1">Agency:</span>
                <FilterPill label="All" active={agencyFilter === null} onClick={() => setAgencyFilter(null)} />
                {agencies.map(a => <FilterPill key={a} label={a} active={agencyFilter === a} onClick={() => setAgencyFilter(a === agencyFilter ? null : a)} />)}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="bg-zinc-50 border-b">
                    <SortTh col="title"      label="Project"        className="min-w-[200px]" activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    <SortTh col="contractor" label="Contractor"     className="min-w-[150px]" activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Contract Sum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Start Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Exp. Completion</th>
                    <SortTh col="progress"   label="Progress"       activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    <SortTh col="agency"     label="Agency"         activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    <SortTh col="region"     label="Region"         activeCol={sort.col} activeDir={sort.dir} onSort={toggleSort} />
                    {/* Activity columns */}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center gap-1"><UserPlus size={11} />Registrations</div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-green-600 whitespace-nowrap min-w-[140px]">
                      <div className="flex items-center gap-1"><BadgeCheck size={11} />Validations</div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-amber-600 whitespace-nowrap min-w-[140px]">
                      <div className="flex items-center gap-1"><Wallet size={11} />Payments</div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600 whitespace-nowrap min-w-[140px]">
                      <div className="flex items-center gap-1"><ClipboardCheck size={11} />Inspection</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map((p, i) => (
                    <tr key={p.id} className={cn('border-b last:border-0 hover:bg-zinc-50/60 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30')}>
                      {/* Project */}
                      <td className="px-4 py-3 text-xs font-medium text-zinc-800 max-w-[220px]">
                        {p.source_url ? (
                          <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1 group hover:text-brand transition-colors">
                            <span className="leading-snug">{p.title}</span>
                            <ExternalLink size={10} className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </a>
                        ) : (
                          <span className="leading-snug">{p.title}</span>
                        )}
                      </td>
                      {/* Contractor */}
                      <td className="px-4 py-3 text-xs text-zinc-700 max-w-[160px]">
                        <span className="leading-snug">{p.contractor ?? <span className="text-zinc-300">—</span>}</span>
                      </td>
                      {/* Contract Sum */}
                      <td className="px-4 py-3 text-xs font-mono text-zinc-800 whitespace-nowrap">
                        {p.contract_sum ?? <span className="text-zinc-300">—</span>}
                      </td>
                      {/* Start Date */}
                      <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                        {p.start_date ?? <span className="text-zinc-300">—</span>}
                      </td>
                      {/* Exp Completion */}
                      <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                        {p.exp_completion_date ?? <span className="text-zinc-300">—</span>}
                      </td>
                      {/* Progress */}
                      <td className="px-4 py-3"><ProgressBadge value={p.current_progress} /></td>
                      {/* Agency */}
                      <td className="px-4 py-3 text-xs">
                        {p.agency
                          ? <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-brand/10 text-brand">{p.agency}</span>
                          : <span className="text-zinc-300">—</span>}
                      </td>
                      {/* Region */}
                      <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                        {p.region ?? <span className="text-zinc-300">—</span>}
                      </td>
                      {/* Registrations */}
                      <td className="px-4 py-3">
                        <ActivityCell
                          activityType="registration" projectId={p.id} summaries={activitySummaries}
                          onEdit={() => setModal({ project: p, type: 'registration', existing: activitySummaries[p.id]?.registration ?? undefined })}
                          onDelete={() => { const e = activitySummaries[p.id]?.registration; if (e) handleDelete(e, 'Registrations') }}
                        />
                      </td>
                      {/* Validations */}
                      <td className="px-4 py-3">
                        <ActivityCell
                          activityType="validation" projectId={p.id} summaries={activitySummaries}
                          onEdit={() => setModal({ project: p, type: 'validation', existing: activitySummaries[p.id]?.validation ?? undefined })}
                          onDelete={() => { const e = activitySummaries[p.id]?.validation; if (e) handleDelete(e, 'Validations') }}
                        />
                      </td>
                      {/* Payments */}
                      <td className="px-4 py-3">
                        <ActivityCell
                          activityType="payment" projectId={p.id} summaries={activitySummaries}
                          onEdit={() => setModal({ project: p, type: 'payment', existing: activitySummaries[p.id]?.payment ?? undefined })}
                          onDelete={() => { const e = activitySummaries[p.id]?.payment; if (e) handleDelete(e, 'Payments') }}
                        />
                      </td>
                      {/* Inspection */}
                      <td className="px-4 py-3">
                        <InspectionCell
                          projectId={p.id} summaries={activitySummaries}
                          onEdit={() => setModal({ project: p, type: 'inspection', existing: activitySummaries[p.id]?.inspection ?? undefined })}
                          onDelete={() => { const e = activitySummaries[p.id]?.inspection; if (e) handleDelete(e, 'Inspection') }}
                        />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-sm text-zinc-400">
                        {search || regionFilter || agencyFilter ? 'No projects match your filters' : 'No project data loaded yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div className="px-4 py-2.5 bg-zinc-50 border-t flex items-center justify-between">
                <span className="text-xs text-zinc-400">Showing {filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
                <span className="text-xs text-zinc-400">Big Push Infrastructure Programme · Ministry of Roads &amp; Highways</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Activity log / edit modal */}
      {modal && modal.type !== 'inspection' && (
        <ActivityModal
          key={`${modal.project.id}-${modal.type}-${modal.existing?.id ?? 'new'}`}
          open={!!modal}
          onClose={() => setModal(null)}
          project={modal.project}
          activityType={modal.type}
          existing={modal.existing}
        />
      )}
      {modal && modal.type === 'inspection' && (
        <InspectionModal
          key={`${modal.project.id}-inspection-${modal.existing?.id ?? 'new'}`}
          open={!!modal}
          onClose={() => setModal(null)}
          project={modal.project}
          existing={modal.existing}
        />
      )}

      {/* Download column-select modal */}
      {downloadFormat && (
        <DownloadModal
          format={downloadFormat}
          rows={filtered}
          onClose={() => setDownloadFormat(null)}
        />
      )}
    </div>
  )
}
