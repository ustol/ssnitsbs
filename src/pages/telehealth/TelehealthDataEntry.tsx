import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import {
  useTelehealthEntry,
  useCreateTelehealthEntry,
  useUpdateTelehealthEntry,
  useTelehealthConfig,
  checkDuplicate,
} from '@/hooks/useTelehealth'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const schema = z.object({
  reporting_period:           z.string().min(1, 'Reporting period is required'),
  weekly_cycle:               z.string().min(1, 'Weekly cycle is required'),
  date_of_interaction:        z.string().min(1, 'Date of interaction is required'),
  cro_name:                   z.string().min(1, 'CRO name is required'),
  patient_full_name:          z.string().min(1, 'Patient name is required'),
  telephone_number:           z.string().optional().default(''),
  alternative_contact_number: z.string().optional().default(''),
  email_address:              z.string().email('Enter a valid email').or(z.literal('')).optional().default(''),
  physical_location:          z.string().optional().default(''),
  region:                     z.string().min(1, 'Region is required'),
  engagement_type:            z.string().min(1, 'Engagement type is required'),
  digital_channel_used:       z.string().optional().default(''),
  feedback_category:          z.string().min(1, 'Feedback category is required'),
  detailed_feedback_narrative:z.string().optional().default(''),
  successful_contact:         z.string().optional().default(''),
  issue_resolved:             z.string().optional().default(''),
  escalation_required:        z.string().optional().default(''),
  key_observation:            z.string().optional().default(''),
  root_cause:                 z.string().optional().default(''),
  emerging_trend:             z.string().optional().default(''),
  recommendation:             z.string().optional().default(''),
  priority_level:             z.string().optional().default(''),
  responsible_unit:           z.string().optional().default(''),
  status:                     z.string().min(1, 'Status is required'),
}).superRefine((data, ctx) => {
  if (!data.telephone_number && !data.alternative_contact_number && !data.email_address) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['telephone_number'],
      message: 'At least one contact field is required (telephone, alternative, or email)',
    })
  }
  const cleanPhone = (data.telephone_number ?? '').replace(/\D/g, '')
  if (cleanPhone.length > 0 && cleanPhone.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['telephone_number'],
      message: 'Phone number must have at least 10 digits',
    })
  }
})

type FormValues = z.infer<typeof schema>

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-zinc-700">{title}</CardTitle>
        <Separator />
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  )
}

