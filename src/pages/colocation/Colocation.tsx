import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Plus, X, Loader2, Trash2 } from 'lucide-react'
import { useColocationLocations, useAddLocation, useDeleteLocation } from '@/hooks/useColocation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { toast } from 'sonner'

// Ghana center and bounds
const GHANA_CENTER: [number, number] = [7.9465, -1.0232]
const GHANA_ZOOM = 7

function makeIcon(name: string) {
  return L.divIcon({
    className: '',
    iconAnchor: [8, 8],
    html: `
      <div style="position:relative;text-align:center;pointer-events:none;">
        <div style="
          width:16px;height:16px;
          background:#E8621A;
          border:2.5px solid white;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
          margin:0 auto;
        "></div>
        <div style="
          position:absolute;
          top:20px;
          left:50%;
          transform:translateX(-50%);
          white-space:nowrap;
          font-size:11px;
          font-weight:600;
          color:#111827;
          background:rgba(255,255,255,0.92);
          padding:2px 6px;
          border-radius:4px;
          box-shadow:0 1px 4px rgba(0,0,0,0.18);
        ">${name}</div>
      </div>
    `,
  })
}

// ─── Add Location Modal ────────────────────────────────────────────────────────

interface AddModalProps {
  open: boolean
  onClose: () => void
}

function AddLocationModal({ open, onClose }: AddModalProps) {
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const { mutateAsync, isPending } = useAddLocation()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      toast.error('Latitude must be a number between -90 and 90')
      return
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      toast.error('Longitude must be a number between -180 and 180')
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
        {/* Header */}
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

        {/* Form */}
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

          <p className="text-[0.7rem] text-zinc-400 -mt-1">
            Ghana is roughly 4.5°–11.2° N, 3.3° W–1.2° E
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
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 52px)' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white shrink-0">
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

      {/* Map + sidebar layout */}
      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50">
              <Loader2 size={24} className="animate-spin text-zinc-400" />
            </div>
          ) : (
            <MapContainer
              center={GHANA_CENTER}
              zoom={GHANA_ZOOM}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {locations.map(loc => (
                <Marker
                  key={loc.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={makeIcon(loc.name)}
                >
                  <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                    <span className="text-xs font-medium">{loc.name}</span>
                    <br />
                    <span className="text-[0.65rem] text-zinc-500">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</span>
                  </Tooltip>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Locations list panel */}
        {locations.length > 0 && (
          <div className="w-64 border-l bg-white flex flex-col shrink-0">
            <div className="px-4 py-3 border-b">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Pinned Locations</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {locations.map(loc => (
                <div key={loc.id} className="flex items-start gap-2.5 px-4 py-3 group hover:bg-zinc-50 transition-colors">
                  <div className="mt-0.5 w-3 h-3 rounded-full bg-brand/80 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 truncate">{loc.name}</p>
                    <p className="text-[0.65rem] text-zinc-400 font-mono mt-0.5">
                      {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(loc.id, loc.name)}
                    title="Remove location"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 shrink-0"
                  >
                    <Trash2 size={12} className="text-red-400" />
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
