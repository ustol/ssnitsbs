import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useDDGFeedback, useCreateDDGFeedback, useUpdateDDGFeedback } from '@/hooks/useDDGFeedback'
import { writeAudit } from '@/hooks/useAuditLog'
import { useExternalMeetings, useInternalMeetings } from '@/hooks/useMeetings'
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

const COMMENT_TYPES = ['Complaint', 'Commendation', 'Suggestion', 'Query', 'Other'] as const

const ENTITY_TYPES = [
  { value: 'partnership',      label: 'Partnership' },
  { value: 'external_meeting', label: 'External Meeting' },
  { value: 'internal_meeting', label: 'Internal Meeting' },
] as const

const schema = z.object({
  feedback_type: z.string().min(1, 'Type is required'),
  entity_type: z.enum(['partnership', 'external_meeting', 'internal_meeting', '']).optional(),
  entity_id: z.string().optional(),
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
  const { data: extMeetings = [] } = useExternalMeetings()
  const { data: intMeetings = [] } = useInternalMeetings()
  const { data: stakeholders = [] } = useExternalStakeholders()
  const createMutation = useCreateDDGFeedback()
  const updateMutation = useUpdateDDGFeedback()

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { is_actioned: false } })
  const entityType = form.watch('entity_type')

  useEffect(() => {
    if (feedback) {
      const f = feedback as Record<string, unknown>
      const derivedEntityType =
        f.partnership_id ? 'partnership'
        : f.meeting_id && f.meeting_type === 'external' ? 'external_meeting'
        : f.meeting_id && f.meeting_type === 'internal' ? 'internal_meeting'
        : ''
      form.reset({
        feedback_type: f.feedback_type as string,
        entity_type: derivedEntityType as FormValues['entity_type'],
        entity_id: ((f.partnership_id ?? f.meeting_id) as string) ?? '',
        stakeholder_id: (f.stakeholder_id as string) ?? '',
        received_date: (f.received_date as string) ?? '',
        summary: f.summary as string,
        details: (f.details as string) ?? '',
        action_taken: (f.action_taken as string) ?? '',
        is_actioned: f.is_actioned as boolean,
      })
    }
  }, [feedback, form])

  const handleEntityTypeChange = (val: string) => {
    form.setValue('entity_type', val as FormValues['entity_type'])
    form.setValue('entity_id', '')
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      feedback_type: values.feedback_type,
      stakeholder_id: values.stakeholder_id || null,
      received_date: values.received_date || new Date().toISOString().slice(0, 10),
      summary: values.summary,
      details: values.details || null,
      action_taken: values.action_taken || null,
      is_actioned: values.is_actioned,
      partnership_id: values.entity_type === 'partnership' ? (values.entity_id || null) : null,
      meeting_id: (values.entity_type === 'external_meeting' || values.entity_type === 'internal_meeting')
        ? (values.entity_id || null) : null,
      meeting_type: values.entity_type === 'external_meeting' ? 'external'
        : values.entity_type === 'internal_meeting' ? 'internal'
        : null,
    }
    if (isEdit) {
      await updateMutation.mutateAsync({ id: id!, values: payload })
      writeAudit({ action: 'updated', entity_type: 'ddg_feedback', entity_id: id!, entity_name: values.summary })
      navigate(`/feedback/ddg/${id}`)
    } else {
      const created = await createMutation.mutateAsync(payload) as Record<string, unknown>
      writeAudit({ action: 'created', entity_type: 'ddg_feedback', entity_id: created.id as string, entity_name: values.summary })
      navigate(`/feedback/ddg/${created.id}`, { replace: true })
    }
  }

  if (isEdit && isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title={isEdit ? 'Edit Comment' : "Record DDG's Comment"}
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
                        {COMMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="received_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="entity_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked To</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={handleEntityTypeChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Partnership or meeting…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="entity_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {entityType === 'partnership' ? 'Partnership'
                        : entityType === 'external_meeting' ? 'External Meeting'
                        : entityType === 'internal_meeting' ? 'Internal Meeting'
                        : 'Select type first'}
                    </FormLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={!entityType}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {entityType === 'partnership' && (partnerships as PartnershipWithRelations[]).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                        {entityType === 'external_meeting' && (extMeetings as { id: string; title: string }[]).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                        ))}
                        {entityType === 'internal_meeting' && (intMeetings as { id: string; title: string }[]).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="stakeholder_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>From (Stakeholder)</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select stakeholder (optional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(stakeholders as ExternalStakeholder[]).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}{s.organization ? ` — ${s.organization}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="summary" render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Brief summary of the comment" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="details" render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl><Textarea placeholder="Full details of the comment…" rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="action_taken" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Taken</FormLabel>
                  <FormControl><Textarea placeholder="Steps taken to address this comment…" rows={3} {...field} /></FormControl>
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
                    <FormDescription>Check this when the comment has been fully addressed</FormDescription>
                  </div>
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Comment'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
