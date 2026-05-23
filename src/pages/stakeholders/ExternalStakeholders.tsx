import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import {
  useExternalStakeholders,
  useCreateExternalStakeholder,
  useUpdateExternalStakeholder,
  useDeleteExternalStakeholder,
} from '@/hooks/useStakeholders'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import type { ExternalStakeholder } from '@/types/database'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  organization: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ExternalStakeholders() {
  const { data = [], isLoading } = useExternalStakeholders()
  const createMutation = useCreateExternalStakeholder()
  const updateMutation = useUpdateExternalStakeholder()
  const deleteMutation = useDeleteExternalStakeholder()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ExternalStakeholder | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const openCreate = () => { setEditTarget(null); form.reset({}); setFormOpen(true) }
  const openEdit = (row: ExternalStakeholder) => {
    setEditTarget(row)
    form.reset({
      name: row.name,
      title: row.title ?? '',
      organization: row.organization ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      notes: row.notes ?? '',
    })
    setFormOpen(true)
  }

  const onSubmit = async (values: FormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
    setFormOpen(false)
  }

  const columns: Column<ExternalStakeholder>[] = [
    { key: 'name', header: 'Name', cell: row => <span className="font-medium">{row.name}</span> },
    { key: 'title', header: 'Contact Person', cell: row => row.title ?? '—' },
    { key: 'organization', header: 'Sector', cell: row => row.organization ?? '—' },
    { key: 'email', header: 'Email', cell: row => row.email ? <a href={`mailto:${row.email}`} className="text-brand hover:underline" onClick={e => e.stopPropagation()}>{row.email}</a> : '—' },
    { key: 'phone', header: 'Phone', cell: row => row.phone ?? '—' },
    {
      key: 'notes',
      header: 'Notes',
      cell: row => row.notes
        ? (
          <span
            className="block max-w-[220px] truncate text-muted-foreground italic text-xs"
            title={row.notes}
          >
            {row.notes}
          </span>
        )
        : <span className="text-muted-foreground/40 text-xs">—</span>,
      className: 'max-w-[220px]',
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
      className: 'w-[80px]',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="External Stakeholders"
        subtitle={`${data.length} contacts`}
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Stakeholder</Button>}
      />

      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        searchKeys={['name', 'organization', 'email'] as (keyof ExternalStakeholder)[]}
        searchPlaceholder="Search stakeholders…"
        emptyTitle="No external stakeholders yet"
        emptyDescription="Add contacts from partner organizations"
        emptyAction={<Button size="sm" onClick={openCreate}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Stakeholder</Button>}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{editTarget ? 'Edit Stakeholder' : 'Add External Stakeholder'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl><Input placeholder="e.g. Director" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="organization" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sector</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-zinc-50/60 flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Stakeholder'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) }) }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
