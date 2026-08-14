import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Plus, X, MapPin, Pencil, Trash2, Loader2, Download, Share2, Search } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  getMap: () => any
  flyTo: (lat: number, lng: number) => void
  resetView: () => void
  getFocusedRegionFeature: () => any | null
}

// Icon size [28,36], anchored at [14,36] (bottom-center tip = the geographic point).
// Shared between the live Leaflet divIcon and the PDF export's canvas-drawn pins.
const PIN_ICON_SIZE = { width: 20, height: 25, anchorX: 10, anchorY: 25 }
const PIN_COLOR_OPERATIONAL = '#f4a234'
const PIN_COLOR_DEFAULT     = '#4b5563'

function buildPinSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="25" viewBox="0 0 28 36">
  <path d="M14 0C8.477 0 4 4.477 4 10c0 7.5 10 26 10 26S24 17.5 24 10C24 4.477 19.523 0 14 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
  <circle cx="14" cy="10" r="4" fill="#fff"/>
</svg>`
}

function pinColor(loc: ColocationLocation): string {
  return loc.category === 'Operational' ? PIN_COLOR_OPERATIONAL : PIN_COLOR_DEFAULT
}

// ─── Region helpers ───────────────────────────────────────────────────────────

function pointInRing(px: number, py: number, ring: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (((yi > py) !== (yj > py)) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}

function featureContainsPoint(feature: any, lat: number, lng: number): boolean {
  const geom = feature?.geometry
  if (!geom) return false
  const polys: [number, number][][][] =
    geom.type === 'Polygon'      ? [geom.coordinates] :
    geom.type === 'MultiPolygon' ? geom.coordinates   : []
  return polys.some(poly => pointInRing(lng, lat, poly[0]))
}

function featureBounds(feature: any): [[number, number], [number, number]] | null {
  const geom = feature?.geometry
  if (!geom) return null
  const pts: number[][] = []
  const collect = (v: any) => Array.isArray(v[0]) ? v.forEach(collect) : pts.push(v)
  collect(geom.coordinates)
  if (!pts.length) return null
  return [
    [Math.min(...pts.map(p => p[1])), Math.min(...pts.map(p => p[0]))],
    [Math.max(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0]))],
  ]
}

// Builds a world-sized polygon with the selected region cut out as a hole.
// Leaflet's evenodd fill rule renders the area outside the hole as solid,
// completely masking every other region, tile content, and label.
function buildMaskFeature(feature: any): any | null {
  const geom = feature?.geometry
  if (!geom) return null
  const world: [number, number][] = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]
  const holes: [number, number][][]=
    geom.type === 'Polygon'      ? [geom.coordinates[0]]                   :
    geom.type === 'MultiPolygon' ? geom.coordinates.map((p: any) => p[0]) : []
  if (!holes.length) return null
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [world, ...holes] }, properties: {} }
}

// ─── Ghana Map ────────────────────────────────────────────────────────────────

const GhanaMap = forwardRef<GhanaMapHandle, { locations: ColocationLocation[]; showLabels: boolean; hoveredId: string | null }>(function GhanaMap({ locations, showLabels, hoveredId }, ref) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<any>(null)
  const markersRef      = useRef<Record<string, any>>({})
  const colorsRef       = useRef<Record<string, string>>({})
  const geojsonDataRef     = useRef<any>(null)
  const regionsLayerRef    = useRef<any>(null)
  const tileLayerRef       = useRef<any>(null)
  const maskLayerRef       = useRef<any>(null)
  const focusedFeatureRef  = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    getFocusedRegionFeature: () => focusedFeatureRef.current,

    flyTo: (lat: number, lng: number) => {
      const map = mapRef.current
      if (!map || typeof L === 'undefined') return

      const features: any[] = geojsonDataRef.current?.type === 'FeatureCollection'
        ? geojsonDataRef.current.features : []
      const match = features.find(f => featureContainsPoint(f, lat, lng))
      focusedFeatureRef.current = match ?? null

      // Hide markers outside the focused region
      Object.values(markersRef.current).forEach((m: any) => {
        const { lat: mlat, lng: mlng } = m.getLatLng()
        const el = m.getElement()
        if (el) el.style.display = (match && !featureContainsPoint(match, mlat, mlng)) ? 'none' : ''
      })

      // Remove previous layers
      if (regionsLayerRef.current) { regionsLayerRef.current.remove(); regionsLayerRef.current = null }
      if (maskLayerRef.current)    { maskLayerRef.current.remove();    maskLayerRef.current    = null }

      // Add OSM street tiles first (lowest z-order)
      if (!tileLayerRef.current) {
        tileLayerRef.current = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { maxZoom: 19, attribution: '© OpenStreetMap contributors' },
        ).addTo(map)
        tileLayerRef.current.bringToBack()
      }

      // Solid mask covering everything outside the selected region
      if (match) {
        const maskFeat = buildMaskFeature(match)
        if (maskFeat) {
          maskLayerRef.current = L.geoJSON(maskFeat, {
            style: { fillColor: '#87ceeb', fillOpacity: 1, color: 'none', weight: 0 },
          }).addTo(map)
        }
        // Region border on top of the mask
        regionsLayerRef.current = L.geoJSON(match, {
          style: { fillColor: 'transparent', fillOpacity: 0, color: '#c24a00', weight: 2.5 },
        }).addTo(map)
      }

      // Fit to region bounds so the whole region is centred
      const bounds = match ? featureBounds(match) : null
      if (bounds) map.fitBounds(bounds, { padding: [40, 40] })
      else map.flyTo([lat, lng], 10, { duration: 0.9 })
    },

    resetView: () => {
      const map = mapRef.current
      if (!map || typeof L === 'undefined') return

      focusedFeatureRef.current = null

      // Restore all markers
      Object.values(markersRef.current).forEach((m: any) => {
        const el = m.getElement()
        if (el) el.style.display = ''
      })

      // Tear down region-view layers
      if (tileLayerRef.current) { tileLayerRef.current.remove(); tileLayerRef.current = null }
      if (maskLayerRef.current) { maskLayerRef.current.remove(); maskLayerRef.current = null }
      if (regionsLayerRef.current) { regionsLayerRef.current.remove(); regionsLayerRef.current = null }

      // Restore full burnt-orange Ghana regions
      if (geojsonDataRef.current) {
        regionsLayerRef.current = L.geoJSON(geojsonDataRef.current, {
          style: { fillColor: '#e85d04', fillOpacity: 1, color: '#c24a00', weight: 1 },
        }).addTo(map)
      }

      map.fitBounds(GHANA_BOUNDS, { padding: [16, 16] })
    },
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
    el.style.background = '#87ceeb'
    map.fitBounds(GHANA_BOUNDS, { padding: [16, 16] })
    mapRef.current = map

    let mounted = true
    fetch('/api/ghana-regions')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (!mounted || !mapRef.current) return
        geojsonDataRef.current = data
        regionsLayerRef.current = L.geoJSON(data, {
          style: { fillColor: '#e85d04', fillOpacity: 1, color: '#c24a00', weight: 1 },
        }).addTo(map)
      })
      .catch(() => {})

    return () => {
      mounted = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Sync markers whenever locations or label visibility changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || typeof L === 'undefined') return

    // Remove old markers
    Object.values(markersRef.current).forEach((m: any) => m.remove())
    markersRef.current = {}
    colorsRef.current  = {}

    const iconCache: Record<string, any> = {}
    const getIcon = (color: string) => {
      if (!iconCache[color]) {
        iconCache[color] = L.divIcon({
          className: '',
          iconSize: [PIN_ICON_SIZE.width, PIN_ICON_SIZE.height],
          iconAnchor: [PIN_ICON_SIZE.anchorX, PIN_ICON_SIZE.anchorY],
          tooltipAnchor: [0, -38],
          // Wrap in a div so hover scaling targets the inner element,
          // leaving Leaflet's outer transform: translate(x,y) intact.
          html: `<div style="width:100%;height:100%;transition:transform 0.15s ease;transform-origin:50% 100%">${buildPinSvg(color)}</div>`,
        })
      }
      return iconCache[color]
    }

    locations.forEach(loc => {
      const lat = Number(loc.latitude)
      const lng = Number(loc.longitude)
      if (isNaN(lat) || isNaN(lng)) return

      const marker = L.marker([lat, lng], { icon: getIcon(pinColor(loc)) })

      if (showLabels) {
        // offset compensates the icon's tooltipAnchor ([0,-38], tuned for
        // direction:'top') so the label instead sits beside the pin's head.
        marker.bindTooltip(loc.name, {
          permanent: true,
          direction: 'right',
          offset: [20, 12],
          opacity: 1,
          className: 'colocation-label',
        })
      } else {
        marker.bindTooltip(
          `<strong>${loc.name}</strong>`
          + (loc.ssnit_branch ? `<br/><span style="font-size:11px;color:#555">${loc.ssnit_branch}</span>` : ''),
          { direction: 'top', offset: [0, -4], opacity: 0.95 },
        )
      }
      marker.addTo(map)
      markersRef.current[loc.id] = marker
      colorsRef.current[loc.id]  = pinColor(loc)
    })

    // If a region is already focused, hide markers outside it
    const focused = focusedFeatureRef.current
    if (focused) {
      Object.values(markersRef.current).forEach((m: any) => {
        const { lat, lng } = m.getLatLng()
        const el = m.getElement()
        if (el) el.style.display = featureContainsPoint(focused, lat, lng) ? '' : 'none'
      })
    }
  }, [locations, showLabels])

  // Hover highlight — scales the inner wrapper div and swaps SVG color to black.
  // Targets firstElementChild so Leaflet's outer transform: translate(x,y) is never touched.
  useEffect(() => {
    // Reset every marker to its original color and size
    Object.entries(markersRef.current).forEach(([id, m]: [string, any]) => {
      const inner = m.getElement()?.firstElementChild as HTMLElement | null
      if (inner) {
        inner.style.transform = ''
        inner.innerHTML = buildPinSvg(colorsRef.current[id] ?? PIN_COLOR_DEFAULT)
      }
      if (!showLabels) m.closeTooltip()
    })

    if (!hoveredId) return
    const m = markersRef.current[hoveredId]
    if (!m) return

    const inner = m.getElement()?.firstElementChild as HTMLElement | null
    if (inner) {
      inner.style.transform = 'scale(1.5)'
      inner.innerHTML = buildPinSvg('#18181b')
    }
    if (!showLabels) m.openTooltip()
  }, [hoveredId, showLabels])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
})

// ─── Location Modal ───────────────────────────────────────────────────────────

interface LocationModalProps {
  onClose: () => void
  existing?: ColocationLocation
}

function LocationModal({ onClose, existing }: LocationModalProps) {
  const isEdit = !!existing
  const [name,     setName]     = useState(existing?.name ?? '')
  const [branch,   setBranch]   = useState(existing?.ssnit_branch ?? '')
  const [lat,      setLat]      = useState(existing ? String(existing.latitude)  : '')
  const [lng,      setLng]      = useState(existing ? String(existing.longitude) : '')
  const [date,     setDate]     = useState(existing?.commencement_date ?? '')
  const [category, setCategory] = useState<'Planned' | 'Operational' | ''>(existing?.category ?? '')

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
      category: (category || null) as 'Planned' | 'Operational' | null,
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
            <label className="text-xs font-medium text-zinc-700">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as 'Planned' | 'Operational' | '')}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-zinc-900"
            >
              <option value="">— Select category —</option>
              <option value="Planned">Planned</option>
              <option value="Operational">Operational</option>
            </select>
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

// ─── Share ────────────────────────────────────────────────────────────────────

function googleMapsDirectionsUrl(loc: ColocationLocation): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
}

async function shareLocation(loc: ColocationLocation) {
  const url = googleMapsDirectionsUrl(loc)
  const text = loc.ssnit_branch ? `${loc.name} — ${loc.ssnit_branch}` : loc.name

  if (navigator.share) {
    try {
      await navigator.share({ title: loc.name, text, url })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Failed to share location')
    }
    return
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    toast.success('Location link copied to clipboard')
  } catch {
    toast.error('Failed to copy location link')
  }
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

async function fetchGhanaRegions(): Promise<any | null> {
  try {
    const res = await fetch('/api/ghana-regions')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// [lng, lat] rings, grouped per polygon (each polygon: outer ring + optional hole rings)
function extractPolygonRings(geojson: any): [number, number][][][] {
  const features = geojson?.type === 'FeatureCollection' ? geojson.features : geojson ? [geojson] : []
  const polygons: [number, number][][][] = []
  for (const feature of features) {
    const geom = feature?.geometry
    if (!geom) continue
    if (geom.type === 'Polygon') polygons.push(geom.coordinates)
    else if (geom.type === 'MultiPolygon') polygons.push(...geom.coordinates)
  }
  return polygons
}

interface RenderOpts { showLabels?: boolean; focusedFeature?: any }

async function renderGhanaMapCanvas(
  map: any,
  locations: ColocationLocation[],
  { showLabels = false, focusedFeature }: RenderOpts = {},
): Promise<HTMLCanvasElement> {
  const RES = 3
  const PAD = 32

  const validLocations = locations.filter(loc => !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude)))

  // Canvas extent: focused region bounds or full Ghana bounds
  const extentBounds = focusedFeature ? featureBounds(focusedFeature) : null
  const sw = map.latLngToContainerPoint(extentBounds ? extentBounds[0] : [GHANA_BOUNDS[0][0], GHANA_BOUNDS[0][1]])
  const ne = map.latLngToContainerPoint(extentBounds ? extentBounds[1] : [GHANA_BOUNDS[1][0], GHANA_BOUNDS[1][1]])

  const markerPoints = validLocations.map(loc => map.latLngToContainerPoint([Number(loc.latitude), Number(loc.longitude)]))
  const xs = [sw.x, ne.x, ...markerPoints.map(p => p.x)]
  const ys = [sw.y, ne.y, ...markerPoints.map(p => p.y)]
  const left   = Math.min(...xs) - PAD
  const right  = Math.max(...xs) + PAD
  const top    = Math.min(...ys) - PAD - PIN_ICON_SIZE.height
  const bottom = Math.max(...ys) + PAD

  const canvas = document.createElement('canvas')
  canvas.width  = Math.round((right - left) * RES)
  canvas.height = Math.round((bottom - top) * RES)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const project = (lat: number, lng: number) => {
    const pt = map.latLngToContainerPoint([lat, lng])
    return { x: (pt.x - left) * RES, y: (pt.y - top) * RES }
  }

  const drawPolygons = (rings: [number, number][][][], fill: string, stroke: string) => {
    ctx.fillStyle = fill
    ctx.strokeStyle = stroke
    ctx.lineWidth = RES
    for (const polygon of rings) {
      ctx.beginPath()
      for (const ring of polygon) {
        ring.forEach(([lng, lat], i) => {
          const { x, y } = project(lat, lng)
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        })
        ctx.closePath()
      }
      ctx.fill('evenodd')
      ctx.stroke()
    }
  }

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (focusedFeature) {
    // Sky-blue surround + focused region fill
    ctx.fillStyle = '#87ceeb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawPolygons(extractPolygonRings(focusedFeature), '#e85d04', '#c24a00')
  } else {
    // All Ghana regions
    const regions = await fetchGhanaRegions()
    if (regions) drawPolygons(extractPolygonRings(regions), '#e85d04', '#c24a00')
  }

  // Pins
  const pinImgCache: Record<string, HTMLImageElement> = {}
  const getPinImg = async (color: string) => {
    if (!pinImgCache[color]) {
      pinImgCache[color] = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildPinSvg(color))}`)
    }
    return pinImgCache[color]
  }
  for (const loc of validLocations) {
    const { x, y } = project(Number(loc.latitude), Number(loc.longitude))
    const img = await getPinImg(pinColor(loc))
    ctx.drawImage(img, x - PIN_ICON_SIZE.anchorX * RES, y - PIN_ICON_SIZE.anchorY * RES, PIN_ICON_SIZE.width * RES, PIN_ICON_SIZE.height * RES)
  }

  // Labels (when enabled)
  if (showLabels && validLocations.length) {
    ctx.save()
    ctx.font = `600 ${8 * RES}px Inter, sans-serif`
    ctx.textBaseline = 'middle'
    for (const loc of validLocations) {
      const { x, y } = project(Number(loc.latitude), Number(loc.longitude))
      const lx = x + (PIN_ICON_SIZE.anchorX + 3) * RES
      const ly = y - PIN_ICON_SIZE.anchorY * RES * 0.55
      const tw = ctx.measureText(loc.name).width
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fillRect(lx - 2 * RES, ly - 5 * RES, tw + 4 * RES, 10 * RES)
      ctx.fillStyle = '#18181b'
      ctx.fillText(loc.name, lx, ly)
    }
    ctx.restore()
  }

  return canvas
}

