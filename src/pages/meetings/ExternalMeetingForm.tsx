import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useExternalMeeting, useCreateExternalMeeting, useUpdateExternalMeeting } from '@/hooks/useMeetings'
import { usePartnerships } from '@/hooks/usePartnerships'
import { PageHeader } from '@/components/shared/PageHeader'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import type { PartnershipWithRelations } from '@/types/database'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  partnership_id: z.string().optional(),
  meeting_date: z.string().optional(),
  location: z.string().optional(),
  attendees_external: z.string().optional(),
  agenda: z.string().optional(),
  minutes: z.string().optional(),
  action_points: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ExternalMeetingForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: meeting, isLoading } = useExternalMeeting(id ?? '')
  const { data: partnerships = [] } = usePartnerships()
  const createMutation = useCreateExternalMeeting()
  const updateMutation = useUpdateExternalMeeting()

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (meeting) {
      const m = meeting as Record<string, unknown>
      form.reset({
        title: m.title as string,
        partnership_id: (m.partnership_id as string) ?? '',
        meeting_date: (m.meeting_date as string) ?? '',
        location: (m.location as string) ?? '',
        attendees_external: (m.attendees_external as string) ?? '',
        agenda: (m.agenda as string) ?? '',
        minutes: (m.minutes as string) ?? '',
        action_points: (m.action_points as string) ?? '',
      })
    }
  }, [meeting, form])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      partnership_id: values.partnership_id || null,
      meeting_date: values.meeting_date || null,
    }
    if (isEdit) {
      await updateMutation.mutateAsync({ id: id!, values: payload })
      navigate(`/meetings/external/${id}`)
    } else {
      const created = await createMutation.mutateAsync(payload) as Record<string, unknown>
      navigate(`/meetings/external/${created.id}`, { replace: true })
    }
  }

  if (isEdit && isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title={isEdit ? 'Edit Meeting' : 'New External Meeting'}
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
                  <FormControl><Input placeholder="Meeting title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

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

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="meeting_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="Venue or online link" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="attendees_external" render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendees</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={"Name, Organization, Position\nName, Organization, Position"}
                      rows={4}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">One attendee per line — Name, Organization, Position</p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="agenda" render={({ field }) => (
                <FormItem>
                  <FormLabel>Agenda</FormLabel>
                  <FormControl><Textarea placeholder="Meeting agenda…" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="minutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Minutes</FormLabel>
                  <FormControl><Textarea placeholder="Meeting minutes…" rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="action_points" render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Points</FormLabel>
                  <FormControl><Textarea placeholder="Key action points…" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Meeting'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
