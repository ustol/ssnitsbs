import { formatDate } from '@/lib/utils'

interface MeetingForMinutes {
  title: string
  meeting_date?: string | null
  location?: string | null
  agenda?: string | null
  minutes?: string | null
  action_points?: string | null
  attendees_external?: string | null
  attendees_internal?: string | null
  partnership?: { title: string } | null
  status?: { name: string } | null
  subjects?: { subject: string; outcome: string | null }[] | null
}

export function buildMinutesPrompt(meeting: MeetingForMinutes, type: 'external' | 'internal'): string {
  const dateStr = meeting.meeting_date ? formatDate(meeting.meeting_date) : 'Not recorded'
  const attendees = (type === 'external' ? meeting.attendees_external : meeting.attendees_internal) || 'Not recorded'

  const subjectLines = type === 'internal' && meeting.subjects && meeting.subjects.length > 0
    ? meeting.subjects.map((s, i) => `  ${i + 1}. ${s.subject}${s.outcome ? ` — Outcome: ${s.outcome}` : ''}`).join('\n')
    : null

  return `You are drafting official meeting minutes for SSNIT (Social Security and National Insurance Trust), Ghana, based strictly on the source material below. Do not invent names, figures, decisions, or facts that are not present or reasonably implied by the source. If a section has no underlying information, write "Not recorded" for that section instead of fabricating content.

Expand the raw notes into full, detailed, professional meeting minutes — clear prose for narrative sections, bullet points (using "-") for lists. Output ONLY the minutes in the exact structure below, with no preamble or commentary.

MEETING MINUTES

MEETING: ${meeting.title}
DATE: ${dateStr}
LOCATION: ${meeting.location || 'Not recorded'}
PARTNERSHIP: ${meeting.partnership?.title ?? 'N/A'}
STATUS: ${meeting.status?.name ?? 'Not recorded'}
ATTENDEES: ${attendees}

1. AGENDA
[Expand the raw agenda into a clear list of topics covered]

2. SUMMARY OF DISCUSSION
[Detailed narrative of what was discussed, drawn strictly from the raw minutes/notes below]

3. KEY DECISIONS & OUTCOMES
[Decisions or outcomes reached, or "Not recorded" if none stated]

4. ACTION ITEMS
[Action items as a bullet list, naming the responsible party where the source indicates one]

5. NEXT STEPS
[Brief recommended follow-up based strictly on the source material]

--- SOURCE MATERIAL ---

RAW AGENDA:
${meeting.agenda || 'Not recorded'}

RAW MINUTES / NOTES:
${meeting.minutes || 'Not recorded'}

RAW ACTION POINTS:
${meeting.action_points || 'Not recorded'}${subjectLines ? `\n\nDISCUSSION SUBJECTS (structured):\n${subjectLines}` : ''}`
}
