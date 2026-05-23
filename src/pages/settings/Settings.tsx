import { useEffect, useState } from 'react'
import { useSettings, useUpdateSetting, useStatusLookup, useCreateStatus, useUpdateStatus, useDeleteStatus } from '@/hooks/useSettings'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import type { StatusLookup } from '@/types/database'

// ─── Status row ───────────────────────────────────────────────────────────────

function StatusRow({ status, onDeleted }: { status: StatusLookup; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(status.name)
  const [color, setColor] = useState(status.color ?? '#6b7280')
  const updateStatus = useUpdateStatus()
  const deleteStatus = useDeleteStatus()

  async function handleSave() {
    if (!name.trim()) return
    await updateStatus.mutateAsync({ id: status.id, values: { name: name.trim(), color } })
    setEditing(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete status "${status.name}"? This won't affect existing records.`)) return
    await deleteStatus.mutateAsync(status.id)
    onDeleted()
  }

  function handleCancel() {
    setName(status.name)
    setColor(status.color ?? '#6b7280')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="h-7 w-9 rounded border border-input cursor-pointer p-0.5 bg-transparent shrink-0"
          title="Pick colour"
        />
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          className="h-7 text-xs flex-1"
          autoFocus
        />
        <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleSave} disabled={updateStatus.isPending || !name.trim()} title="Save">
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCancel} title="Cancel">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 py-1.5 group">
      <span className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: status.color ?? '#6b7280' }} />
      <span className="text-sm flex-1">{status.name}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)} title="Edit">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleteStatus.isPending} title="Delete">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Add status form ──────────────────────────────────────────────────────────

function AddStatusForm({ nextSortOrder, onDone }: { nextSortOrder: number; onDone: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const createStatus = useCreateStatus()

  async function handleAdd() {
    if (!name.trim()) return
    await createStatus.mutateAsync({ name: name.trim(), color, sort_order: nextSortOrder })
    setName('')
    setColor('#6366f1')
    onDone()
  }

  return (
    <div className="flex items-center gap-2 pt-2 border-t mt-1">
      <input
        type="color"
        value={color}
        onChange={e => setColor(e.target.value)}
        className="h-7 w-9 rounded border border-input cursor-pointer p-0.5 bg-transparent shrink-0"
        title="Pick colour"
      />
      <Input
        placeholder="Status name…"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onDone() }}
        className="h-7 text-xs flex-1"
        autoFocus
      />
      <Button size="sm" className="h-7 text-xs px-2.5 shrink-0" onClick={handleAdd} disabled={createStatus.isPending || !name.trim()}>
        {createStatus.isPending ? '…' : 'Add'}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onDone} title="Cancel">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ─── Main settings page ───────────────────────────────────────────────────────

export function Settings() {
  const { data: settings, isLoading } = useSettings()
  const { data: statuses = [], isLoading: statusesLoading } = useStatusLookup()
  const updateMutation = useUpdateSetting()

  const [bestCase, setBestCase] = useState('')
  const [worstCase, setWorstCase] = useState('')
  const [addingStatus, setAddingStatus] = useState(false)

  useEffect(() => {
    if (settings) {
      setBestCase(settings.best_case_pct ?? '60')
      setWorstCase(settings.worst_case_pct ?? '30')
    }
  }, [settings])

  const saveProjection = async () => {
    await Promise.all([
      updateMutation.mutateAsync({ key: 'best_case_pct', value: bestCase }),
      updateMutation.mutateAsync({ key: 'worst_case_pct', value: worstCase }),
    ])
  }

  const nextSortOrder = (statuses as StatusLookup[]).reduce((max, s) => Math.max(max, s.sort_order ?? 0), 0) + 10

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Settings" subtitle="System-wide configuration" />

      {/* Projection settings */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold">Pipeline Projection Settings</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {isLoading ? (
            <><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="best-case">Best Case Realisation (%)</Label>
                <Input
                  id="best-case"
                  type="number"
                  min="0"
                  max="100"
                  value={bestCase}
                  onChange={e => setBestCase(e.target.value)}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">Percentage of proposed numbers expected to be realised in the best case scenario</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="worst-case">Worst Case Realisation (%)</Label>
                <Input
                  id="worst-case"
                  type="number"
                  min="0"
                  max="100"
                  value={worstCase}
                  onChange={e => setWorstCase(e.target.value)}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">Percentage of proposed numbers expected to be realised in the worst case scenario</p>
              </div>
              <Button onClick={saveProjection} size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Projection Settings'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status values */}
      <Card>
        <CardHeader className="py-3 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Status Values</CardTitle>
          {!addingStatus && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setAddingStatus(true)}>
              <Plus className="h-3 w-3" /> Add Status
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-xs text-muted-foreground mb-3">
            These statuses appear in the Status Tracker dropdown. Hover a row to edit or delete it.
          </p>
          {statusesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
            </div>
          ) : (statuses as StatusLookup[]).length === 0 && !addingStatus ? (
            <p className="text-sm text-muted-foreground py-2">No statuses yet. Add one above.</p>
          ) : (
            <div className="divide-y">
              {(statuses as StatusLookup[]).map(s => (
                <StatusRow key={s.id} status={s} onDeleted={() => {}} />
              ))}
              {addingStatus && (
                <AddStatusForm nextSortOrder={nextSortOrder} onDone={() => setAddingStatus(false)} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold">About</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Application</span>
            <span className="text-foreground font-medium">SBS System</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>Stack</span>
            <span className="text-foreground font-medium">React + Supabase</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>UI</span>
            <span className="text-foreground font-medium">Tailwind CSS + shadcn/ui</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
