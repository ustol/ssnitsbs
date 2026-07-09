import { formatDate } from '@/lib/utils'
import type { PartnershipWithRelations, ExternalMeeting, InternalMeeting } from '@/types/database'
import type { ActionPoint } from '@/hooks/useActionPoints'

type ReportType = 'detailed' | 'summary'

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

function trackerBlockForMeeting(meetingId: string, trackerPoints: ActionPoint[]): string {
  const pts = trackerPoints.filter(ap => ap.meeting_id === meetingId)
  if (pts.length === 0) return 'No action points tracked in the action point tracker.'
  return pts
    .map(ap => {
      const label = ap.status === 'done' ? 'Done' : ap.status === 'failed' ? 'Failed' : 'Pending'
      return `  • ${ap.content} [${label}]${ap.notes ? ` — Notes: ${ap.notes}` : ''}`
    })
    .join('\n')
}

function externalMeetingBlock(m: ExternalMeeting, i: number, trackerPoints: ActionPoint[]): string {
  return `Meeting ${i + 1}: ${m.title}
Date: ${m.meeting_date ? formatDate(m.meeting_date) : 'Not recorded'}
Attendees: ${m.attendees_external || 'Not recorded'}
Agenda: ${m.agenda || 'Not recorded'}
Minutes/Notes: ${m.minutes || 'Not recorded'}
Action Points: ${m.action_points || 'Not recorded'}
Tracker Status:
${trackerBlockForMeeting(m.id, trackerPoints)}`
}

function internalMeetingBlock(m: InternalMeeting, i: number, trackerPoints: ActionPoint[]): string {
  return `Meeting ${i + 1}: ${m.title}
Date: ${m.meeting_date ? formatDate(m.meeting_date) : 'Not recorded'}
Agenda: ${m.agenda || 'Not recorded'}
Minutes/Notes: ${m.minutes || 'Not recorded'}
Action Points: ${m.action_points || 'Not recorded'}
Tracker Status:
${trackerBlockForMeeting(m.id, trackerPoints)}`
}

const BASE_INSTRUCTION = `Draw strictly from the source data below. Do not invent names, figures, decisions, or facts not present or reasonably implied by the data. Do not alter the meaning of anything that was written. Write in clear, natural, humanised English. Do not use em dashes.`

export function buildPartnershipReportPrompt(
  p: PartnershipWithRelations,
  vitalInfo: VitalInfoItem[],
  reportType: ReportType,
  trackerPoints: ActionPoint[],
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
    ? extMeetings.map((m, i) => externalMeetingBlock(m, i, trackerPoints)).join('\n\n')
    : 'None recorded'

  const intMeetingData = intMeetings.length > 0
    ? intMeetings.map((m, i) => internalMeetingBlock(m, i, trackerPoints)).join('\n\n')
    : 'None recorded'

  const allTracked = trackerPoints.filter(ap =>
    [...extMeetings, ...intMeetings].some(m => m.id === ap.meeting_id)
  )
  const trackerSummary = allTracked.length === 0
    ? 'None tracked.'
    : allTracked.map(ap => {
        const label = ap.status === 'done' ? 'Done' : ap.status === 'failed' ? 'Failed' : 'Pending'
        return `• [${label}] ${ap.content}${ap.notes ? ` (Notes: ${ap.notes})` : ''} — from ${ap.meeting_title}`
      }).join('\n')

  const sourceData = `--- SOURCE DATA ---

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

  if (reportType === 'summary') {
    return `You are drafting a concise summary of a partnership for SSNIT (Social Security and National Insurance Trust), Ghana. ${BASE_INSTRUCTION}

Output only a few focused paragraphs covering the key highlights: the partnership's purpose and current status, what was discussed and decided in the most significant meetings, the overall status of action points, and any key vital information recorded.

ACTION POINT TRACKER (overall):
${trackerSummary}

${sourceData}`
  }

  // Detailed report
  const extMeetingTemplate = extMeetings.length === 0
    ? 'There has been no external stakeholder meeting held in respect of this partnership as yet.'
    : extMeetings.map(m =>
        `Meeting of ${m.meeting_date ? formatDate(m.meeting_date) : 'unrecorded date'}:\n[Write a full account of this meeting: attendees, full agenda, full minutes (do not summarise — include every point recorded), and action points with their current tracker status.]`
      ).join('\n\n')

  const intMeetingTemplate = intMeetings.length === 0
    ? 'There has been no internal stakeholder meeting held in respect of this partnership as yet.'
    : intMeetings.map(m =>
        `Meeting of ${m.meeting_date ? formatDate(m.meeting_date) : 'unrecorded date'}:\n[Write a full account of this meeting: full agenda, full minutes (do not summarise — include every point recorded), and action points with their current tracker status.]`
      ).join('\n\n')

  return `You are drafting a comprehensive, detailed official partnership report for SSNIT (Social Security and National Insurance Trust), Ghana. ${BASE_INSTRUCTION}

Output ONLY the report in the exact structure below, replacing each bracketed instruction with content drawn from the source data. Do not summarise meetings — include everything that was recorded.

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

ACTION POINT STATUS SUMMARY
[List all tracked action points with their current status (Pending / Done / Failed) and any notes. Group by meeting where applicable.]

VITAL INFORMATION
[List each vital information record with its date and full details as recorded.]

CONCLUSION
[One focused paragraph: overall assessment of the partnership's current progress, notable themes from the meetings, and key outstanding actions or next steps.]

ACTION POINT TRACKER (overall):
${trackerSummary}

${sourceData}`
}
