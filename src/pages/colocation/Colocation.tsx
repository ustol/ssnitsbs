import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Plus, X, MapPin, Pencil, Trash2, Loader2, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
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
import { toast } from 'sonner'

export interface GhanaMapHandle {
  getElement: () => HTMLDivElement | null
  getMap: () => any
}

// Icon size [28,36], anchored at [14,36] (bottom-center tip = the geographic point).
// Shared between the live Leaflet divIcon and the PDF export's canvas-drawn pins.
const PIN_ICON_SIZE = { width: 28, height: 36, anchorX: 14, anchorY: 36 }
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
  <path d="M14 0C8.477 0 4 4.477 4 10c0 7.5 10 26 10 26S24 17.5 24 10C24 4.477 19.523 0 14 0z" fill="#E8621A" stroke="#fff" stroke-width="1.5"/>
  <circle cx="14" cy="10" r="4" fill="#fff"/>
</svg>`

// ─── Ghana Map ────────────────────────────────────────────────────────────────

const GhanaMap = forwardRef<GhanaMapHandle, { locations: ColocationLocation[] }>(function GhanaMap({ locations }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markersRef   = useRef<Record<string, any>>({})

  useImperativeHandle(ref, () => ({
    getElement: () => containerRef.current,
    getMap: () => mapRef.current,
  }))

  // Init map once
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof L === 'undefined') return

    const elAny = el as any
    if (elAny._leaflet_id) delete elAny._leaflet_id

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

  // Sync markers whenever locations change
  useEffect(() => {
    const map = mapRef.current
    if (!map || typeof L === 'undefined') return

    // Remove old markers
    Object.values(markersRef.current).forEach((m: any) => m.remove())
    markersRef.current = {}

    const pinIcon = L.divIcon({
      className: '',
      iconSize: [PIN_ICON_SIZE.width, PIN_ICON_SIZE.height],
      iconAnchor: [PIN_ICON_SIZE.anchorX, PIN_ICON_SIZE.anchorY],
      tooltipAnchor: [0, -38],
      html: PIN_SVG,
    })

    locations.forEach(loc => {
      const lat = Number(loc.latitude)
      const lng = Number(loc.longitude)
      if (isNaN(lat) || isNaN(lng)) return

      const marker = L.marker([lat, lng], { icon: pinIcon })

      marker.bindTooltip(
        `<strong>${loc.name}</strong>`
        + (loc.ssnit_branch ? `<br/><span style="font-size:11px;color:#555">${loc.ssnit_branch}</span>` : ''),
        { direction: 'top', offset: [0, -4], opacity: 0.95 },
      )
      marker.addTo(map)
      markersRef.current[loc.id] = marker
    })
  }, [locations])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
})

// ─── Location Modal ───────────────────────────────────────────────────────────

interface LocationModalProps {
  onClose: () => void
  existing?: ColocationLocation
}

function LocationModal({ onClose, existing }: LocationModalProps) {
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
      if (isEdit) { await update({ id: existing.id, ...payload }); toast.success('Location updated') }
      else        { await add(payload);                             toast.success(`"${payload.name}" added`) }
      onClose()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-xl border shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <MapPin size={15} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900">{isEdit ? 'Edit Location' : 'Add New Location'}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">SSNIT Branch</label>
            <Input
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="e.g. Greater Accra Regional Office"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Commencement Date</label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

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
            <p className="text-[11px] text-zinc-400">Ghana: 4.5°–11.2° N, 3.3° W–1.2° E</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1 h-9 text-sm gap-2">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Location'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function formatCommencementDate(date: string | null): string {
  return date
    ? new Date(date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// html2canvas mis-renders Leaflet's CSS-transform-positioned marker DOM (nested
// translate3d on the map pane + each icon compose incorrectly, drifting pins
// off their true location). So markers are drawn manually onto the captured
// base-map canvas using Leaflet's own pixel projection, which is always accurate.
async function captureMapWithPins(mapEl: HTMLDivElement, map: any, locations: ColocationLocation[]): Promise<HTMLCanvasElement> {
  const markerPane    = mapEl.querySelector('.leaflet-marker-pane')    as HTMLElement | null
  const tooltipPane   = mapEl.querySelector('.leaflet-tooltip-pane')   as HTMLElement | null
  const zoomControls  = mapEl.querySelector('.leaflet-control-container') as HTMLElement | null
  const prevMarker     = markerPane?.style.display ?? ''
  const prevTooltip    = tooltipPane?.style.display ?? ''
  const prevZoom       = zoomControls?.style.display ?? ''
  if (markerPane)   markerPane.style.display = 'none'
  if (tooltipPane)  tooltipPane.style.display = 'none'
  if (zoomControls) zoomControls.style.display = 'none'

  let canvas: HTMLCanvasElement
  try {
    canvas = await html2canvas(mapEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#cfe0ea',
      logging: false,
    })
  } finally {
    if (markerPane)   markerPane.style.display = prevMarker
    if (tooltipPane)  tooltipPane.style.display = prevTooltip
    if (zoomControls) zoomControls.style.display = prevZoom
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const pinImg = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(PIN_SVG)}`)
  const scaleX = canvas.width  / mapEl.clientWidth
  const scaleY = canvas.height / mapEl.clientHeight

  for (const loc of locations) {
    const lat = Number(loc.latitude)
    const lng = Number(loc.longitude)
    if (isNaN(lat) || isNaN(lng)) continue
    const pt = map.latLngToContainerPoint([lat, lng])
    ctx.drawImage(
      pinImg,
      pt.x * scaleX - PIN_ICON_SIZE.anchorX * scaleX,
      pt.y * scaleY - PIN_ICON_SIZE.anchorY * scaleY,
      PIN_ICON_SIZE.width * scaleX,
      PIN_ICON_SIZE.height * scaleY,
    )
  }

  return canvas
}

