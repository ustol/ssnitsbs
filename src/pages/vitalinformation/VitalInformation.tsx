import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Info, Eye } from 'lucide-react'
import {
  useVitalInformationList,
  useCreateVitalInformation,
  useUpdateVitalInformation,
  useDeleteVitalInformation,
  type VitalInformationWithRelations,
} from '@/hooks/useVitalInformation'
import { usePartnerships } from '@/hooks/usePartnerships'
import { useExternalMeetings, useInternalMeetings } from '@/hooks/useMeetings'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

const NONE = '__none__'

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  subject: z.string().min(1, 'Subject is required'),
  details: z.string().optional(),
  partnership_id: z.string().min(1, 'Partnership is required'),
  external_meeting_id: z.string().optional(),
  internal_meeting_id: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface VitalInfoDialogProps {
  open: boolean
  onClose: () => void
  onSave: (v: FormValues) => void
  initial?: VitalInformationWithRelations | null
  isSaving: boolean
}

function VitalInfoDialog({ open, onClose, onSave, initial, isSaving }: VitalInfoDialogProps) {
  const { data: partnerships = [] } = usePartnerships()
  const { data: extMeetings = [] } = useExternalMeetings()
  const { data: intMeetings = [] } = useInternalMeetings()

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const partnershipId = form.watch('partnership_id')

  const scopedExtMeetings = useMemo(
    () => (extMeetings as { id: string; title: string; partnership_id: string | null }[]).filter(m => m.partnership_id === partnershipId),
    [extMeetings, partnershipId],
  )
  const scopedIntMeetings = useMemo(
    () => (intMeetings as { id: string; title: string; partnership_id: string | null }[]).filter(m => m.partnership_id === partnershipId),
    [intMeetings, partnershipId],
  )

  useEffect(() => {
    if (open) {
      form.reset({
        date: initial?.date ?? '',
        subject: initial?.subject ?? '',
        details: initial?.details ?? '',
        partnership_id: initial?.partnership_id ?? '',
        external_meeting_id: initial?.external_meeting_id ?? '',
        internal_meeting_id: initial?.internal_meeting_id ?? '',
      })
    }
  }, [open, initial, form])

  // Changing partnership invalidates any previously selected meeting
  function handlePartnershipChange(value: string) {
    form.setValue('partnership_id', value)
    form.setValue('external_meeting_id', '')
    form.setValue('internal_meeting_id', '')
  }

  function handleExternalMeetingChange(value: string) {
    form.setValue('external_meeting_id', value === NONE ? '' : value)
    if (value !== NONE) form.setValue('internal_meeting_id', '')
  }

  function handleInternalMeetingChange(value: string) {
    form.setValue('internal_meeting_id', value === NONE ? '' : value)
    if (value !== NONE) form.setValue('external_meeting_id', '')
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{initial ? 'Edit Vital Information' : 'Add Vital Information'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="px-6 py-5 space-y-4" onSubmit={form.handleSubmit(onSave)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="partnership_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Partnership <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value} onValueChange={handlePartnershipChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select partnership" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {partnerships.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Short heading for this information" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="details" render={({ field }) => (
              <FormItem>
                <FormLabel>Details <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea placeholder="The vital information itself…" rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="external_meeting_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>External Meeting <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <Select value={field.value || NONE} onValueChange={handleExternalMeetingChange} disabled={!partnershipId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Partnership-wide" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>— Partnership-wide —</SelectItem>
                      {scopedExtMeetings.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="internal_meeting_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Meeting <span className="text-xs text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <Select value={field.value || NONE} onValueChange={handleInternalMeetingChange} disabled={!partnershipId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Partnership-wide" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>— Partnership-wide —</SelectItem>
                      {scopedIntMeetings.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <p className="text-xs text-zinc-400 -mt-1">
              Leave both meeting fields unset for information that applies to the whole partnership. Picking one clears the other.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Add Information'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface VitalInfoViewDialogProps {
  item: VitalInformationWithRelations | null
  onClose: () => void
  onEdit: (v: VitalInformationWithRelations) => void
}

function VitalInfoViewDialog({ item, onClose, onEdit }: VitalInfoViewDialogProps) {
  return (
    <Dialog open={!!item} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{item?.subject}</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Date</p>
                <p className="text-sm mt-0.5">{formatDate(item.date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Partnership</p>
                <p className="text-sm mt-0.5">{item.partnership?.title ?? '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Scope</p>
              <div className="mt-1">
                {item.external_meeting ? (
                  <Badge variant="brand">{item.external_meeting.title}</Badge>
                ) : item.internal_meeting ? (
                  <Badge variant="info">{item.internal_meeting.title}</Badge>
                ) : (
                  <Badge variant="secondary">Partnership-wide</Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Details</p>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{item.details || '—'}</p>
            </div>
          </div>
        )}
        <DialogFooter className="px-6 pb-6">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          {item && <Button type="button" onClick={() => onEdit(item)}>Edit</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function VitalInformation() {
  const { data: items = [], isLoading } = useVitalInformationList()
  const createMutation = useCreateVitalInformation()
  const updateMutation = useUpdateVitalInformation()
  const deleteMutation = useDeleteVitalInformation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<VitalInformationWithRelations | null>(null)
  const [viewing, setViewing] = useState<VitalInformationWithRelations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VitalInformationWithRelations | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (v: VitalInformationWithRelations) => { setViewing(null); setEditing(v); setDialogOpen(true) }
  const closeDialog = () => { setDialogOpen(false); setEditing(null) }

  const handleSave = async (values: FormValues) => {
    const payload = {
      date: values.date,
      subject: values.subject,
      details: values.details || null,
      partnership_id: values.partnership_id,
      external_meeting_id: values.external_meeting_id || null,
      internal_meeting_id: values.internal_meeting_id || null,
    }

    setIsSaving(true)
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      closeDialog()
    } catch {
      // error toast handled by the mutation hook
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1200px] mx-auto">
      <PageHeader
        title="Vital Information"
        subtitle="Key context and notes tied to a partnership or a specific meeting"
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Information
          </Button>
        }
      />

      <div className="rounded-xl border bg-white overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Date</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Subject</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Partnership</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Scope</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Details</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-zinc-500 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-zinc-400">
                  <Info className="h-6 w-6 mx-auto mb-2 text-zinc-300" />
                  No vital information recorded yet. Click <span className="font-medium">Add Information</span> to get started.
                </td>
              </tr>
            ) : (
              items.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-zinc-50/60 transition-colors">
                  <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{formatDate(v.date)}</td>
                  <td className="px-3 py-2.5 font-medium text-zinc-800 whitespace-nowrap">{v.subject}</td>
                  <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{v.partnership?.title ?? '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {v.external_meeting ? (
                      <Badge variant="brand">{v.external_meeting.title}</Badge>
                    ) : v.internal_meeting ? (
                      <Badge variant="info">{v.internal_meeting.title}</Badge>
                    ) : (
                      <Badge variant="secondary">Partnership-wide</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500 max-w-[260px] truncate" title={v.details ?? undefined}>{v.details || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewing(v)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                        title="View"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <VitalInfoDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSave={handleSave}
        initial={editing}
        isSaving={isSaving}
      />

      <VitalInfoViewDialog
        item={viewing}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
      />

      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