function Field({ label, required, error, children, full }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode; full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function SelectField({ options, placeholder, value, onChange }: {
  options: string[]; placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

export function TelehealthDataEntry() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: entry, isLoading: entryLoading } = useTelehealthEntry(id)
  const { data: cfg, isLoading: cfgLoading } = useTelehealthConfig()
  const createMut = useCreateTelehealthEntry()
  const updateMut = useUpdateTelehealthEntry()

  const [dupWarning, setDupWarning] = useState(false)
  const [contactWarn, setContactWarn] = useState(false)
  const [phoneWarn, setPhoneWarn] = useState(false)

  const { register, control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (entry) {
      reset({
        reporting_period:            entry.reporting_period,
        weekly_cycle:                entry.weekly_cycle,
        date_of_interaction:         entry.date_of_interaction,
        cro_name:                    entry.cro_name,
        patient_full_name:           entry.patient_full_name,
        telephone_number:            entry.telephone_number ?? '',
        alternative_contact_number:  entry.alternative_contact_number ?? '',
        email_address:               entry.email_address ?? '',
        physical_location:           entry.physical_location ?? '',
        region:                      entry.region,
        engagement_type:             entry.engagement_type,
        digital_channel_used:        entry.digital_channel_used ?? '',
        feedback_category:           entry.feedback_category,
        detailed_feedback_narrative: entry.detailed_feedback_narrative ?? '',
        successful_contact:          entry.successful_contact ?? '',
        issue_resolved:              entry.issue_resolved ?? '',
        escalation_required:         entry.escalation_required ?? '',
        key_observation:             entry.key_observation ?? '',
        root_cause:                  entry.root_cause ?? '',
        emerging_trend:              entry.emerging_trend ?? '',
        recommendation:              entry.recommendation ?? '',
        priority_level:              entry.priority_level ?? '',
        responsible_unit:            entry.responsible_unit ?? '',
        status:                      entry.status,
      })
    }
  }, [entry, reset])

  const watchedName  = watch('patient_full_name')
  const watchedPhone = watch('telephone_number')
  const watchedAlt   = watch('alternative_contact_number')
  const watchedEmail = watch('email_address')

  useEffect(() => {
    const missingContact = !watchedPhone && !watchedAlt && !watchedEmail
    setContactWarn(missingContact)
    const cleaned = (watchedPhone ?? '').replace(/\D/g, '')
    setPhoneWarn(cleaned.length > 0 && cleaned.length < 10)
  }, [watchedPhone, watchedAlt, watchedEmail])

  async function onSubmit(values: FormValues) {
    // Duplicate check (warn, don't block)
    const isDup = await checkDuplicate(
      values.patient_full_name,
      values.telephone_number ?? '',
      isEdit ? id : undefined,
    )
    if (isDup && !dupWarning) {
      setDupWarning(true)
      toast.warning('Duplicate detected — a record with this patient name and phone number already exists. Submit again to save anyway.')
      return
    }
    setDupWarning(false)

    const payload = {
      ...values,
      telephone_number:            values.telephone_number || null,
      alternative_contact_number:  values.alternative_contact_number || null,
      email_address:               values.email_address || null,
      physical_location:           values.physical_location || null,
      digital_channel_used:        values.digital_channel_used || null,
      detailed_feedback_narrative: values.detailed_feedback_narrative || null,
      successful_contact:          values.successful_contact || null,
      issue_resolved:              values.issue_resolved || null,
      escalation_required:         values.escalation_required || null,
      key_observation:             values.key_observation || null,
      root_cause:                  values.root_cause || null,
      emerging_trend:              values.emerging_trend || null,
      recommendation:              values.recommendation || null,
      priority_level:              values.priority_level || null,
      responsible_unit:            values.responsible_unit || null,
    }

    if (isEdit && id) {
      await updateMut.mutateAsync({ id, values: payload })
      toast.success('Entry updated successfully')
    } else {
      await createMut.mutateAsync(payload)
      toast.success('Entry created successfully')
    }
    navigate('/telehealth')
  }

  if (cfgLoading || (isEdit && entryLoading)) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-zinc-100 rounded animate-pulse w-64" />
        <div className="h-64 bg-zinc-100 rounded animate-pulse" />
      </div>
    )
  }

  const feedbackCategory = watch('feedback_category')
  const isPositive   = feedbackCategory === 'Positive'
  const isComplaint  = feedbackCategory === 'Complaint'
  const isSuggestion = feedbackCategory === 'Suggestion'

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <PageHeader
        title={isEdit ? 'Edit Interaction Record' : 'New Interaction Record'}
        subtitle="Capture telemedicine interaction details for SSNIT pensioners"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/telehealth')}>
            Cancel
          </Button>
        }
      />

      {/* Computed field preview banner */}
      {(isPositive || isComplaint || isSuggestion || contactWarn || phoneWarn || dupWarning) && (
        <div className="flex flex-wrap gap-2">
          {isPositive   && <Badge className="bg-green-100 text-green-700 border-green-200">Positive Feedback: Yes</Badge>}
          {isComplaint  && <Badge className="bg-red-100 text-red-700 border-red-200">Complaint: Yes</Badge>}
          {isSuggestion && <Badge className="bg-blue-100 text-blue-700 border-blue-200">Suggestion: Yes</Badge>}
          {contactWarn  && <Badge className="bg-orange-100 text-orange-700 border-orange-200"><AlertTriangle size={10} className="mr-1" />Missing Contact</Badge>}
          {phoneWarn    && <Badge className="bg-amber-100 text-amber-700 border-amber-200"><AlertTriangle size={10} className="mr-1" />Short Phone Number</Badge>}
        </div>
      )}

      {dupWarning && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            A duplicate record exists for <strong>{watchedName}</strong> with this phone number.
            Submit again to save anyway, or cancel to revise the entry.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Section 1: Reporting Context */}
        <SectionCard title="1. Reporting Context">
          <Field label="Reporting Period" required error={errors.reporting_period?.message}>
            <Controller
              name="reporting_period"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.periods.map(p => p.value) ?? []}
                  placeholder="Select period…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Weekly Cycle" required error={errors.weekly_cycle?.message}>
            <Controller
              name="weekly_cycle"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.cycles.map(c => c.value) ?? []}
                  placeholder="Select week…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Date of Interaction" required error={errors.date_of_interaction?.message}>
            <Input
              type="date"
              className="h-9"
              max={format(new Date(), 'yyyy-MM-dd')}
              {...register('date_of_interaction')}
            />
          </Field>

          <Field label="CRO Name" required error={errors.cro_name?.message}>
            <Input className="h-9" placeholder="Officer name…" {...register('cro_name')} />
          </Field>
        </SectionCard>

        {/* Section 2: Patient Details */}
        <SectionCard title="2. Patient Details">
          <Field label="Patient Full Name" required error={errors.patient_full_name?.message} full>
            <Input className="h-9" placeholder="Full name as registered…" {...register('patient_full_name')} />
          </Field>

          <Field label="Physical Location" error={errors.physical_location?.message}>
            <Input className="h-9" placeholder="Town, neighbourhood…" {...register('physical_location')} />
          </Field>

          <Field label="Region" required error={errors.region?.message}>
            <Controller
              name="region"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.regions.map(r => r.value) ?? []}
                  placeholder="Select region…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        </SectionCard>

        {/* Section 3: Contact Information */}
        <SectionCard title="3. Contact Information">
          <Field label="Telephone Number" error={errors.telephone_number?.message}>
            <Input
              className="h-9"
              placeholder="0XX XXX XXXX"
              {...register('telephone_number')}
            />
          </Field>

          <Field label="Alternative Contact" error={errors.alternative_contact_number?.message}>
            <Input
              className="h-9"
              placeholder="Alternative phone…"
              {...register('alternative_contact_number')}
            />
          </Field>

          <Field label="Email Address" error={errors.email_address?.message} full>
            <Input
              className="h-9"
              type="email"
              placeholder="patient@email.com"
              {...register('email_address')}
            />
          </Field>
          {contactWarn && (
            <p className="sm:col-span-2 text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle size={12} />
              No contact information provided — at least one field is required.
            </p>
          )}
        </SectionCard>

        {/* Section 4: Engagement Details */}
        <SectionCard title="4. Engagement Details">
          <Field label="Engagement Type" required error={errors.engagement_type?.message}>
            <Controller
              name="engagement_type"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.engagements.map(e => e.value) ?? []}
                  placeholder="Select type…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Digital Channel Used" error={errors.digital_channel_used?.message}>
            <Controller
              name="digital_channel_used"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.channels.map(c => c.value) ?? []}
                  placeholder="Select channel…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Successful Contact" error={errors.successful_contact?.message}>
            <Controller
              name="successful_contact"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={['Yes', 'No']}
                  placeholder="Select…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Issue Resolved" error={errors.issue_resolved?.message}>
            <Controller
              name="issue_resolved"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={['Yes', 'No']}
                  placeholder="Select…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Escalation Required" error={errors.escalation_required?.message}>
            <Controller
              name="escalation_required"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={['Yes', 'No']}
                  placeholder="Select…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        </SectionCard>

        {/* Section 5: Feedback */}
        <SectionCard title="5. Feedback">
          <Field label="Feedback Category" required error={errors.feedback_category?.message}>
            <Controller
              name="feedback_category"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.feedbackCats.map(f => f.value) ?? []}
                  placeholder="Select category…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className={`px-2 py-1 rounded border ${isPositive ? 'bg-green-50 text-green-700 border-green-200' : 'border-zinc-200'}`}>
              Positive: <strong>{isPositive ? 'Yes' : 'No'}</strong>
            </span>
            <span className={`px-2 py-1 rounded border ${isComplaint ? 'bg-red-50 text-red-700 border-red-200' : 'border-zinc-200'}`}>
              Complaint: <strong>{isComplaint ? 'Yes' : 'No'}</strong>
            </span>
            <span className={`px-2 py-1 rounded border ${isSuggestion ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-zinc-200'}`}>
              Suggestion: <strong>{isSuggestion ? 'Yes' : 'No'}</strong>
            </span>
          </div>

          <Field label="Detailed Feedback Narrative" error={errors.detailed_feedback_narrative?.message} full>
            <Textarea
              rows={3}
              placeholder="Describe the feedback in detail…"
              {...register('detailed_feedback_narrative')}
            />
          </Field>
        </SectionCard>

        {/* Section 6: Observations & Recommendations */}
        <SectionCard title="6. Observations & Recommendations">
          <Field label="Key Observation" error={errors.key_observation?.message} full>
            <Textarea rows={2} placeholder="What was observed during this interaction?" {...register('key_observation')} />
          </Field>

          <Field label="Root Cause" error={errors.root_cause?.message} full>
            <Textarea rows={2} placeholder="Underlying cause of issue or feedback…" {...register('root_cause')} />
          </Field>

          <Field label="Emerging Trend" error={errors.emerging_trend?.message} full>
            <Textarea rows={2} placeholder="Any recurring patterns noted…" {...register('emerging_trend')} />
          </Field>

          <Field label="Recommendation" error={errors.recommendation?.message} full>
            <Textarea rows={2} placeholder="Action recommended…" {...register('recommendation')} />
          </Field>
        </SectionCard>

        {/* Section 7: Classification */}
        <SectionCard title="7. Classification & Status">
          <Field label="Priority Level" error={errors.priority_level?.message}>
            <Controller
              name="priority_level"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.priorities.map(p => p.value) ?? []}
                  placeholder="Select priority…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Responsible Unit" error={errors.responsible_unit?.message}>
            <Controller
              name="responsible_unit"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.units.map(u => u.value) ?? []}
                  placeholder="Select unit…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>

          <Field label="Status" required error={errors.status?.message}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <SelectField
                  options={cfg?.statuses.map(s => s.value) ?? []}
                  placeholder="Select status…"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        </SectionCard>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/telehealth')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-1.5 min-w-[140px]">
            {isSubmitting ? 'Saving…' : (
              <>
                {isEdit ? 'Save Changes' : 'Create Entry'}
                <ChevronRight size={14} />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
