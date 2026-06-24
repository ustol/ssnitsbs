import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  useComplianceActivities,
  useCreateComplianceActivity,
  useUpdateComplianceActivity,
  useDeleteComplianceActivity,
  type ComplianceActivity,
} from '@/hooks/useComplianceActivities'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

const nonNegativeNumberString = (label: string) =>
  z.string().optional().refine(
    v => !v || (!isNaN(Number(v)) && Number(v) >= 0),
    { message: `${label} must be a non-negative number` },
  )

const schema = z.object({
  establishment_name: z.string().min(1, 'Establishment name is required'),
  er_no: z.string().optional(),
  date_registered: z.string().optional(),
  coverable_date: z.string().optional(),
  labour_force: nonNegativeNumberString('Labour force'),
  actual_contributions: nonNegativeNumberString('Actual contributions'),
  penalty: nonNegativeNumberString('Penalty'),
  enforcement_branch: z.string().optional(),
  remarks: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function EstablishmentDialog({
  open,
  onClose,
  onSave,
  initial,
  isSaving,
}: {
  open: boolean
  onClose: () => void
  onSave: (v: FormValues) => void
  initial?: ComplianceActivity | null
  isSaving: boolean
}) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const ac = form.watch('actual_contributions')
  const pen = form.watch('penalty')
  const total = (parseFloat(ac || '0') || 0) + (parseFloat(pen || '0') || 0)

  useEffect(() => {
    if (open) {
      form.reset({
        establishment_name: initial?.establishment_name ?? '',
        er_no: initial?.er_no ?? '',
        date_registered: initial?.date_registered ?? '',
        coverable_date: initial?.coverable_date ?? '',
        labour_force: initial?.labour_force != null ? String(initial.labour_force) : '',
        actual_contributions: initial?.actual_contributions != null ? String(initial.actual_contributions) : '',
        penalty: initial?.penalty != null ? String(initial.penalty) : '',
        enforcement_branch: initial?.enforcement_branch ?? '',
        remarks: initial?.remarks ?? '',
      })
    }
  }, [open, initial, form])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Establishment' : 'Add Establishment'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4 px-1 py-2" onSubmit={form.handleSubmit(onSave)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="establishment_name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Establishment Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Establishment name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="er_no" render={({ field }) => (
                <FormItem>
                  <FormLabel>ER No.</FormLabel>
                  <FormControl><Input placeholder="ER number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="enforcement_branch" render={({ field }) => (
                <FormItem>
                  <FormLabel>Enforcement Branch</FormLabel>
                  <FormControl><Input placeholder="Branch name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="date_registered" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Registered</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="coverable_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Coverable Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="labour_force" render={({ field }) => (
                <FormItem>
                  <FormLabel>Labour Force</FormLabel>
                  <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="actual_contributions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Contributions</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="penalty" render={({ field }) => (
                <FormItem>
                  <FormLabel>Penalty</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormItem>
                <FormLabel>Total</FormLabel>
                <Input
                  disabled
                  value={total.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  className="bg-zinc-50 text-zinc-500"
                />
              </FormItem>
            </div>

            <FormField control={form.control} name="remarks" render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks</FormLabel>
                <FormControl><Textarea placeholder="Additional remarks…" rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Add Establishment'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function LabourMinistry() {
  const { data: activities = [], isLoading } = useComplianceActivities()
  const createMutation = useCreateComplianceActivity()
  const updateMutation = useUpdateComplianceActivity()
  const deleteMutation = useDeleteComplianceActivity()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ComplianceActivity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ComplianceActivity | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const openAdd = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (a: ComplianceActivity) => { setEditing(a); setDialogOpen(true) }
  const closeDialog = () => { setDialogOpen(false); setEditing(null) }

  const handleSave = async (values: ReturnType<typeof useForm<z.infer<typeof schema>>>['getValues']) => {
    const payload = {
      establishment_name: values.establishment_name,
      er_no: values.er_no || null,
      date_registered: values.date_registered || null,
      coverable_date: values.coverable_date || null,
      labour_force: values.labour_force ? parseInt(values.labour_force) : null,
      actual_contributions: values.actual_contributions ? parseFloat(values.actual_contributions) : null,
      penalty: values.penalty ? parseFloat(values.penalty) : null,
      enforcement_branch: values.enforcement_branch || null,
      remarks: values.remarks || null,
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
      // error toast is handled by the mutation hook
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <PageHeader
        title="Compliance Activities"
        subtitle="Compliance engagement and activity tracker"
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Establishment
          </Button>
        }
      />

      <div className="rounded-xl border bg-white overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Establishment Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">ER No.</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Date Registered</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Coverable Date</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-zinc-500 whitespace-nowrap">Labour Force</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-zinc-500 whitespace-nowrap">Actual Contributions</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-zinc-500 whitespace-nowrap">Penalty</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-zinc-500 whitespace-nowrap">Total</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Enforcement Branch</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 whitespace-nowrap">Remarks</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-zinc-500 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-12 text-center text-sm text-zinc-400">
                  No compliance activities yet. Click <span className="font-medium">Add Establishment</span> to get started.
                </td>
              </tr>
            ) : (
              activities.map(a => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-zinc-50/60 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-zinc-800 whitespace-nowrap">{a.establishment_name}</td>
                  <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{a.er_no || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{a.date_registered ? formatDate(a.date_registered) : '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{a.coverable_date ? formatDate(a.coverable_date) : '—'}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-600 whitespace-nowrap">{a.labour_force != null ? a.labour_force.toLocaleString() : '—'}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-600 whitespace-nowrap">{fmt(a.actual_contributions)}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-600 whitespace-nowrap">{fmt(a.penalty)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-zinc-800 whitespace-nowrap">{fmt(a.total)}</td>
                  <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">{a.enforcement_branch || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-500 max-w-[180px] truncate" title={a.remarks ?? undefined}>{a.remarks || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
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

      <EstablishmentDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSave={handleSave}
        initial={editing}
        isSaving={isSaving}
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
