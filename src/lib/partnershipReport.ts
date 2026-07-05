import { formatDate } from '@/lib/utils'
import type { PartnershipWithRelations, ExternalMeeting, InternalMeeting } from '@/types/database'

interface VitalInfoItem {
  date: string
  subject: string
  details: string | null
}

function sortByDate<T extends { meeting_date: string | null }>(meetings: T[]): T[] {
  return [...meetings].sort((a, b) => {
    if (!a.meeting_date && !b.meeting_date) return 0
    if (!a.meeting_date) return 1
    if (!b.meeting_date) return -1
    return b.meeting_date.localeCompare(a.meeting_date)
  })
}

function externalMeetingBlock(m: ExternalMeeting, i: number): string {
  return `Meeting ${i + 1}: ${m.title}
Date: ${m.meeting_date ? formatDate(m.meeting_date) : 'Not recorded'}
Attendees: ${m.attendees_external || 'Not recorded'}
Agenda: ${m.agenda || 'Not recorded'}
Minutes/Notes: ${m.minutes || 'Not recorded'}
Action Points: ${m.action_points || 'Not recorded'}`
}

function internalMeetingBlock(m: InternalMeeting, i: number): string {
  return `Meeting ${i + 1}: ${m.title}
Date: ${m.meeting_date ? formatDate(m.meeting_date) : 'Not recorded'}
Agenda: ${m.agenda || 'Not recorded'}
Minutes/Notes: ${m.minutes || 'Not recorded'}
Action Points: ${m.action_points || 'Not recorded'}`
}

export function buildPartnershipReportPrompt(
  p: PartnershipWithRelations,
  vitalInfo: VitalInfoItem[],
): string {
  const extMeetings = sortByDate(p.external_meetings ?? [])
  const intMeetings = sortByDate(p.internal_meetings ?? [])

  const externalStakeholders = (p.external_stakeholders ?? [])
    .map(({ stakeholder: s }) => `${s.name}${s.organization ? ` (${s.organization})` : ''}`)
    .join(', ') || 'None recorded'

  const internalStakeholders = (p.internal_stakeholders ?? [])
    .map(({ stakeholder: s }) => `${s.name}${s.department ? `, ${s.department}` : ''}`)
    .join(', ') || 'None recorded'

  const vitalLines = vitalInfo.length > 0
    ? vitalInfo.map(v => `• [${formatDate(v.date)}] ${v.subject}${v.details ? ` — ${v.details}` : ''}`).join('\n')
    : 'None recorded'

  const extMeetingData = extMeetings.length > 0
    ? extMeetings.map((m, i) => externalMeetingBlock(m, i)).join('\n\n')
    : 'None recorded'

  const intMeetingData = intMeetings.length > 0
    ? intMeetings.map((m, i) => internalMeetingBlock(m, i)).join('\n\n')
    : 'None recorded'

  const extMeetingTemplate = extMeetings.length === 0
    ? 'There has been no external stakeholder meeting held in respect of this partnership as yet.'
    : extMeetings.map(m =>
        `Meeting of ${m.meeting_date ? formatDate(m.meeting_date) : 'unrecorded date'}:\n[One concise paragraph: key discussion points, decisions, and outcomes. Be direct — no padding.]`
      ).join('\n\n')

  const intMeetingTemplate = intMeetings.length === 0
    ? 'There has been no internal stakeholder meeting held in respect of this partnership as yet.'
    : intMeetings.map(m =>
        `Meeting of ${m.meeting_date ? formatDate(m.meeting_date) : 'unrecorded date'}:\n[One concise paragraph: key discussion points, decisions, and outcomes. Be direct — no padding.]`
      ).join('\n\n')

  return `You are drafting an official partnership progress report for SSNIT (Social Security and National Insurance Trust), Ghana. Draw strictly from the source data below. Do not invent names, figures, decisions, or facts not present or reasonably implied by the data. Write in formal, professional English. Keep each section tight — no long-winded prose.

Output ONLY the report in the exact structure below, replacing each bracketed instruction with actual content drawn from the source data.

PARTNERSHIP REPORT

PARTNERSHIP: ${p.title}
ORGANISATION: ${p.organization || 'N/A'}
START DATE: ${p.start_date ? formatDate(p.start_date) : 'Not recorded'}
STATUS: ${p.status?.name ?? 'Not recorded'}

INTRODUCTION
[One focused paragraph: the nature and purpose of this partnership, when it commenced, SSNIT's strategic interest in it, and who the key internal and external stakeholders are on each side.]

EXTERNAL STAKEHOLDER MEETINGS
${extMeetingTemplate}

INTERNAL STAKEHOLDER MEETINGS
${intMeetingTemplate}

CONCLUSION
[One focused paragraph: overall assessment of the partnership's current progress, notable themes from the meetings recorded, and key outstanding actions or next steps.]

--- SOURCE DATA ---

PARTNERSHIP DETAILS:
Title: ${p.title}
Organisation: ${p.organization || 'N/A'}
Start Date: ${p.start_date ? formatDate(p.start_date) : 'Not recorded'}
Status: ${p.status?.name ?? 'Not recorded'}
Description: ${p.description || 'Not recorded'}
Proposed Value: ${p.proposed_value != null ? p.proposed_value.toLocaleString() : 'Not recorded'}

INTERNAL STAKEHOLDERS:
${internalStakeholders}

EXTERNAL STAKEHOLDERS:
${externalStakeholders}

EXTERNAL MEETINGS (most recent first):
${extMeetingData}

INTERNAL MEETINGS (most recent first):
${intMeetingData}

VITAL INFORMATION:
${vitalLines}`
}
