import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AIDocumentModal } from '@/components/shared/AIDocumentModal'
import { buildMinutesPrompt } from '@/lib/meetingMinutes'
import { generateMinutesPdf } from '@/lib/pdf'

interface MeetingMinutesButtonProps {
  meeting: Record<string, unknown>
  meetingType: 'external' | 'internal'
}

export function MeetingMinutesButton({ meeting, meetingType }: MeetingMinutesButtonProps) {
  const [open, setOpen] = useState(false)

  const hasContent = Boolean(meeting.agenda || meeting.minutes || meeting.action_points)
  if (!hasContent) return null

  const title = meeting.title as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prompt = buildMinutesPrompt(meeting as any, meetingType)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
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
