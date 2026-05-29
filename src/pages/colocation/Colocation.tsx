import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapPin, Plus, X, Loader2, Pencil, Trash2 } from 'lucide-react'
import {
  useColocationLocations, useAddLocation, useUpdateLocation, useDeleteLocation,
  type ColocationLocation,
} from '@/hooks/useColocation'
import { GHANA_BOUNDS } from '@/data/ghana-boundary'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { toast } from 'sonner'

// Fetch via our own Vercel Edge API route — server-side fetch has no CORS
// restrictions, and the response is CDN-cached for 24 hours.
async function fetchGhanaRegions(): Promise<GeoJSON.GeoJsonObject> {
  const res = await fetch('/api/ghana-regions')
  if (!res.ok) throw new Error(`ghana-regions API returned ${res.status}`)
  return res.json() as Promise<GeoJSON.GeoJsonObject>
}

// ─── Marker icon (dot + name label combined) ──────────────────────────────────

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

// ─── Plain Ghana map ──────────────────────────────────────────────────────────

function GhanaMap({ locations }: { locations: ColocationLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  // Initialise map + fetch accurate Ghana boundary once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Reset stale Leaflet ID (React StrictMode double-mount)
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

    // Light blue-gray background so only Ghana is visible
    el.style.background = '#cfe0ea'

    map.fitBounds(GHANA_BOUNDS, { padding: [20, 20] })
    mapRef.current = map

    // Load Ghana's 16 regions — try sources in order until one succeeds
    let mounted = true
    fetchGhanaRegions()
      .then(data => {
        if (!mounted || !mapRef.current) return
        L.geoJSON(data, {
          style: {
            fillColor: '#eee8dc',
            fillOpacity: 1,
            color: '#8fa3b0',
            weight: 1,
          },
        }).addTo(map)
      })
      .catch(() => { /* all sources failed — map still works with markers only */ })

    return () => {
      mounted = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Re-sync markers whenever the locations list changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    locations.forEach(loc => {
      const marker = L.marker(
        [Number(loc.latitude), Number(loc.longitude)],
        { icon: makeIcon(loc.name) },
      ).addTo(map)
      markersRef.current.push(marker)
    })
  }, [locations])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}

// ─── Location modal (shared for add & edit) ────────────────────────────────────

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
    try {
      if (isEdit) {
        await updateLocation({ id: existing.id, name: name.trim(), latitude, longitude })
        toast.success(`"${name.trim()}" updated`)
      } else {
        await addLocation({ name: name.trim(), latitude, longitude })
        toast.success(`"${name.trim()}" added to map`)
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
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-orange-50">
            <MapPin size={14} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{isEdit ? 'Edit Location' : 'Add New Location'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Update location details' : 'Pin a location on the Ghana map'}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700">Name of Location</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Accra Office, Kumasi Hub"
              required
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Latitude</label>
              <Input
                type="number" step="any"
                value={lat} onChange={e => setLat(e.target.value)}
                placeholder="e.g. 5.6037" required className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Longitude</label>
              <Input
                type="number" step="any"
                value={lng} onChange={e => setLng(e.target.value)}
                placeholder="e.g. -0.1870" required className="h-9 text-sm"
              />
            </div>
          </div>
          <p className="text-[0.7rem] text-zinc-400">Ghana: approx. 4.5°–11.2° N, 3.3° W–1.2° E</p>
          <Button type="submit" disabled={isPending} className="w-full gap-2">
            {isPending
              ? <Loader2 size={14} className="animate-spin" />
              : isEdit ? <Pencil size={14} /> : <Plus size={14} />}
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Map'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function Colocation() {
  const { data: locations = [], isLoading } = useColocationLocations()
  const { mutateAsync: deleteLocation } = useDeleteLocation()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ColocationLocation | null>(null)

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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }}>

      {/* Page header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e4e4e7', background: 'white', flexShrink: 0 }}>
        <PageHeader
          title="Colocation"
          subtitle={`${locations.length} location${locations.length !== 1 ? 's' : ''} pinned`}
          actions={
            <Button onClick={() => setAddOpen(true)} className="gap-2 h-8 text-xs">
              <Plus size={13} />
              Add New Location
            </Button>
          }
        />
      </div>

      {/* Body: table left, map right */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Left: locations table ── */}
        <div style={{ width: '420px', flexShrink: 0, borderRight: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', background: 'white' }}>

          {/* Table header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px', padding: '10px 16px', borderBottom: '1px solid #e4e4e7', background: '#fafafa' }}>
            {['Name of Location', 'Coordinates', 'Actions'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#71717a', textAlign: h === 'Actions' ? 'center' : 'left' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Table body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}>
                <Loader2 size={20} className="animate-spin text-zinc-400" />
              </div>
            ) : locations.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <MapPin size={28} style={{ color: '#d4d4d8', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}>No locations yet</p>
                <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>Click "Add New Location" to get started</p>
              </div>
            ) : (
              locations.map((loc, i) => (
                <div
                  key={loc.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 72px',
                    padding: '11px 16px',
                    borderBottom: '1px solid #f4f4f5',
                    background: i % 2 === 0 ? 'white' : '#fafafa',
                    alignItems: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fff7ed')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafafa')}
                >
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, paddingRight: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8621A', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loc.name}
                    </span>
                  </div>

                  {/* Coordinates */}
                  <div style={{ paddingRight: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#52525b', fontFamily: 'monospace' }}>
                      {Number(loc.latitude).toFixed(4)}°
                    </span>
                    <br />
                    <span style={{ fontSize: '11px', color: '#52525b', fontFamily: 'monospace' }}>
                      {Number(loc.longitude).toFixed(4)}°
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <button
                      onClick={() => setEditTarget(loc)}
                      title="Edit"
                      style={{ padding: '5px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f4f4f5')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Pencil size={13} color="#71717a" />
                    </button>
                    <button
                      onClick={() => handleDelete(loc)}
                      title="Delete"
                      style={{ padding: '5px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Trash2 size={13} color="#f87171" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: plain Ghana map ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <GhanaMap locations={locations} />
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
