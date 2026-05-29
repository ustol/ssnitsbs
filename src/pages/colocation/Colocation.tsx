import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import L from 'leaflet'
import { MapPin, Plus, X, Loader2, Pencil, Trash2, Map, List } from 'lucide-react'
import {
  useColocationLocations, useAddLocation, useUpdateLocation, useDeleteLocation,
  type ColocationLocation,
} from '@/hooks/useColocation'
import { GHANA_BOUNDS } from '@/data/ghana-boundary'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

async function fetchGhanaRegions(): Promise<GeoJSON.GeoJsonObject> {
  const res = await fetch('/api/ghana-regions')
  if (!res.ok) throw new Error(`ghana-regions API returned ${res.status}`)
  return res.json() as Promise<GeoJSON.GeoJsonObject>
}

// ─── Marker icons ─────────────────────────────────────────────────────────────

function makeIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [8, 8],
    html: `<div style="position:relative;text-align:center;">
      <div style="width:16px;height:16px;background:#E8621A;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);margin:0 auto;"></div>
      <div style="position:absolute;top:20px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:600;color:#111827;background:rgba(255,255,255,0.92);padding:2px 7px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.15);">${name}</div>
    </div>`,
  })
}

function makeHighlightedIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [11, 11],
    html: `<div style="position:relative;text-align:center;">
      <div style="width:22px;height:22px;background:#E8621A;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(232,98,26,0.28),0 3px 10px rgba(0,0,0,0.45);margin:0 auto;"></div>
      <div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:700;color:#E8621A;background:rgba(255,255,255,0.97);padding:3px 8px;border-radius:5px;box-shadow:0 2px 6px rgba(0,0,0,0.18);border:1.5px solid rgba(232,98,26,0.3);">${name}</div>
    </div>`,
  })
}

// ─── Ghana map ────────────────────────────────────────────────────────────────

interface GhanaMapHandle {
  highlight: (id: string | null) => void
}

const GhanaMap = forwardRef<GhanaMapHandle, { locations: ColocationLocation[]; visible: boolean }>(
  function GhanaMap({ locations, visible }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)
    const markersRef = useRef<Map<string, { marker: L.Marker; name: string }>>(new Map())

    // Expose highlight() so the parent can call it directly from mouse events
    useImperativeHandle(ref, () => ({
      highlight(id: string | null) {
        markersRef.current.forEach(({ marker, name }, markerId) => {
          if (markerId === id) {
            marker.setIcon(makeHighlightedIcon(name))
            marker.setZIndexOffset(1000)
          } else {
            marker.setIcon(makeIcon(name))
            marker.setZIndexOffset(0)
          }
        })
      },
    }))

    useEffect(() => {
      const el = containerRef.current
      if (!el) return
      delete (el as unknown as Record<string, unknown>)['_leaflet_id']

      const map = L.map(el, {
        center: [7.9465, -1.0232],
        zoom: 7,
        minZoom: 6,
        maxZoom: 12,
        maxBounds: GHANA_BOUNDS,
        maxBoundsViscosity: 1.0,
        attributionControl: false,
        zoomControl: true,
      })
      el.style.background = '#cfe0ea'
      map.fitBounds(GHANA_BOUNDS, { padding: [20, 20] })
      mapRef.current = map

      let mounted = true
      fetchGhanaRegions()
        .then(data => {
          if (!mounted || !mapRef.current) return
          L.geoJSON(data, {
            style: { fillColor: '#eee8dc', fillOpacity: 1, color: '#8fa3b0', weight: 1 },
          }).addTo(map)
        })
        .catch(() => {})

      return () => {
        mounted = false
        map.remove()
        mapRef.current = null
      }
    }, [])

    useEffect(() => {
      if (visible && mapRef.current) {
        setTimeout(() => mapRef.current?.invalidateSize(), 60)
      }
    }, [visible])

    useEffect(() => {
      const map = mapRef.current
      if (!map) return
      markersRef.current.forEach(({ marker }) => marker.remove())
      markersRef.current.clear()
      locations.forEach(loc => {
        const marker = L.marker(
          [Number(loc.latitude), Number(loc.longitude)],
          { icon: makeIcon(loc.name) },
        ).addTo(map)
        markersRef.current.set(loc.id, { marker, name: loc.name })
      })
    }, [locations])

    return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
  },
)

// ─── Location modal ───────────────────────────────────────────────────────────

