import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { usePartnership, useCreatePartnership, useUpdatePartnership } from '@/hooks/usePartnerships'
import { writeAudit } from '@/hooks/useAuditLog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  organization: z.string().optional(),
  description: z.string().optional(),
  proposed_value: z.coerce.number().optional(),
  start_date: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function PartnershipForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: partnership, isLoading: loading } = usePartnership(id ?? '')
  const createMutation = useCreatePartnership()
  const updateMutation = useUpdatePartnership()

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (partnership) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = partnership as any
      form.reset({
        title: p.title ?? '',
        organization: p.organization ?? '',
        description: p.description ?? '',
        proposed_value: p.proposed_value ?? undefined,
        start_date: p.start_date ?? '',
      })
    }
  }, [partnership, form])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      proposed_value: values.proposed_value ?? null,
      start_date: values.start_date || null,
    }

    if (isEdit) {
      await updateMutation.mutateAsync({ id: id!, values: payload })
      writeAudit({ action: 'updated', entity_type: 'partnership', entity_id: id!, entity_name: values.title })
      navigate(`/partnerships/${id}`)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await createMutation.mutateAsync(payload) as any
      writeAudit({ action: 'created', entity_type: 'partnership', entity_id: created.id, entity_name: created.title })
      navigate(`/partnerships/${created.id}`, { replace: true })
    }
  }

  if (isEdit && loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title={isEdit ? 'Edit Partnership' : 'New Partnership'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Partnership title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="organization" render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization</FormLabel>
                  <FormControl><Input placeholder="Partner organization name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="proposed_value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Numbers</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Partnership description…" rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Partnership'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
