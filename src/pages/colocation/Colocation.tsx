import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Plus, X, Loader2, MapPin, Pencil, Trash2, Map, List } from 'lucide-react'
import {
  useColocationLocations,
  useAddLocation,
  useUpdateLocation,
  useDeleteLocation,
  type ColocationLocation,
} from '@/hooks/useColocation'
import { GHANA_BOUNDS } from '@/data/ghana-boundary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Inject pulse keyframes once ──────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('coloc-styles')) return
  const s = document.createElement('style')
  s.id = 'coloc-styles'
  s.textContent = `
    @keyframes colocPulse {
      0%   { transform: translate(-50%,-50%) scale(0.6); opacity: 0.9; }
      100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
    }
  `
  document.head.appendChild(s)
}

// ─── Marker icons ─────────────────────────────────────────────────────────────

function makeIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [8, 8],
    html: `
      <div style="position:relative;text-align:center;">
        <div style="width:14px;height:14px;background:#E8621A;border:2px solid white;
          border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);margin:0 auto;"></div>
        <div style="position:absolute;top:18px;left:50%;transform:translateX(-50%);
          white-space:nowrap;font-size:10px;font-weight:600;color:#111827;
          background:rgba(255,255,255,0.9);padding:1px 5px;border-radius:3px;
          box-shadow:0 1px 3px rgba(0,0,0,0.15);">${name}</div>
      </div>`,
  })
}

function makeHighlightIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [10, 10],
    html: `
      <div style="position:relative;text-align:center;">
        <div style="position:absolute;width:24px;height:24px;border-radius:50%;
          background:rgba(232,98,26,0.35);top:50%;left:50%;
          animation:colocPulse 1.2s ease-out infinite;"></div>
        <div style="width:20px;height:20px;background:#E8621A;border:2.5px solid white;
          border-radius:50%;box-shadow:0 3px 10px rgba(232,98,26,0.5);
          margin:0 auto;position:relative;z-index:1;"></div>
        <div style="position:absolute;top:24px;left:50%;transform:translateX(-50%);
          white-space:nowrap;font-size:11px;font-weight:700;color:#111827;
          background:rgba(255,255,255,0.96);padding:2px 7px;border-radius:4px;
          box-shadow:0 2px 6px rgba(0,0,0,0.2);">${name}</div>
      </div>`,
  })
}

// ─── Ghana map (plain Leaflet, no tiles) ──────────────────────────────────────

interface GhanaMapProps {
  locations: ColocationLocation[]
  hoveredId: string | null
  onHover: (id: string | null) => void
  visible: boolean
}

function GhanaMap({ locations, hoveredId, onHover, visible }: GhanaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const markersRef   = useRef<Map<string, { marker: L.Marker; name: string }>>(new Map())
  const onHoverRef   = useRef(onHover)
  useEffect(() => { onHoverRef.current = onHover })

  // Initialise map + load Ghana regions
  useEffect(() => {
    injectStyles()
    const el = containerRef.current
    if (!el) return
    delete (el as unknown as Record<string, unknown>)['_leaflet_id']

    const map = L.map(el, {
      center: [7.9465, -1.0232],
      zoom: 7,
      minZoom: 6,
      maxZoom: 13,
      maxBounds: GHANA_BOUNDS,
      maxBoundsViscosity: 1.0,
      attributionControl: false,
      zoomControl: true,
    })
    el.style.background = '#cfe0ea'
    map.fitBounds(GHANA_BOUNDS, { padding: [16, 16] })
    mapRef.current = map

    let mounted = true
    fetch('/api/ghana-regions')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: GeoJSON.GeoJsonObject) => {
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

  // Sync markers whenever locations change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current.clear()

    locations.forEach(loc => {
      const lat = Number(loc.latitude)
      const lng = Number(loc.longitude)
      if (isNaN(lat) || isNaN(lng)) return

      const marker = L.marker([lat, lng], { icon: makeIcon(loc.name) })
      marker.bindTooltip(
        `<strong style="font-size:12px">${loc.name}</strong>`
        + (loc.ssnit_branch ? `<br/><span style="font-size:11px;color:#555">${loc.ssnit_branch}</span>` : '')
        + `<br/><span style="font-size:10px;color:#888;font-family:monospace">${lat.toFixed(4)}°, ${lng.toFixed(4)}°</span>`,
        { direction: 'top', offset: [0, -16], opacity: 0.97 },
      )
      marker.on('mouseover', () => onHoverRef.current(loc.id))
      marker.on('mouseout',  () => onHoverRef.current(null))
      marker.addTo(map)
      markersRef.current.set(loc.id, { marker, name: loc.name })
    })
  }, [locations])

  // Update icons when hover changes
  useEffect(() => {
    markersRef.current.forEach(({ marker, name }, id) => {
      const active = id === hoveredId
      marker.setIcon(active ? makeHighlightIcon(name) : makeIcon(name))
      if (active) marker.openTooltip(); else marker.closeTooltip()
    })
  }, [hoveredId])

  // Leaflet needs a size refresh after being hidden (mobile tab)
  useEffect(() => {
    if (visible && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 60)
    }
  }, [visible])

  // position:absolute inset:0 is the only reliable way to fill a flex parent
  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}

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
      latitude, longitude,
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
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-brand/10">
            <MapPin size={15} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{isEdit ? 'Edit Location' : 'Add New Location'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose}
            className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Name of Location <span className="text-red-400">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Accra Main Branch" required className="h-9 text-sm" autoFocus />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">SSNIT Branch</label>
            <Input value={branch} onChange={e => setBranch(e.target.value)}
              placeholder="e.g. Greater Accra Regional Office" className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Commencement Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">GPS Coordinates <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Latitude</span>
                <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)}
                  placeholder="e.g. 5.6037" required className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Longitude</span>
                <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)}
                  placeholder="e.g. -0.1870" required className="h-9 text-sm" />
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">Ghana: 4.5°–11.2° N, 3.3° W–1.2° E</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
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
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
          <Skeleton className="w-2 h-2 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type MobileTab = 'map' | 'list'

