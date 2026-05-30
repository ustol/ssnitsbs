import { useEffect, useRef, useState } from 'react'
// L is the Leaflet global loaded from CDN in index.html (see src/types/leaflet.d.ts)
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

// ─── Pulse CSS injected once ──────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('coloc-styles')) return
  const s = document.createElement('style')
  s.id = 'coloc-styles'
  s.textContent = `@keyframes colocPulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:.9}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}`
  document.head.appendChild(s)
}

// ─── Marker icons ─────────────────────────────────────────────────────────────

const dot = (size: number, shadow: string) =>
  `width:${size}px;height:${size}px;background:#E8621A;border:2px solid white;border-radius:50%;box-shadow:${shadow};margin:0 auto;`

const label = (bold: boolean, name: string) =>
  `position:absolute;top:${bold ? 24 : 18}px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:${bold ? 11 : 10}px;font-weight:${bold ? 700 : 600};color:#111827;background:rgba(255,255,255,.93);padding:${bold ? '2px 7px' : '1px 5px'};border-radius:4px;box-shadow:0 1px ${bold ? 6 : 3}px rgba(0,0,0,.18);`

function makeIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [7, 7],
    html: `<div style="position:relative;text-align:center;"><div style="${dot(14, '0 2px 6px rgba(0,0,0,.3)')}"></div><div style="${label(false, name)}">${name}</div></div>`,
  })
}

function makeHighlightIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [10, 10],
    html: `<div style="position:relative;text-align:center;">
      <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(232,98,26,.3);top:50%;left:50%;animation:colocPulse 1.2s ease-out infinite;"></div>
      <div style="${dot(20, '0 3px 10px rgba(232,98,26,.5)')}position:relative;z-index:1;"></div>
      <div style="${label(true, name)}">${name}</div>
    </div>`,
  })
}

// ─── Ghana map ────────────────────────────────────────────────────────────────

