import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AIDocumentModal } from '@/components/shared/AIDocumentModal'
import { buildExternalMeetingReportPrompt, buildInternalMeetingReportPrompt } from '@/lib/meetingReport'
import { generateMeetingReportPdf } from '@/lib/pdf'
import { useActionPointsByMeeting } from '@/hooks/useActionPoints'

interface MeetingReportButtonProps {
  meeting: Record<string, unknown>
  meetingType: 'external' | 'internal'
}

export function MeetingReportButton({ meeting, meetingType }: MeetingReportButtonProps) {
  const [open, setOpen] = useState(false)

  const { data: trackerPoints = [] } = useActionPointsByMeeting(meeting.id as string | null)

  const hasContent = Boolean(meeting.agenda || meeting.minutes || meeting.action_points)
  if (!hasContent) return null

  const title = meeting.title as string

  const buildPromptByType = (type: 'detailed' | 'summary') =>
    meetingType === 'external'
      ? buildExternalMeetingReportPrompt(meeting, trackerPoints, type)
      : buildInternalMeetingReportPrompt(meeting, trackerPoints, type)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />Report
      </Button>
      <AIDocumentModal
        open={open}
        onClose={() => setOpen(false)}
        buildPromptByType={buildPromptByType}
        headerTitle="AI Meeting Report"
        headerSubtitle={`${meetingType === 'external' ? 'External' : 'Internal'} meeting report`}
        loadingText="Drafting meeting report…"
        generateLabel="Generate Report"
        onSavePdf={text => generateMeetingReportPdf(text, title)}
      />
    </>
  )
}
