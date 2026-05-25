import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateExternalMeeting, useUpdateInternalMeeting } from '@/hooks/useMeetings'
import { useStatusLookup } from '@/hooks/useSettings'
import { useCreateStatusHistory } from '@/hooks/useStatusHistory'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { StatusLookup } from '@/types/database'

const NONE = '__none__'

interface Props {
  open: boolean
  onClose: () => void
  meetingId: string
  meetingTitle: string
  meetingType: 'external' | 'internal'
  currentStatusId: string | null
  currentStatusName: string | null
  currentStatusColor: string | null
  currentDate: string | null
}

export function QuickStatusDialog({
  open,
  onClose,
  meetingId,
  meetingTitle,
  meetingType,
  currentStatusId,
  currentStatusName,
  currentStatusColor,
  currentDate,
}: Props) {
  const { user } = useAuth()
  const { data: allStatuses = [] } = useStatusLookup()
  const statuses = allStatuses as StatusLookup[]
  const updateExt = useUpdateExternalMeeting()
  const updateInt = useUpdateInternalMeeting()
  const createHistory = useCreateStatusHistory()

  const [statusId, setStatusId] = useState(currentStatusId ?? NONE)
  const [date, setDate] = useState(currentDate ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setStatusId(currentStatusId ?? NONE)
      setDate(currentDate ?? '')
    }
  }, [open, currentStatusId, currentDate])

  const isDirty = statusId !== (currentStatusId ?? NONE) || date !== (currentDate ?? '')

  async function handleSave() {
    const newStatusId = statusId === NONE ? null : statusId
    setSaving(true)
    try {
      const update = meetingType === 'external' ? updateExt : updateInt
      const entityType = meetingType === 'external' ? 'external_meeting' : 'internal_meeting'
      await update.mutateAsync({ id: meetingId, values: { status_id: newStatusId, status_date: date || null } })
      if (newStatusId !== currentStatusId) {
        createHistory.mutateAsync({
          entity_type: entityType,
          entity_id: meetingId,
          from_status_id: currentStatusId,
          to_status_id: newStatusId,
          status_date: date || null,
          changed_by: user?.id ?? null,
        }).catch(() => {})
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription className="line-clamp-2">{meetingTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground w-[72px] shrink-0">Current:</span>
            {currentStatusName
              ? <StatusBadge status={currentStatusName} color={currentStatusColor ?? ''} />
              : <span className="text-xs text-muted-foreground italic">None assigned</span>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">New status</label>
            <Select value={statusId} onValueChange={setStatusId} disabled={saving}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select status…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Status date</label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={saving}
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" disabled={!isDirty || saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