function GhanaMap({ locations, hoveredId, onHover, visible }: {
  locations: ColocationLocation[]
  hoveredId: string | null
  onHover: (id: string | null) => void
  visible: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const markersRef   = useRef<Map<string, { marker: L.Marker; name: string }>>(new Map())
  const onHoverRef   = useRef(onHover)
  useEffect(() => { onHoverRef.current = onHover })

  // Init map once
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

    return () => { mounted = false; map.remove(); mapRef.current = null }
  }, [])

  // Sync markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current.clear()

    locations.forEach(loc => {
      const lat = Number(loc.latitude), lng = Number(loc.longitude)
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

  // Update icons on hover change
  useEffect(() => {
    markersRef.current.forEach(({ marker, name }, id) => {
      const active = id === hoveredId
      marker.setIcon(active ? makeHighlightIcon(name) : makeIcon(name))
      if (active) marker.openTooltip(); else marker.closeTooltip()
    })
  }, [hoveredId])

  // Invalidate size when panel becomes visible (mobile tab switch)
  useEffect(() => {
    if (visible && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 80)
    }
  }, [visible])

  // The div fills its absolutely-positioned parent completely
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

// ─── Location modal ───────────────────────────────────────────────────────────

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
    const payload = { name: name.trim(), ssnit_branch: branch.trim() || null, latitude, longitude, commencement_date: date || null }
    try {
      if (isEdit) { await update({ id: existing.id, ...payload }); toast.success('Location updated') }
      else        { await add(payload);                             toast.success(`"${payload.name}" added`) }
      onClose()
    } catch (err) { toast.error((err as Error).message) }
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
          <button onClick={onClose} className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Name of Location <span className="text-red-400">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Accra Main Branch" required className="h-9 text-sm" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">SSNIT Branch</label>
            <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. Greater Accra Regional Office" className="h-9 text-sm" />
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
                <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 5.6037" required className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Longitude</span>
                <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g. -0.1870" required className="h-9 text-sm" />
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

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
          <Skeleton className="w-2 h-2 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-36" /><Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TOPBAR_H  = 52   // px — matches Layout topbar height
const HEADER_H  = 61   // px — page header row
const TABBAR_H  = 41   // px — mobile tab bar
const SIDEBAR_W = 420  // px — table panel width on desktop

export function Colocation() {
  const { data: locations = [], isLoading } = useColocationLocations()
  const { mutateAsync: deleteLocation } = useDeleteLocation()

  const [addOpen,    setAddOpen]    = useState(false)
  const [editTarget, setEditTarget] = useState<ColocationLocation | null>(null)
  const [hoveredId,  setHoveredId]  = useState<string | null>(null)
  const [mobileTab,  setMobileTab]  = useState<'map' | 'list'>('map')
  const [isMobile,   setIsMobile]   = useState(() => window.innerWidth < 768)

  // Track mobile breakpoint
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  async function handleDelete(loc: ColocationLocation) {
    if (!window.confirm(`Remove "${loc.name}"? This cannot be undone.`)) return
    try { await deleteLocation(loc.id); toast.success(`"${loc.name}" removed`) }
    catch (err) { toast.error((err as Error).message) }
  }

  // Heights
  const bodyH = `calc(100vh - ${TOPBAR_H}px - ${HEADER_H}px - ${isMobile ? TABBAR_H : 0}px)`

  // Panel visibility
  const showTable = !isMobile || mobileTab === 'list'
  const showMap   = !isMobile || mobileTab === 'map'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: `calc(100vh - ${TOPBAR_H}px)` }}>

      {/* ── Header ── */}
      <div style={{ height: HEADER_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 24px', borderBottom: '1px solid #e4e4e7', background: 'white', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: '#18181b', lineHeight: 1.3 }}>Colocation</h1>
          <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
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
      {isMobile && (
        <div style={{ height: TABBAR_H, display: 'flex', borderBottom: '1px solid #e4e4e7', background: 'white', flexShrink: 0 }}>
          {(['map', 'list'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 12, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${mobileTab === tab ? '#E8621A' : 'transparent'}`,
                color: mobileTab === tab ? '#E8621A' : '#71717a',
                transition: 'all .15s',
              }}
            >
              {tab === 'map' ? <Map size={13} /> : <List size={13} />}
              {tab === 'map' ? 'Map' : `Locations${locations.length > 0 ? ` (${locations.length})` : ''}`}
            </button>
          ))}
        </div>
      )}

      {/* ── Body: absolute-positioned panels for guaranteed height ── */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>

        {/* Table panel */}
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: 0,
          width: isMobile ? '100%' : SIDEBAR_W,
          display: showTable ? 'flex' : 'none',
          flexDirection: 'column',
          borderRight: isMobile ? 'none' : '1px solid #e4e4e7',
          background: 'white',
          overflow: 'hidden',
        }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 64px', borderBottom: '1px solid #e4e4e7', background: '#fafafa', flexShrink: 0 }}>
            {['Name of Location', 'SSNIT Branch / Date', 'Actions'].map(h => (
              <div key={h} style={{
                padding: '10px 16px',
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#71717a', whiteSpace: 'nowrap',
                textAlign: h === 'Actions' ? 'center' : 'left',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? <TableSkeleton /> : locations.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MapPin size={20} color="#a1a1aa" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#71717a' }}>No locations yet</p>
                <p style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>Click "Add New Location" to pin a location</p>
              </div>
            ) : locations.map((loc, i) => {
              const active = hoveredId === loc.id
              return (
                <div
                  key={loc.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 64px',
                    alignItems: 'center',
                    borderBottom: '1px solid #f4f4f5',
                    background: active ? '#fff7ed' : i % 2 === 0 ? 'white' : '#fafafa',
                    borderLeft: `3px solid ${active ? '#E8621A' : 'transparent'}`,
                    cursor: 'default',
                    transition: 'background .12s, border-color .12s',
                  }}
                  onMouseEnter={() => setHoveredId(loc.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8621A', flexShrink: 0, transform: active ? 'scale(1.3)' : 'scale(1)', transition: 'transform .15s' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#E8621A' : '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loc.name}
                    </span>
                  </div>

                  {/* Branch + date */}
                  <div style={{ padding: '12px 16px', minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loc.ssnit_branch || '—'}
                    </p>
                    <p style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>
                      {loc.commencement_date
                        ? new Date(loc.commencement_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 8px' }}>
                    <button
                      onClick={() => setEditTarget(loc)}
                      title="Edit"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(loc)}
                      title="Delete"
                      className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {locations.length > 0 && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid #e4e4e7', background: '#fafafa', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#a1a1aa' }}>
                {locations.length} location{locations.length !== 1 ? 's' : ''}
                {!isMobile && hoveredId && ' · highlighted on map'}
              </span>
            </div>
          )}
        </div>

        {/* Map panel */}
        <div style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          left: isMobile ? 0 : SIDEBAR_W,
          display: showMap ? 'block' : 'none',
        }}>
          <GhanaMap
            locations={locations}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            visible={showMap}
          />
        </div>

      </div>

      {/* Modals */}
      {addOpen    && <LocationModal key="add"          open={addOpen}    onClose={() => setAddOpen(false)}    />}
      {editTarget && <LocationModal key={editTarget.id} open={!!editTarget} onClose={() => setEditTarget(null)} existing={editTarget} />}
    </div>
  )
}