interface ExportOpts { showLabels: boolean; focusedFeature: any | null }

async function exportColocationPdf(locations: ColocationLocation[], map: any, opts: ExportOpts) {
  const { showLabels, focusedFeature } = opts
  const isRegionMode = !!focusedFeature

  // In region mode export only locations inside the focused region
  const exportLocations = isRegionMode
    ? locations.filter(loc => featureContainsPoint(focusedFeature, Number(loc.latitude), Number(loc.longitude)))
    : locations

  // Try common GeoJSON property names for the region label
  const regionName: string = isRegionMode
    ? (focusedFeature?.properties?.NAME_1 || focusedFeature?.properties?.name ||
       focusedFeature?.properties?.region  || focusedFeature?.properties?.REGION || 'Selected Region')
    : ''

  const dateStr = new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Page 1: table ──────────────────────────────────────────────────────────
  doc.setFontSize(13)
  doc.setTextColor(24, 24, 27)
  doc.text(isRegionMode ? `Colocation — ${regionName}` : 'Colocation Locations', 14, 18)

  doc.setFontSize(8)
  doc.setTextColor(113, 113, 122)
  doc.text(
    `Generated: ${dateStr}   ·   ${exportLocations.length} location${exportLocations.length !== 1 ? 's' : ''}` +
    (showLabels ? '   ·   Labels on' : ''),
    14, 25,
  )

  autoTable(doc, {
    startY: 31,
    head: [['Location Name', 'SSNIT Branch', 'Category', 'Commencement Date']],
    body: exportLocations.map(loc => [
      loc.name,
      loc.ssnit_branch || '—',
      loc.category     || '—',
      formatCommencementDate(loc.commencement_date),
    ]),
    styles: { fontSize: 9.5, cellPadding: 4, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [232, 98, 26], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    tableLineColor: [228, 228, 231],
    tableLineWidth: 0.1,
    columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 55 }, 2: { cellWidth: 30 }, 3: { cellWidth: 40 } },
  })

  // ── Page 2: map ────────────────────────────────────────────────────────────
  if (map) {
    const canvas = await renderGhanaMapCanvas(map, exportLocations, { showLabels, focusedFeature })
    doc.addPage('a4', 'portrait')

    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 14, mapTop = 24

    doc.setFontSize(13)
    doc.setTextColor(24, 24, 27)
    doc.text(isRegionMode ? `${regionName} — Location Map` : 'Location Map', margin, 18)

    const aspect = canvas.width / canvas.height
    const maxW = pageW - margin * 2
    const maxH = pageH - mapTop - margin
    let w = maxW, h = w / aspect
    if (h > maxH) { h = maxH; w = h * aspect }

    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (pageW - w) / 2, mapTop, w, h)
  }

  const stamp = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  const slug  = isRegionMode ? regionName.toLowerCase().replace(/\s+/g, '-') : 'locations'
  doc.save(`colocation-${slug} — ${stamp}.pdf`)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Colocation() {
  const { data: locations = [], isLoading } = useColocationLocations()
  const { mutateAsync: deleteLocation } = useDeleteLocation()
  const mapHandleRef = useRef<GhanaMapHandle>(null)

  const [addOpen,     setAddOpen]     = useState(false)
  const [editTarget,  setEditTarget]  = useState<ColocationLocation | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showLabels,  setShowLabels]  = useState(false)
  const [search,      setSearch]      = useState('')
  const [hoveredId,   setHoveredId]   = useState<string | null>(null)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)

  function handleSelectLocation(loc: ColocationLocation) {
    const lat = Number(loc.latitude)
    const lng = Number(loc.longitude)
    if (isNaN(lat) || isNaN(lng)) return
    setSelectedId(loc.id)
    mapHandleRef.current?.flyTo(lat, lng)
  }

  function handleResetView() {
    setSelectedId(null)
    mapHandleRef.current?.resetView()
  }

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return locations
    return locations.filter(loc =>
      loc.name.toLowerCase().includes(q) || (loc.ssnit_branch ?? '').toLowerCase().includes(q),
    )
  }, [locations, search])

  async function handleDelete(loc: ColocationLocation) {
    if (!window.confirm(`Remove "${loc.name}"? This cannot be undone.`)) return
    try { await deleteLocation(loc.id); toast.success(`"${loc.name}" removed`) }
    catch (err) { toast.error((err as Error).message) }
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportColocationPdf(locations, mapHandleRef.current?.getMap(), {
        showLabels: showLabels,
        focusedFeature: mapHandleRef.current?.getFocusedRegionFeature() ?? null,
      })
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
        <GhanaMap ref={mapHandleRef} locations={filteredLocations} showLabels={showLabels} hoveredId={hoveredId} />

        {selectedId && (
          <button
            type="button"
            onClick={handleResetView}
            className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur-sm"
          >
            ← All locations
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowLabels(v => !v)}
          className="absolute top-3 right-3 z-[1000] flex items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur-sm"
        >
          Labels
          <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showLabels ? 'bg-brand' : 'bg-zinc-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${showLabels ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </span>
        </button>
      </div>

      {/* ── Table panel: top on mobile (order-1), right on desktop (order-2) ── */}
      <div className="order-1 md:order-2 flex flex-col min-w-0 bg-white flex-1 md:flex-none md:w-[45%] border-b border-zinc-200 md:border-b-0 md:border-l">

        {/* Panel header */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fff' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#18181b' }}>Colocation Locations</p>
            <p style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
              {isLoading
                ? 'Loading…'
                : search
                  ? `${filteredLocations.length} of ${locations.length} location${locations.length !== 1 ? 's' : ''}`
                  : `${locations.length} location${locations.length !== 1 ? 's' : ''}`}
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

        {/* Search */}
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid #e4e4e7', flexShrink: 0, background: '#fff' }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Search locations or branches…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 76px 86px 72px', borderBottom: '1px solid #e4e4e7', background: '#fafafa', flexShrink: 0 }}>
          {['Location Name', 'SSNIT Branch', 'Category', 'Date', ''].map((h, i) => (
            <div key={i} style={{
              padding: '9px 14px',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: '#71717a',
              textAlign: i === 4 ? 'center' : 'left',
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
          ) : filteredLocations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Search size={20} color="#a1a1aa" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#71717a' }}>No matches found</p>
              <p style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>No locations match "{search}"</p>
            </div>
          ) : filteredLocations.map((loc, i) => (
            <div
              key={loc.id}
              onMouseEnter={() => setHoveredId(loc.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSelectLocation(loc)}
              style={{
                display: 'grid', gridTemplateColumns: '1.2fr 1fr 76px 86px 72px',
                alignItems: 'center',
                borderBottom: '1px solid #f4f4f5',
                background: selectedId === loc.id ? '#fff0e6'
                          : hoveredId === loc.id  ? '#fff7f3'
                          : i % 2 === 0           ? '#fff'
                          :                         '#fafafa',
                cursor: 'pointer',
                outline: selectedId === loc.id ? '2px solid #E8621A' : 'none',
                outlineOffset: '-2px',
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
              <div style={{ padding: '11px 10px' }}>
                {loc.category ? (
                  <span style={{
                    display: 'inline-block',
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: loc.category === 'Operational' ? '#dcfce7' : '#f4f4f5',
                    color:      loc.category === 'Operational' ? '#15803d'  : '#52525b',
                  }}>
                    {loc.category}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#a1a1aa' }}>—</span>
                )}
              </div>
              <div style={{ padding: '11px 14px', fontSize: 12, color: '#71717a' }}>
                {loc.commencement_date
                  ? new Date(loc.commencement_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '11px 8px' }}>
                <button
                  onClick={() => shareLocation(loc)}
                  title="Share"
                  className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                >
                  <Share2 size={12} />
                </button>
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
        {filteredLocations.length > 0 && (
          <div style={{ padding: '7px 14px', borderTop: '1px solid #e4e4e7', background: '#fafafa', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#a1a1aa' }}>
              {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
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
