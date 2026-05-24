import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check } from 'lucide-react'
import { usePartnership, useCreatePartnership, useUpdatePartnership } from '@/hooks/usePartnerships'
import { useInternalStakeholders, useExternalStakeholders } from '@/hooks/useStakeholders'
import { writeAudit } from '@/hooks/useAuditLog'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { InternalStakeholder, ExternalStakeholder } from '@/types/database'

const schema = z.object({
  title: z.string().min(1, 'Partnership name is required'),
  internal_stakeholder_ids: z.array(z.string()).default([]),
  external_stakeholder_ids: z.array(z.string()).default([]),
  start_date: z.string().optional(),
  proposed_value: z.coerce.number().optional(),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

async function syncStakeholders(
  partnershipId: string,
  externalIds: string[],
  internalIds: string[],
) {
  await supabase.from('partnership_external_stakeholders').delete().eq('partnership_id', partnershipId)
  await supabase.from('partnership_internal_stakeholders').delete().eq('partnership_id', partnershipId)
  if (externalIds.length > 0) {
    await supabase.from('partnership_external_stakeholders').insert(
      externalIds.map(stakeholder_id => ({ partnership_id: partnershipId, stakeholder_id })),
    )
  }
  if (internalIds.length > 0) {
    await supabase.from('partnership_internal_stakeholders').insert(
      internalIds.map(stakeholder_id => ({ partnership_id: partnershipId, stakeholder_id })),
    )
  }
}

interface StakeholderPickerProps {
  label: string
  options: { id: string; name: string; sub?: string }[]
  selected: string[]
  onToggle: (id: string) => void
}

function StakeholderPicker({ label, options, selected, onToggle }: StakeholderPickerProps) {
  const [search, setSearch] = useState('')
  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.sub ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium leading-none">{label}</p>
      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} selected
        </p>
      )}
      {options.length > 6 && (
        <Input
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-7 text-xs"
        />
      )}
      <div className="border rounded-md overflow-y-auto max-h-44 divide-y">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-2">No matches</p>
        ) : (
          filtered.map(opt => {
            const isSelected = selected.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggle(opt.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors text-sm',
                  isSelected ? 'bg-orange-50' : 'hover:bg-zinc-50',
                )}
              >
                <span className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                  isSelected ? 'bg-brand border-brand' : 'border-zinc-300',
                )}>
                  {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{opt.name}</span>
                  {opt.sub && <span className="text-muted-foreground ml-1.5 text-xs">{opt.sub}</span>}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export function PartnershipForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { data: partnership, isLoading: loading } = usePartnership(id ?? '')
  const { data: internalStakeholders = [] } = useInternalStakeholders()
  const { data: externalStakeholders = [] } = useExternalStakeholders()
  const createMutation = useCreatePartnership()
  const updateMutation = useUpdatePartnership()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { internal_stakeholder_ids: [], external_stakeholder_ids: [] },
  })

  const internalIds = form.watch('internal_stakeholder_ids')
  const externalIds = form.watch('external_stakeholder_ids')

  useEffect(() => {
    if (partnership) {
      const p = partnership as Record<string, unknown>
      const extIds = ((p.external_stakeholders as { stakeholder: { id: string } }[]) ?? [])
        .map(e => e.stakeholder.id)
      const intIds = ((p.internal_stakeholders as { stakeholder: { id: string } }[]) ?? [])
        .map(e => e.stakeholder.id)
      form.reset({
        title: (p.title as string) ?? '',
        description: (p.description as string) ?? '',
        proposed_value: (p.proposed_value as number) ?? undefined,
        start_date: (p.start_date as string) ?? '',
        internal_stakeholder_ids: intIds,
        external_stakeholder_ids: extIds,
      })
    }
  }, [partnership, form])

  const toggleInternal = (sid: string) => {
    const cur = form.getValues('internal_stakeholder_ids')
    form.setValue('internal_stakeholder_ids', cur.includes(sid) ? cur.filter(x => x !== sid) : [...cur, sid])
  }

  const toggleExternal = (sid: string) => {
    const cur = form.getValues('external_stakeholder_ids')
    form.setValue('external_stakeholder_ids', cur.includes(sid) ? cur.filter(x => x !== sid) : [...cur, sid])
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      proposed_value: values.proposed_value ?? null,
      start_date: values.start_date || null,
    }

    if (isEdit) {
      await updateMutation.mutateAsync({ id: id!, values: payload })
      await syncStakeholders(id!, values.external_stakeholder_ids, values.internal_stakeholder_ids)
      writeAudit({ action: 'updated', entity_type: 'partnership', entity_id: id!, entity_name: values.title })
      navigate(`/partnerships/${id}`)
    } else {
      const created = await createMutation.mutateAsync(payload) as Record<string, unknown>
      const newId = created.id as string
      await syncStakeholders(newId, values.external_stakeholder_ids, values.internal_stakeholder_ids)
      writeAudit({ action: 'created', entity_type: 'partnership', entity_id: newId, entity_name: values.title })
      navigate(`/partnerships/${newId}`, { replace: true })
    }
  }

  if (isEdit && loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Partnership Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="Partnership name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Stakeholder pickers */}
              <StakeholderPicker
                label="Internal Stakeholders"
                options={(internalStakeholders as InternalStakeholder[]).map(s => ({
                  id: s.id,
                  name: s.name,
                  sub: s.department ?? s.title ?? undefined,
                }))}
                selected={internalIds}
                onToggle={toggleInternal}
              />

              <StakeholderPicker
                label="External Stakeholders"
                options={(externalStakeholders as ExternalStakeholder[]).map(s => ({
                  id: s.id,
                  name: s.name,
                  sub: s.organization ?? undefined,
                }))}
                selected={externalIds}
                onToggle={toggleExternal}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

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
