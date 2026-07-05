import { useState } from 'react'
import { Settings2, Plus, Trash2, ChevronRight } from 'lucide-react'
import { useTeleRefList } from '@/hooks/useTelehealth'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDelete } from '@/components/shared/ConfirmDelete'
import { toast } from 'sonner'
import type { TeleRefItem } from '@/types/database'

const ADMIN_ROLES = ['admin', 'tth_admin', 'system_admin']

interface RefListSectionProps {
  table: string
  title: string
  description?: string
  isAdmin: boolean
}

function RefListSection({ table, title, description, isAdmin }: RefListSectionProps) {
  const { items, add, remove } = useTeleRefList(table)
  const [newValue, setNewValue] = useState('')
  const [toDelete, setToDelete] = useState<TeleRefItem | null>(null)

  async function handleAdd() {
    const trimmed = newValue.trim()
    if (!trimmed) return
    await add.mutateAsync(trimmed)
    setNewValue('')
    toast.success(`"${trimmed}" added to ${title}`)
  }

  async function handleDelete(item: TeleRefItem) {
    await remove.mutateAsync(item.id)
    setToDelete(null)
    toast.success(`"${item.value}" removed from ${title}`)
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        {/* Items list */}
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {items.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)
          ) : (items.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No items. Add one below.</p>
          ) : (
            (items.data ?? []).map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-50 group">
                <div className="flex items-center gap-2">
                  <ChevronRight size={12} className="text-muted-foreground" />
                  <span className="text-sm">{item.value}</span>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => setToDelete(item)}
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add new item */}
        {isAdmin && (
          <div className="flex gap-2 pt-1 border-t">
            <Input
              className="h-8 text-xs flex-1"
              placeholder={`Add new ${title.toLowerCase()} value…`}
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            />
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={handleAdd}
              disabled={!newValue.trim() || add.isPending}
            >
              <Plus size={12} /> Add
            </Button>
          </div>
        )}
      </CardContent>

      {toDelete && (
        <ConfirmDelete
          open
          title={`Remove "${toDelete.value}"`}
          description={`Remove this value from ${title}? Existing records with this value will not be affected.`}
          onConfirm={() => handleDelete(toDelete)}
          onCancel={() => setToDelete(null)}
          loading={remove.isPending}
        />
      )}
    </Card>
  )
}

export function TelehealthConfig() {
  const { profile } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(profile?.role ?? '')

  const tabs = [
    {
      value: 'periods',
      label: 'Periods & Weeks',
      sections: [
        { table: 'tele_reporting_periods', title: 'Reporting Periods', description: 'Monthly periods e.g. Jan 2026' },
        { table: 'tele_weekly_cycles', title: 'Weekly Cycles', description: 'Week 1 through Week 5' },
      ],
    },
    {
      value: 'engagement',
      label: 'Engagement',
      sections: [
        { table: 'tele_engagement_types', title: 'Engagement Types', description: 'Types of telehealth interactions' },
        { table: 'tele_digital_channels', title: 'Digital Channels', description: 'Communication channels used' },
      ],
    },
    {
      value: 'feedback',
      label: 'Feedback & Status',
      sections: [
        { table: 'tele_feedback_categories', title: 'Feedback Categories', description: 'Positive, Complaint, Suggestion, Neutral' },
        { table: 'tele_statuses', title: 'Statuses', description: 'Open, In Progress, Closed' },
        { table: 'tele_priority_levels', title: 'Priority Levels', description: 'High, Medium, Low' },
      ],
    },
    {
      value: 'classification',
      label: 'Classification',
      sections: [
        { table: 'tele_regions', title: 'Regions', description: '15 Ghana regions' },
        { table: 'tele_responsible_units', title: 'Responsible Units', description: 'Units that handle escalations' },
      ],
    },
  ]

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Telehealth Configuration"
        subtitle="Manage dropdown reference lists for the telehealth data entry form"
      />

      {!isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Badge variant="outline" className="border-amber-300 text-amber-700">Read-only</Badge>
          You can view configuration lists. Contact an admin to add or remove values.
        </div>
      )}

      <Tabs defaultValue="periods">
        <TabsList className="h-8">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs h-7">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {tab.sections.map(section => (
                <RefListSection
                  key={section.table}
                  table={section.table}
                  title={section.title}
                  description={section.description}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
