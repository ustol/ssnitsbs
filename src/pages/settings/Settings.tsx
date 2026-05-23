import { useEffect, useState } from 'react'
import { useSettings, useUpdateSetting, useStatusLookup } from '@/hooks/useSettings'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { StatusLookup } from '@/types/database'

export function Settings() {
  const { data: settings, isLoading } = useSettings()
  const { data: statuses = [], isLoading: statusesLoading } = useStatusLookup()
  const updateMutation = useUpdateSetting()

  const [bestCase, setBestCase] = useState('')
  const [worstCase, setWorstCase] = useState('')

  useEffect(() => {
    if (settings) {
      setBestCase(settings.best_case_pct ?? '60')
      setWorstCase(settings.worst_case_pct ?? '30')
    }
  }, [settings])

  const saveProjection = async () => {
    await Promise.all([
      updateMutation.mutateAsync({ key: 'best_case_pct', value: bestCase }),
      updateMutation.mutateAsync({ key: 'worst_case_pct', value: worstCase }),
    ])
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Settings" subtitle="System-wide configuration" />

      {/* Projection settings */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold">Pipeline Projection Settings</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {isLoading ? (
            <><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="best-case">Best Case Realisation (%)</Label>
                <Input
                  id="best-case"
                  type="number"
                  min="0"
                  max="100"
                  value={bestCase}
                  onChange={e => setBestCase(e.target.value)}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">Percentage of proposed numbers expected to be realised in the best case scenario</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="worst-case">Worst Case Realisation (%)</Label>
                <Input
                  id="worst-case"
                  type="number"
                  min="0"
                  max="100"
                  value={worstCase}
                  onChange={e => setWorstCase(e.target.value)}
                  className="w-40"
                />
                <p className="text-xs text-muted-foreground">Percentage of proposed numbers expected to be realised in the worst case scenario</p>
              </div>
              <Button onClick={saveProjection} size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Projection Settings'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status lookup */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold">Status Values</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-sm text-muted-foreground mb-3">
            Statuses are used across partnerships and meetings. Manage them directly in your Supabase database.
          </p>
          {statusesLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-20 rounded-full" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(statuses as StatusLookup[]).map(s => (
                <Badge
                  key={s.id}
                  className="border"
                  style={{
                    backgroundColor: s.color ? `${s.color}15` : undefined,
                    color: s.color ?? undefined,
                    borderColor: s.color ? `${s.color}40` : undefined,
                  }}
                >
                  {s.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-semibold">About</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Application</span>
            <span className="text-foreground font-medium">SBS System</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>Stack</span>
            <span className="text-foreground font-medium">React + Supabase</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>UI</span>
            <span className="text-foreground font-medium">Tailwind CSS + shadcn/ui</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