export function Colocation() {
  const { data: locations = [], isLoading } = useColocationLocations()
  const { mutateAsync: deleteLocation } = useDeleteLocation()

  const [addOpen,    setAddOpen]    = useState(false)
  const [editTarget, setEditTarget] = useState<ColocationLocation | null>(null)
  const [hoveredId,  setHoveredId]  = useState<string | null>(null)
  const [mobileTab,  setMobileTab]  = useState<MobileTab>('map')

  async function handleDelete(loc: ColocationLocation) {
    if (!window.confirm(`Remove "${loc.name}"? This cannot be undone.`)) return
    try {
      await deleteLocation(loc.id)
      toast.success(`"${loc.name}" removed`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const mapVisible = mobileTab === 'map'

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 52px)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b bg-white shrink-0">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">Colocation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {locations.length} location{locations.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 h-8 text-xs shrink-0">
          <Plus size={13} />
          <span className="hidden sm:inline">Add New Location</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="flex md:hidden border-b bg-white shrink-0">
        {(['map', 'list'] as MobileTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors',
              mobileTab === tab ? 'border-brand text-brand' : 'border-transparent text-zinc-500',
            )}
          >
            {tab === 'map' ? <><Map size={13} />Map</> : <><List size={13} />Locations {locations.length > 0 && `(${locations.length})`}</>}
          </button>
        ))}
      </div>

      {/* ── Body ── flex row, takes remaining height */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Left: table panel — full width on mobile, 420 px sidebar on desktop */}
        <div
          className={cn(
            'border-r border-zinc-200 bg-white overflow-hidden',
            'w-full md:w-[420px] md:flex-none',
            mobileTab === 'list' ? 'flex' : 'hidden md:flex',
          )}
          style={{ flexDirection: 'column' }}
        >
          {/* Table column headers */}
          <div className="grid shrink-0 bg-zinc-50 border-b" style={{ gridTemplateColumns: '1fr 1fr 72px' }}>
            {['Name of Location', 'SSNIT Branch / Date', 'Actions'].map(h => (
              <div key={h} className={cn(
                'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap',
                h === 'Actions' && 'text-center',
              )}>
                {h}
              </div>
            ))}
          </div>

          {/* Table rows */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <TableSkeleton />
            ) : locations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
                <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                  <MapPin size={20} className="text-zinc-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-600">No locations yet</p>
                <p className="text-xs text-zinc-400 mt-1">Click "Add New Location" to pin a location</p>
              </div>
            ) : (
              locations.map((loc, i) => {
                const isHovered = hoveredId === loc.id
                return (
                  <div
                    key={loc.id}
                    className={cn(
                      'grid items-center border-b border-zinc-100 cursor-default transition-colors duration-150',
                      isHovered
                        ? 'bg-orange-50 border-l-2 border-l-brand'
                        : i % 2 === 0 ? 'bg-white hover:bg-zinc-50' : 'bg-zinc-50/40 hover:bg-zinc-50',
                    )}
                    style={{ gridTemplateColumns: '1fr 1fr 72px' }}
                    onMouseEnter={() => setHoveredId(loc.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2 px-4 py-3 min-w-0">
                      <div className={cn(
                        'w-2 h-2 rounded-full shrink-0 transition-all duration-200',
                        isHovered ? 'bg-brand scale-125' : 'bg-brand/60',
                      )} />
                      <span className={cn(
                        'text-xs font-semibold truncate transition-colors',
                        isHovered ? 'text-brand' : 'text-zinc-800',
                      )}>
                        {loc.name}
                      </span>
                    </div>

                    {/* SSNIT Branch + Date stacked */}
                    <div className="px-4 py-3 min-w-0">
                      <p className="text-xs text-zinc-600 truncate">
                        {loc.ssnit_branch || <span className="text-zinc-300">—</span>}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {loc.commencement_date
                          ? new Date(loc.commencement_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
                          : <span className="text-zinc-300">—</span>}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-1 px-2 py-3">
                      <button
                        onClick={() => setEditTarget(loc)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(loc)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Table footer */}
          {locations.length > 0 && (
            <div className="shrink-0 px-4 py-2 border-t bg-zinc-50">
              <span className="text-[11px] text-zinc-400">
                {locations.length} location{locations.length !== 1 ? 's' : ''}
                {hoveredId && ' · hover to highlight on map'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Ghana map — position:relative so the absolute map div fills it */}
        <div
          className={cn(
            mobileTab === 'map' ? 'block' : 'hidden md:block',
          )}
          style={{ flex: 1, position: 'relative', minWidth: 0 }}
        >
          <GhanaMap
            locations={locations}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            visible={mapVisible}
          />
        </div>

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