async function exportColocationPdf(locations: ColocationLocation[], mapEl: HTMLDivElement | null, map: any) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Page 1: locations table
  doc.setFontSize(13)
  doc.setTextColor(24, 24, 27)
  doc.text('Colocation Locations', 14, 18)
  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}   ·   ${locations.length} location${locations.length !== 1 ? 's' : ''}`,
    14, 25,
  )

  autoTable(doc, {
    startY: 31,
    head: [['Location Name', 'SSNIT Branch', 'Commencement Date']],
    body: locations.map(loc => [loc.name, loc.ssnit_branch || '—', formatCommencementDate(loc.commencement_date)]),
    styles: { fontSize: 9.5, cellPadding: 4, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [232, 98, 26], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    tableLineColor: [228, 228, 231],
    tableLineWidth: 0.1,
    columnStyles: {
      0: { cellWidth: 68 },
      1: { cellWidth: 68 },
      2: { cellWidth: 46 },
    },
  })

  // Page 2: map of all locations
  if (mapEl && map) {
    const canvas = await captureMapWithPins(mapEl, map, locations)

    const aspect = canvas.width / canvas.height
    doc.addPage('a4', aspect >= 1 ? 'landscape' : 'portrait')

    const pageWidth  = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14
    const top = 24

    doc.setFontSize(13)
    doc.setTextColor(24, 24, 27)
    doc.text('Location Map', margin, 18)

    const maxW = pageWidth - margin * 2
    const maxH = pageHeight - top - margin
    let w = maxW
    let h = w / aspect
    if (h > maxH) { h = maxH; w = h * aspect }

    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (pageWidth - w) / 2, top, w, h)
  }

  const dateStamp = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  doc.save(`colocation-locations — ${dateStamp}.pdf`)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Colocation() {
  const { data: locations = [], isLoading } = useColocationLocations()
  const { mutateAsync: deleteLocation } = useDeleteLocation()
  const mapHandleRef = useRef<GhanaMapHandle>(null)

  const [addOpen,     setAddOpen]     = useState(false)
  const [editTarget,  setEditTarget]  = useState<ColocationLocation | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  async function handleDelete(loc: ColocationLocation) {
    if (!window.confirm(`Remove "${loc.name}"? This cannot be undone.`)) return
    try { await deleteLocation(loc.id); toast.success(`"${loc.name}" removed`) }
    catch (err) { toast.error((err as Error).message) }
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportColocationPdf(locations, mapHandleRef.current?.getElement() ?? null, mapHandleRef.current?.getMap())
    } catch (err) {
      toast.error((err as Error).message || 'Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row rounded-xl overflow-hidden border border-zinc-200"
      style={{ height: 'calc(100vh - 100px)' }}>

      {/* ── Map: bottom on mobile (order-2), left on desktop (order-1) ── */}
      <div className="order-2 md:order-1 relative min-w-0 flex-1 md:flex-1">
        <GhanaMap ref={mapHandleRef} locations={locations} />
      </div>

      {/* ── Table panel: top on mobile (order-1), right on desktop (order-2) ── */}
      <div className="order-1 md:order-2 flex flex-col min-w-0 bg-white flex-1 md:flex-none md:w-[45%] border-b border-zinc-200 md:border-b-0 md:border-l">

        {/* Panel header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fff' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#18181b' }}>Colocation Locations</p>
            <p style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
              {isLoading ? 'Loading…' : `${locations.length} location${locations.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              disabled={isExporting || isLoading || locations.length === 0}
            >
              {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Export
            </Button>
            <Button onClick={() => setAddOpen(true)} className="gap-1.5 h-8 text-xs">
              <Plus size={13} />
              Add New Location
            </Button>
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 56px', borderBottom: '1px solid #e4e4e7', background: '#fafafa', flexShrink: 0 }}>
          {['Location Name', 'SSNIT Branch', 'Commencement Date', ''].map((h, i) => (
            <div key={i} style={{
              padding: '9px 14px',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#71717a',
              textAlign: i === 3 ? 'center' : 'left',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#a1a1aa', fontSize: 13 }}>Loading…</div>
          ) : locations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <MapPin size={20} color="#a1a1aa" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#71717a' }}>No locations yet</p>
              <p style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>Click "Add New Location" to get started</p>
            </div>
          ) : locations.map((loc, i) => (
            <div
              key={loc.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 56px',
                alignItems: 'center',
                borderBottom: '1px solid #f4f4f5',
                background: i % 2 === 0 ? '#fff' : '#fafafa',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', minWidth: 0 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8621A', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {loc.name}
                </span>
              </div>
              <div style={{ padding: '11px 14px', fontSize: 12, color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {loc.ssnit_branch || '—'}
              </div>
              <div style={{ padding: '11px 14px', fontSize: 12, color: '#71717a' }}>
                {loc.commencement_date
                  ? new Date(loc.commencement_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '11px 8px' }}>
                <button
                  onClick={() => setEditTarget(loc)}
                  title="Edit"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(loc)}
                  title="Delete"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {locations.length > 0 && (
          <div style={{ padding: '7px 14px', borderTop: '1px solid #e4e4e7', background: '#fafafa', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#a1a1aa' }}>
              {locations.length} location{locations.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {addOpen    && <LocationModal key="add"           onClose={() => setAddOpen(false)}    />}
      {editTarget && <LocationModal key={editTarget.id} onClose={() => setEditTarget(null)} existing={editTarget} />}
    </div>
  )
}
