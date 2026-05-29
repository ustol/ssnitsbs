import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapPin, Plus, X, Loader2, Trash2 } from 'lucide-react'
import { useColocationLocations, useAddLocation, useDeleteLocation, type ColocationLocation } from '@/hooks/useColocation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { toast } from 'sonner'

// Ghana center
const GHANA_CENTER: [number, number] = [7.9465, -1.0232]
const GHANA_ZOOM = 7

function makeIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconAnchor: [8, 8],
    html: `<div style="position:relative;text-align:center;">
      <div style="width:16px;height:16px;background:#E8621A;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);margin:0 auto;"></div>
      <div style="position:absolute;top:20px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:600;color:#111827;background:rgba(255,255,255,0.92);padding:2px 6px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.18);">${name}</div>
    </div>`,
  })
}

// ─── Ghana Map (plain Leaflet via useEffect) ───────────────────────────────────

function GhanaMap({ locations }: { locations: ColocationLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  // Initialise map once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Remove any stale Leaflet ID from React StrictMode double-mount
    delete (el as unknown as Record<string, unknown>)['_leaflet_id']

    const map = L.map(el, { center: GHANA_CENTER, zoom: GHANA_ZOOM })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Sync markers whenever locations change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    locations.forEach(loc => {
      const marker = L.marker([Number(loc.latitude), Number(loc.longitude)], {
        icon: makeIcon(loc.name),
      })
      marker.bindTooltip(
        `<strong>${loc.name}</strong><br/><span style="font-size:11px;color:#666">${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}</span>`,
        { direction: 'top', offset: [0, -20] },
      )
      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }, [locations])

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
}

// ─── Add Location Modal ────────────────────────────────────────────────────────

function AddLocationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const { mutateAsync, isPending } = useAddLocation()

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
      await mutateAsync({ name: name.trim(), latitude, longitude })
      toast.success(`"${name.trim()}" added to map`)
      setName('')
      setLat('')
      setLng('')
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function handleClose() {
    setName('')
    setLat('')
    setLng('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-orange-50">
            <MapPin size={14} className="text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">Add New Location</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pin a location on the Ghana map</p>
          </div>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0">
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
                type="number"
                step="any"
                value={lat}
                onChange={e => setLat(e.target.value)}
                placeholder="e.g. 5.6037"
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700">Longitude</label>
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

          <p className="text-[0.7rem] text-zinc-400">
            Ghana: approx. 4.5°–11.2° N, 3.3° W–1.2° E
          </p>

          <Button type="submit" disabled={isPending} className="w-full gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isPending ? 'Adding…' : 'Add to Map'}
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
  const [modalOpen, setModalOpen] = useState(false)

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remove "${name}" from the map?`)) return
    try {
      await deleteLocation(id)
      toast.success(`"${name}" removed`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e4e4e7', background: 'white', flexShrink: 0 }}>
        <PageHeader
          title="Colocation"
          subtitle={`${locations.length} location${locations.length !== 1 ? 's' : ''} pinned`}
          actions={
            <Button onClick={() => setModalOpen(true)} className="gap-2 h-8 text-xs">
              <Plus size={13} />
              Add New Location
            </Button>
          }
        />
      </div>

      {/* Map + list layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          {isLoading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
              <Loader2 size={24} className="animate-spin text-zinc-400" />
            </div>
          ) : (
            <GhanaMap locations={locations} />
          )}
        </div>

        {/* Locations list panel */}
        {locations.length > 0 && (
          <div style={{ width: '260px', borderLeft: '1px solid #e4e4e7', background: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e4e7' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a' }}>
                Pinned Locations
              </p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {locations.map(loc => (
                <div
                  key={loc.id}
                  className="group"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderBottom: '1px solid #f4f4f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E8621A', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loc.name}
                    </p>
                    <p style={{ fontSize: '11px', color: '#a1a1aa', fontFamily: 'monospace', marginTop: '2px' }}>
                      {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(loc.id, loc.name)}
                    title="Remove location"
                    style={{ opacity: 0, padding: '2px', borderRadius: '4px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#fee2e2' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.background = 'none' }}
                    className="group-hover:!opacity-100"
                  >
                    <Trash2 size={12} color="#f87171" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AddLocationModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
