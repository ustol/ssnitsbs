import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  useInternalStakeholders,
  useCreateInternalStakeholder,
  useUpdateInternalStakeholder,
  useDeleteInternalStakeholder,
} from '@/hooks/useStakeholders'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import type { InternalStakeholder } from '@/types/database'

type InternalStakeholderWithCount = InternalStakeholder & {
  partnerships: { partnership_id: string }[]
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
})
type FormValues = z.infer<typeof schema>

export function InternalStakeholders() {
  const { data = [], isLoading } = useInternalStakeholders()
  const createMutation = useCreateInternalStakeholder()
  const updateMutation = useUpdateInternalStakeholder()
  const deleteMutation = useDeleteInternalStakeholder()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<InternalStakeholderWithCount | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const openCreate = () => {
    setEditTarget(null)
    form.reset({ name: '' })
    setFormOpen(true)
  }

  const openEdit = (row: InternalStakeholderWithCount) => {
    setEditTarget(row)
    form.reset({ name: row.name })
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

  const rows = data as InternalStakeholderWithCount[]

  const columns: Column<InternalStakeholderWithCount>[] = [
    {
      key: 'name',
      header: 'Office / Department Name',
      cell: row => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'partnerships',
      header: 'Partnerships',
      cell: row => {
        const count = row.partnerships?.length ?? 0
        return count > 0
          ? <span className="tabular-nums font-medium">{count}</span>
          : <span className="text-muted-foreground">—</span>
      },
      className: 'w-[140px] text-center',
    },
    {
      key: 'actions',
      header: '',
      cell: row => (
        <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteId(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      className: 'w-[80px]',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Internal Stakeholders"
        subtitle={`${rows.length} offices / departments`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Stakeholder
          </Button>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        loading={isLoading}
        searchKeys={['name'] as (keyof InternalStakeholderWithCount)[]}
        searchPlaceholder="Search offices / departments…"
        emptyTitle="No internal stakeholders yet"
        emptyAction={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Stakeholder
          </Button>
        }
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>
              {editTarget ? 'Edit Stakeholder' : 'Add Internal Stakeholder'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="px-6 py-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office / Department Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Special Business Support Office" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-zinc-50/60 flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving…'
                    : editTarget ? 'Save Changes' : 'Add Stakeholder'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