interface LocationModalProps {
  open: boolean
  onClose: () => void
  existing?: ColocationLocation
}

function LocationModal({ open, onClose, existing }: LocationModalProps) {
  const isEdit = !!existing
  const [name, setName] = useState(existing?.name ?? '')
  const [lat, setLat] = useState(existing ? String(existing.latitude) : '')
  const [lng, setLng] = useState(existing ? String(existing.longitude) : '')
  const [ssnitBranch, setSsnitBranch] = useState(existing?.ssnit_branch ?? '')
  const [commencementDate, setCommencementDate] = useState(existing?.commencement_date ?? '')

  const { mutateAsync: addLocation, isPending: isAdding } = useAddLocation()
  const { mutateAsync: updateLocation, isPending: isUpdating } = useUpdateLocation()
  const isPending = isAdding || isUpdating

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      toast.error('Latitude must be between -90 and 90')
      return
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      toast.error('Longitude must be between -180 and 180')
      return
    }
    const extra = {
      ssnit_branch: ssnitBranch.trim() || null,
      commencement_date: commencementDate || null,
    }
    try {
      if (isEdit) {
        await updateLocation({ id: existing.id, name: name.trim(), latitude, longitude, ...extra })
        toast.success(`"${name.trim()}" updated`)
      } else {
        await addLocation({ name: name.trim(), latitude, longitude, ...extra })
        toast.success(`"${name.trim()}" added to map`)
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b">
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-orange-50">
            <MapPin size={14} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{isEdit ? 'Edit Location' : 'Add New Location'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Update location details' : 'Pin a location on the Ghana map'}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 p-1">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3.5 overflow-y-auto max-h-[70vh]">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Name of Location <span className="text-red-400">*</span></label>
            <Input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Accra Office" required className="h-9 text-sm" autoFocus
            />
          </div>

          {/* GPS Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Latitude <span className="text-red-400">*</span></label>
              <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)}
                placeholder="e.g. 5.6037" required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Longitude <span className="text-red-400">*</span></label>
              <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)}
                placeholder="e.g. -0.1870" required className="h-9 text-sm" />
            </div>
          </div>
          <p className="text-[0.7rem] text-zinc-400 -mt-1">Ghana: 4.5°–11.2° N, 3.3° W–1.2° E</p>

          {/* Divider */}
          <div className="border-t border-dashed border-zinc-200 pt-1" />

          {/* SSNIT Branch */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">SSNIT Branch</label>
            <Input
              value={ssnitBranch} onChange={e => setSsnitBranch(e.target.value)}
              placeholder="e.g. Accra Central Branch"
              className="h-9 text-sm"
            />
          </div>

          {/* Commencement Date — required */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Commencement Date <span className="text-red-400">*</span>
            </label>
            <Input
              type="date"
              value={commencementDate}
              onChange={e => setCommencementDate(e.target.value)}
              required
              className="h-9 text-sm"
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full gap-2 h-9">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : isEdit ? <Pencil size={14} /> : <Plus size={14} />}
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Map'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Locations table ──────────────────────────────────────────────────────────

function LocationsTable({
  locations, isLoading,
  onEdit, onDelete, onHover, hoveredId,
}: {
  locations: ColocationLocation[]
  isLoading: boolean
  onEdit: (loc: ColocationLocation) => void
  onDelete: (loc: ColocationLocation) => void
  onHover: (id: string | null) => void
  hoveredId: string | null
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Column headers */}
      <div className="grid border-b bg-zinc-50 shrink-0"
        style={{ gridTemplateColumns: '1fr 110px 72px' }}>
        {['Name of Location', 'Coordinates', 'Actions'].map(h => (
          <span key={h} className={cn(
            'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500',
            h === 'Actions' && 'text-center',
          )}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-zinc-400" />
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center py-14 px-6 text-center">
            <MapPin size={28} className="text-zinc-300 mb-3" />
            <p className="text-sm font-semibold text-zinc-500">No locations yet</p>
            <p className="text-xs text-zinc-400 mt-1">Tap "Add New Location" to get started</p>
          </div>
        ) : (
          locations.map((loc, i) => (
            <div
              key={loc.id}
              onMouseEnter={() => onHover(loc.id)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                'grid items-center border-b border-zinc-100 transition-colors cursor-default',
                hoveredId === loc.id
                  ? 'bg-orange-50 border-l-2 border-l-brand'
                  : i % 2 === 0 ? 'bg-white hover:bg-orange-50/50' : 'bg-zinc-50/50 hover:bg-orange-50/50',
              )}
              style={{ gridTemplateColumns: '1fr 110px 72px' }}
            >
              {/* Name */}
              <div className="flex items-center gap-2 px-4 py-3 min-w-0">
                <div className={cn(
                  'w-2 h-2 rounded-full shrink-0 transition-all',
                  hoveredId === loc.id ? 'w-2.5 h-2.5 bg-brand shadow-sm' : 'bg-brand',
                )} />
                <span className="text-xs font-semibold text-zinc-800 truncate">{loc.name}</span>
              </div>

              {/* Coordinates */}
              <div className="px-2 py-3">
                <p className="text-[11px] text-zinc-500 font-mono leading-tight">
                  {Number(loc.latitude).toFixed(4)}°
                </p>
                <p className="text-[11px] text-zinc-500 font-mono leading-tight">
                  {Number(loc.longitude).toFixed(4)}°
                </p>
              </div>

              {/* Actions — always visible (touch-friendly) */}
              <div className="flex items-center justify-center gap-1 px-2 py-3">
                <button
                  onClick={() => onEdit(loc)}
                  className="p-1.5 rounded-md hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
                  title="Edit"
                >
                  <Pencil size={13} className="text-zinc-500" />
                </button>
                <button
                  onClick={() => onDelete(loc)}
                  className="p-1.5 rounded-md hover:bg-red-50 active:bg-red-100 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type MobileTab = 'map' | 'list'

export function Colocation() {
  const { data: locations = [], isLoading } = useColocationLocations()
  const { mutateAsync: deleteLocation } = useDeleteLocation()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ColocationLocation | null>(null)
  const [mobileTab, setMobileTab] = useState<MobileTab>('map')
  const [hoveredLocId, setHoveredLocId] = useState<string | null>(null)
  const ghanaMapRef = useRef<GhanaMapHandle>(null)

  function handleHover(id: string | null) {
    setHoveredLocId(id)           // highlights the table row
    ghanaMapRef.current?.highlight(id)  // highlights the map marker directly
  }

  async function handleDelete(loc: ColocationLocation) {
    if (!window.confirm(`Remove "${loc.name}" from the map?`)) return
    try {
      await deleteLocation(loc.id)
      toast.success(`"${loc.name}" removed`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 52px)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b bg-white shrink-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-zinc-900 leading-tight">Colocation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {locations.length} location{locations.length !== 1 ? 's' : ''} pinned
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 h-8 text-xs shrink-0">
          <Plus size={13} />
          <span className="hidden sm:inline">Add New Location</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* ── Mobile tab bar (hidden on md+) ── */}
      <div className="flex md:hidden border-b bg-white shrink-0">
        <button
          onClick={() => setMobileTab('map')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors',
            mobileTab === 'map'
              ? 'border-brand text-brand'
              : 'border-transparent text-zinc-500',
          )}
        >
          <Map size={13} />
          Map
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors',
            mobileTab === 'list'
              ? 'border-brand text-brand'
              : 'border-transparent text-zinc-500',
          )}
        >
          <List size={13} />
          Locations {locations.length > 0 && `(${locations.length})`}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Locations table — full width on mobile (list tab), fixed 420px sidebar on desktop */}
        <div className={cn(
          'flex-col border-r border-zinc-200 bg-white',
          'w-full md:w-[420px] md:shrink-0 md:flex',
          mobileTab === 'list' ? 'flex' : 'hidden md:flex',
        )}>
          <LocationsTable
            locations={locations}
            isLoading={isLoading}
            onEdit={loc => setEditTarget(loc)}
            onDelete={handleDelete}
            onHover={handleHover}
            hoveredId={hoveredLocId}
          />
        </div>

        {/* Map — full width on mobile (map tab), flexible on desktop */}
        <div className={cn(
          'relative',
          'flex-1',
          mobileTab === 'map' ? 'block' : 'hidden md:block',
        )}>
          <GhanaMap ref={ghanaMapRef} locations={locations} visible={mobileTab === 'map'} />
        </div>

      </div>

      {addOpen && (
        <LocationModal key="add" open={addOpen} onClose={() => setAddOpen(false)} />
      )}
      {editTarget && (
        <LocationModal key={editTarget.id} open={!!editTarget} onClose={() => setEditTarget(null)} existing={editTarget} />
      )}
    </div>
  )
}
