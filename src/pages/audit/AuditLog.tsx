import { useState } from 'react'
import { ClipboardList, Pencil, Plus, Minus, Search } from 'lucide-react'
import { useAuditLog } from '@/hooks/useAuditLog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AuditLog as AuditLogEntry } from '@/types/database'

const ENTITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'external_meeting', label: 'External Meeting' },
  { value: 'internal_meeting', label: 'Internal Meeting' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'ddg_feedback', label: 'DDG Feedback' },
  { value: 'document', label: 'Document' },
]

const ACTION_TYPES = [
  { value: 'all', label: 'All Actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'uploaded_file', label: 'File Uploaded' },
  { value: 'set_display_picture', label: 'Set Display Picture' },
]

const ACTION_LABEL: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  uploaded_file: 'Uploaded file',
  set_display_picture: 'Set display picture',
}

const ENTITY_LABEL: Record<string, string> = {
  external_meeting: 'External Meeting',
  internal_meeting: 'Internal Meeting',
  partnership: 'Partnership',
  ddg_feedback: 'DDG Feedback',
  document: 'Document',
}

const ACTION_COLOR: Record<string, string> = {
  created: 'text-green-700 bg-green-50 border-green-200',
  updated: 'text-blue-700 bg-blue-50 border-blue-200',
  deleted: 'text-red-700 bg-red-50 border-red-200',
  uploaded_file: 'text-amber-700 bg-amber-50 border-amber-200',
  set_display_picture: 'text-purple-700 bg-purple-50 border-purple-200',
}

const ICON_BG: Record<string, string> = {
  created: 'bg-green-100 border-green-200',
  updated: 'bg-blue-50 border-blue-200',
  deleted: 'bg-red-50 border-red-200',
  uploaded_file: 'bg-amber-50 border-amber-200',
  set_display_picture: 'bg-purple-50 border-purple-200',
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'created') return <Plus size={10} className="text-green-600" />
  if (action === 'deleted') return <Minus size={10} className="text-red-500" />
  return <Pencil size={10} className="text-blue-500" />
}

const PAGE_SIZE = 50

export function AuditLog() {
  const [entityType, setEntityType] = useState('all')
  const [action, setAction] = useState('all')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)

  const { data: entries = [], isLoading } = useAuditLog({
    entityType: entityType !== 'all' ? entityType : undefined,
    limit: PAGE_SIZE,
    offset,
  })

  // Client-side filter by action and search (user name / entity name)
  const filtered = (entries as AuditLogEntry[]).filter(e => {
    if (action !== 'all' && e.action !== action) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (e.user_name ?? '').toLowerCase().includes(q) ||
        (e.entity_name ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <PageHeader
        title="Audit Trail"
        subtitle="A complete log of all actions taken in the system"
        actions={
          <div className="flex items-center gap-1 text-muted-foreground">
            <ClipboardList size={15} />
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by user or record name…"
                value={search}
                onChange={e => { setSearch(e.target.value); setOffset(0) }}
                className="pl-7 h-8 text-sm"
              />
            </div>
            <Select value={entityType} onValueChange={v => { setEntityType(v); setOffset(0) }}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={v => { setAction(v); setOffset(0) }}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log entries */}
      <Card>
        <CardContent className="pt-4 pb-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No activity found</div>
          ) : (
            <div className="divide-y">
              {filtered.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 py-3">
                  {/* Action icon */}
                  <div className={cn('w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5', ICON_BG[entry.action] ?? 'bg-zinc-100 border-zinc-200')}>
                    <ActionIcon action={entry.action} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[0.8125rem] font-semibold text-zinc-800">
                        {entry.user_name ?? 'System'}
                      </span>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', ACTION_COLOR[entry.action] ?? 'text-zinc-600 bg-zinc-50 border-zinc-200')}>
                        {ACTION_LABEL[entry.action] ?? entry.action}
                      </span>
                      <span className="text-[0.8125rem] text-zinc-500">
                        {ENTITY_LABEL[entry.entity_type] ?? entry.entity_type}
                      </span>
                      {entry.entity_name && (
                        <span className="text-[0.8125rem] font-medium text-zinc-700 truncate">
                          — {entry.entity_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.created_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(filtered.length === PAGE_SIZE || offset > 0) && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
            ← Previous
          </Button>
          <span className="text-xs text-muted-foreground">Showing {offset + 1}–{offset + filtered.length}</span>
          <Button variant="outline" size="sm" disabled={filtered.length < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)}>
            Next →
          </Button>
        </div>
      )}
    </div>
  )
}
