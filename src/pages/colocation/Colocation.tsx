import { useState } from 'react'
import { Plus, X, Loader2, MapPin, Pencil, Trash2 } from 'lucide-react'
import {
  useColocationLocations,
  useAddLocation,
  useUpdateLocation,
  useDeleteLocation,
  type ColocationLocation,
} from '@/hooks/useColocation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

interface LocationModalProps {
  open: boolean
  onClose: () => void
  existing?: ColocationLocation
}

function LocationModal({ open, onClose, existing }: LocationModalProps) {
  const isEdit = !!existing
  const [name,   setName]   = useState(existing?.name ?? '')
  const [branch, setBranch] = useState(existing?.ssnit_branch ?? '')
  const [lat,    setLat]    = useState(existing ? String(existing.latitude)  : '')
  const [lng,    setLng]    = useState(existing ? String(existing.longitude) : '')
  const [date,   setDate]   = useState(existing?.commencement_date ?? '')

  const { mutateAsync: add,    isPending: isAdding   } = useAddLocation()
  const { mutateAsync: update, isPending: isUpdating } = useUpdateLocation()
  const isPending = isAdding || isUpdating

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const latitude  = parseFloat(lat)
    const longitude = parseFloat(lng)
    if (isNaN(latitude)  || latitude  < -90  || latitude  > 90)  { toast.error('Latitude must be between -90 and 90');    return }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) { toast.error('Longitude must be between -180 and 180'); return }

    const payload = {
      name: name.trim(),
      ssnit_branch: branch.trim() || null,
      latitude,
      longitude,
      commencement_date: date || null,
    }

    try {
      if (isEdit) {
        await update({ id: existing.id, ...payload })
        toast.success('Location updated')
      } else {
        await add(payload)
        toast.success(`"${payload.name}" added`)
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-brand/10">
            <MapPin size={15} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{isEdit ? 'Edit Location' : 'Add New Location'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

          {/* Name of Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Name of Location <span className="text-red-400">*</span>
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Accra Main Branch"
              required
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          {/* SSNIT Branch */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">SSNIT Branch</label>
            <Input
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="e.g. Greater Accra Regional Office"
              className="h-9 text-sm"
            />
          </div>

          {/* Commencement Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Commencement Date</label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* GPS Coordinates */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              GPS Coordinates <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Latitude</span>
                <Input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="e.g. 5.6037"
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Longitude</span>
                <Input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  placeholder="e.g. -0.1870"
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">Ghana: approx. 4.5°–11.2° N, 3.3° W–1.2° E</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1 h-9 text-sm gap-2">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="grid items-center px-4 py-3 border-b" style={{ gridTemplateColumns: '1fr 1fr 1fr 120px 80px' }}>
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-12 ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Colocation() {
  const { data: locations = [], isLoading } = useColocationLocations()
  const { mutateAsync: deleteLocation } = useDeleteLocation()

  const [addOpen,     setAddOpen]     = useState(false)
  const [editTarget,  setEditTarget]  = useState<ColocationLocation | null>(null)

  async function handleDelete(loc: ColocationLocation) {
    if (!window.confirm(`Remove "${loc.name}"? This cannot be undone.`)) return
    try {
      await deleteLocation(loc.id)
      toast.success(`"${loc.name}" removed`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const cols = '1fr 1fr 1fr 130px 80px'
  const headers = ['Name of Location', 'SSNIT Branch', 'Commencement Date', 'Coordinates', 'Actions']

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Page header */}
      <PageHeader
        title="Colocation"
        subtitle={`${locations.length} location${locations.length !== 1 ? 's' : ''} recorded`}
        actions={
          <Button onClick={() => setAddOpen(true)} className="gap-2 h-8 text-xs">
            <Plus size={13} />
            Add New Location
          </Button>
        }
      />

      {/* Table */}
      <div className="rounded-xl border shadow-sm overflow-hidden">
        {/* Scrollable wrapper for mobile */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: '640px' }}>

            {/* Column headers */}
            <div
              className="grid bg-zinc-50 border-b"
              style={{ gridTemplateColumns: cols }}
            >
              {headers.map(h => (
                <div
                  key={h}
                  className={cn(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap',
                    h === 'Actions' && 'text-center',
                  )}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {isLoading ? (
              <TableSkeleton />
            ) : locations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                  <MapPin size={20} className="text-zinc-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-600">No locations yet</p>
                <p className="text-xs text-zinc-400 mt-1">Click "Add New Location" to get started</p>
              </div>
            ) : (
              locations.map((loc, i) => (
                <div
                  key={loc.id}
                  className={cn(
                    'grid items-center border-b last:border-0 transition-colors',
                    'hover:bg-zinc-50/70',
                    i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30',
                  )}
                  style={{ gridTemplateColumns: cols }}
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5 px-4 py-3.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-brand shrink-0" />
                    <span className="text-xs font-semibold text-zinc-800 truncate">{loc.name}</span>
                  </div>

                  {/* SSNIT Branch */}
                  <div className="px-4 py-3.5">
                    <span className="text-xs text-zinc-600 truncate block">
                      {loc.ssnit_branch || <span className="text-zinc-300">—</span>}
                    </span>
                  </div>

                  {/* Commencement Date */}
                  <div className="px-4 py-3.5">
                    <span className="text-xs text-zinc-600">
                      {loc.commencement_date
                        ? new Date(loc.commencement_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span className="text-zinc-300">—</span>}
                    </span>
                  </div>

                  {/* Coordinates */}
                  <div className="px-4 py-3.5">
                    <p className="text-[11px] text-zinc-500 font-mono leading-snug">
                      {Number(loc.latitude).toFixed(4)}°
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono leading-snug">
                      {Number(loc.longitude).toFixed(4)}°
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1 px-3 py-3.5">
                    <button
                      onClick={() => setEditTarget(loc)}
                      title="Edit"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(loc)}
                      title="Delete"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        {locations.length > 0 && (
          <div className="px-4 py-2.5 bg-zinc-50 border-t flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {locations.length} location{locations.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {addOpen && (
        <LocationModal key="add" open={addOpen} onClose={() => setAddOpen(false)} />
      )}
      {editTarget && (
        <LocationModal
          key={editTarget.id}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          existing={editTarget}
        />
      )}
    </div>
  )
}
