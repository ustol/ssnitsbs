export interface TranscriptDraft {
  title: string
  meeting_date: string
  attendees: string
  agenda: string
  minutes: string
  action_points: string
}

export function buildTranscriptEnhancementPrompt(transcript: string, meetingType: 'external' | 'internal'): string {
  const attendeesLabel = meetingType === 'external' ? 'external stakeholder attendees' : 'internal SSNIT staff attendees'

  return `You are drafting structured meeting documentation for SSNIT (Social Security and National Insurance Trust), Ghana, based strictly on the raw transcript below of a ${meetingType} meeting. Do not invent names, dates, decisions, or facts that are not present or reasonably implied by the transcript.

Return ONLY a single valid JSON object — no markdown, no code fences, no commentary — with exactly these keys:

{
  "title": "A short, descriptive meeting title inferred from the discussion",
  "meeting_date": "YYYY-MM-DD if an explicit date is stated in the transcript, otherwise an empty string",
  "attendees": "Names of ${attendeesLabel} explicitly mentioned by name, comma-separated, otherwise an empty string",
  "agenda": "The topics covered, as a clear bullet list using \\n- between items",
  "minutes": "Detailed prose summary of what was discussed, drawn strictly from the transcript",
  "action_points": "Action items as a bullet list using \\n- between items, naming the responsible party where the transcript indicates one, otherwise an empty string"
}

--- RAW TRANSCRIPT ---

${transcript}`
}

export function parseTranscriptDraft(raw: string): TranscriptDraft {
  const empty: TranscriptDraft = { title: '', meeting_date: '', attendees: '', agenda: '', minutes: '', action_points: '' }

  const tryParse = (text: string): Partial<TranscriptDraft> | null => {
    try {
      const parsed = JSON.parse(text)
      return typeof parsed === 'object' && parsed !== null ? parsed as Partial<TranscriptDraft> : null
    } catch {
      return null
    }
  }

  let parsed = tryParse(raw)
  if (!parsed) {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) parsed = tryParse(match[0])
  }

  if (!parsed) return { ...empty, minutes: raw }

  return {
    title: parsed.title ?? '',
    meeting_date: parsed.meeting_date ?? '',
    attendees: parsed.attendees ?? '',
    agenda: parsed.agenda ?? '',
    minutes: parsed.minutes ?? '',
    action_points: parsed.action_points ?? '',
  }
}
