import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useDDGFeedback, useCreateDDGFeedback, useUpdateDDGFeedback } from '@/hooks/useDDGFeedback'
import { usePartnerships } from '@/hooks/usePartnerships'
import { useExternalStakeholders } from '@/hooks/useStakeholders'
import { PageHeader } from '@/components/shared/PageHeader'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import type { PartnershipWithRelations, ExternalStakeholder } from '@/types/database'

const FEEDBACK_TYPES = ['Complaint', 'Commendation', 'Suggestion', 'Query', 'Other'] as const

const schema = z.object({
  feedback_type: z.string().min(1, 'Type is required'),
  partnership_id: z.string().optional(),
  stakeholder_id: z.string().optional(),
  received_date: z.string().optional(),
  summary: z.string().min(1, 'Summary is required'),
  details: z.string().optional(),
  action_taken: z.string().optional(),
  is_actioned: z.boolean().default(false),
})
type FormValues = z.infer<typeof schema>

export function DDGFeedbackForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: feedback, isLoading } = useDDGFeedback(id ?? '')
  const { data: partnerships = [] } = usePartnerships()
  const { data: stakeholders = [] } = useExternalStakeholders()
  const createMutation = useCreateDDGFeedback()
  const updateMutation = useUpdateDDGFeedback()

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { is_actioned: false } })

  useEffect(() => {
    if (feedback) {
      const f = feedback as Record<string, unknown>
      form.reset({
        feedback_type: f.feedback_type as string,
        partnership_id: (f.partnership_id as string) ?? '',
        stakeholder_id: (f.stakeholder_id as string) ?? '',
        received_date: (f.received_date as string) ?? '',
        summary: f.summary as string,
        details: (f.details as string) ?? '',
        action_taken: (f.action_taken as string) ?? '',
        is_actioned: f.is_actioned as boolean,
      })
    }
  }, [feedback, form])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      partnership_id: values.partnership_id || null,
      stakeholder_id: values.stakeholder_id || null,
      received_date: values.received_date || new Date().toISOString().slice(0, 10),
    }
    if (isEdit) {
      await updateMutation.mutateAsync({ id: id!, values: payload })
      navigate(`/feedback/ddg/${id}`)
    } else {
      const created = await createMutation.mutateAsync(payload) as Record<string, unknown>
      navigate(`/feedback/ddg/${created.id}`, { replace: true })
    }
  }

  if (isEdit && isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title={isEdit ? 'Edit Feedback' : 'Record DDG Feedback'}
        actions={<Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back</Button>}
      />
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="feedback_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {FEEDBACK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="received_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Received</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="partnership_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partnership</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select partnership" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(partnerships as PartnershipWithRelations[]).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="stakeholder_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>From (Stakeholder)</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select stakeholder" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(stakeholders as ExternalStakeholder[]).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}{s.organization ? ` — ${s.organization}` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="summary" render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Brief summary of the feedback" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="details" render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl><Textarea placeholder="Full details of the feedback…" rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="action_taken" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Taken</FormLabel>
                  <FormControl><Textarea placeholder="Steps taken to address this feedback…" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="is_actioned" render={({ field }) => (
                <FormItem className="flex items-start gap-3 p-3 rounded-lg border">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-brand"
                    />
                  </FormControl>
                  <div>
                    <FormLabel className="font-medium cursor-pointer">Mark as actioned</FormLabel>
                    <FormDescription>Check this when the feedback has been fully addressed</FormDescription>
                  </div>
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Feedback'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
