import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Paperclip } from 'lucide-react'
import { useInternalMeeting, useCreateInternalMeeting, useUpdateInternalMeeting } from '@/hooks/useMeetings'
import { usePartnerships } from '@/hooks/usePartnerships'
import { PageHeader } from '@/components/shared/PageHeader'
import { FileUpload } from '@/components/shared/FileUpload'
import { MeetingPreviewDialog } from '@/components/shared/MeetingPreviewDialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { writeAudit } from '@/hooks/useAuditLog'
import { uploadPendingFiles, type PendingUpload } from '@/hooks/useMeetingAttachments'
import type { PartnershipWithRelations } from '@/types/database'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  partnership_id: z.string().optional(),
  meeting_date: z.string().optional(),
  location: z.string().optional(),
  attendees_internal: z.string().optional(),
  agenda: z.string().optional(),
  minutes: z.string().optional(),
  action_points: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function InternalMeetingForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: meeting, isLoading } = useInternalMeeting(id ?? '')
  const { data: partnerships = [] } = usePartnerships()
  const createMutation = useCreateInternalMeeting()
  const updateMutation = useUpdateInternalMeeting()

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const [pendingFiles, setPendingFiles] = useState<PendingUpload[]>([])
  const [preview, setPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (meeting) {
      const m = meeting as Record<string, unknown>
      form.reset({
        title: m.title as string,
        partnership_id: (m.partnership_id as string) ?? '',
        meeting_date: (m.meeting_date as string) ?? '',
        location: (m.location as string) ?? '',
        attendees_internal: (m.attendees_internal as string) ?? '',
        agenda: (m.agenda as string) ?? '',
        minutes: (m.minutes as string) ?? '',
        action_points: (m.action_points as string) ?? '',
      })
    }
  }, [meeting, form])

  const partnershipName = (pid: string | undefined) =>
    (partnerships as PartnershipWithRelations[]).find(p => p.id === pid)?.title ?? null

  const handlePreview = () => {
    form.trigger().then(valid => { if (valid) setPreview(true) })
  }

  const handleConfirm = async () => {
    const values = form.getValues()
    const payload = {
      ...values,
      partnership_id: values.partnership_id || null,
      meeting_date: values.meeting_date || null,
    }

    setIsSaving(true)
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, values: payload })
        if (pendingFiles.length > 0) {
          try {
            await uploadPendingFiles(pendingFiles, 'internal', id!)
          } catch (uploadErr) {
            toast.error(`Files could not be uploaded: ${(uploadErr as Error).message}`)
          }
        }
        writeAudit({ action: 'updated', entity_type: 'internal_meeting', entity_id: id!, entity_name: values.title })
        navigate('/meetings/internal')
      } else {
        const created = await createMutation.mutateAsync(payload) as { id: string; title: string }
        if (pendingFiles.length > 0) {
          try {
            await uploadPendingFiles(pendingFiles, 'internal', created.id)
          } catch (uploadErr) {
            toast.error(`Files could not be uploaded: ${(uploadErr as Error).message}`)
          }
        }
        writeAudit({ action: 'created', entity_type: 'internal_meeting', entity_id: created.id, entity_name: created.title })
        navigate('/meetings/internal', { replace: true })
      }
    } catch (err) {
      toast.error(`Failed to save meeting: ${(err as Error).message}`)
    } finally {
      setIsSaving(false)
      setPreview(false)
    }
  }

  if (isEdit && isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>

  const values = form.watch()

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <PageHeader
        title={isEdit ? 'Edit Internal Meeting' : 'New Internal Meeting'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <FormField control={form.control} name="attendees_internal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendees</FormLabel>
                  <FormControl><Textarea placeholder="One attendee per line — Name, Department, Position" rows={3} {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">One attendee per line — Name, Department, Position</p>
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
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Paperclip size={14} className="text-muted-foreground" />
            Attachments
            {pendingFiles.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">{pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} selected</span>
            )}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <FileUpload files={pendingFiles} onChange={setPendingFiles} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button type="button" onClick={handlePreview}>
          Preview & Save →
        </Button>
      </div>

      <MeetingPreviewDialog
        open={preview}
        onClose={() => setPreview(false)}
        onConfirm={handleConfirm}
        isSaving={isSaving}
        title={values.title ?? ''}
        meetingType="Internal Meeting"
        isEdit={isEdit}
        pendingFiles={pendingFiles}
        fields={[
          { label: 'Partnership', value: partnershipName(values.partnership_id) },
          { label: 'Date', value: values.meeting_date },
          { label: 'Location', value: values.location },
          { label: 'Attendees', value: values.attendees_internal },
          { label: 'Agenda', value: values.agenda },
          { label: 'Minutes', value: values.minutes },
          { label: 'Action Points', value: values.action_points },
        ]}
      />
    </div>
  )
}
