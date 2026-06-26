import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AIDocumentModal } from '@/components/shared/AIDocumentModal'
import { buildMinutesPrompt } from '@/lib/meetingMinutes'
import { generateMinutesPdf } from '@/lib/pdf'
import { useVitalInformationByMeeting } from '@/hooks/useVitalInformation'

interface MeetingMinutesButtonProps {
  meeting: Record<string, unknown>
  meetingType: 'external' | 'internal'
}

export function MeetingMinutesButton({ meeting, meetingType }: MeetingMinutesButtonProps) {
  const [open, setOpen] = useState(false)

  const partnership = meeting.partnership as { id: string } | null
  const { data: vitalInfo = [], isLoading: vitalInfoLoading } = useVitalInformationByMeeting(
    partnership?.id ?? null,
    meeting.id as string | undefined,
    meetingType,
  )

  const hasContent = Boolean(meeting.agenda || meeting.minutes || meeting.action_points)
  if (!hasContent) return null

  const title = meeting.title as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prompt = buildMinutesPrompt(meeting as any, meetingType, vitalInfo)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={vitalInfoLoading}>
        {vitalInfoLoading
          ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
        Minutes
      </Button>
      <AIDocumentModal
        open={open}
        onClose={() => setOpen(false)}
        prompt={prompt}
        headerTitle="AI Meeting Minutes"
        headerSubtitle="Detailed minutes generated from meeting content"
        loadingText="Drafting detailed minutes…"
        generateLabel="Generate Minutes"
        onSavePdf={text => generateMinutesPdf(text, title)}
      />
    </>
  )
}
