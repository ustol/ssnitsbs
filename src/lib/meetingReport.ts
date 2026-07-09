import { formatDate } from '@/lib/utils'
import type { ActionPoint } from '@/hooks/useActionPoints'

type ReportType = 'detailed' | 'summary'

function trackerBlock(trackerPoints: ActionPoint[]): string {
  if (trackerPoints.length === 0) return 'No action points tracked in the action point tracker.'
  return trackerPoints
    .map(ap => {
      const label = ap.status === 'done' ? 'Done' : ap.status === 'failed' ? 'Failed' : 'Pending'
      return `• ${ap.content} [${label}]${ap.notes ? ` — Notes: ${ap.notes}` : ''}`
    })
    .join('\n')
}

const BASE_INSTRUCTION = `Draw strictly from the source data below — do not invent facts, names, figures, or decisions not present in the data. Do not alter the meaning of anything that was written. Write in clear, natural, humanised English. Do not use em dashes.`

export function buildExternalMeetingReportPrompt(
  meeting: Record<string, unknown>,
  trackerPoints: ActionPoint[],
  reportType: ReportType,
): string {
  const title = meeting.title as string
  const date = meeting.meeting_date ? formatDate(meeting.meeting_date as string) : 'Not recorded'
  const attendees = (meeting.attendees_external as string | null) || 'Not recorded'
  const agenda = (meeting.agenda as string | null) || 'Not recorded'
  const minutes = (meeting.minutes as string | null) || 'Not recorded'
  const actionPoints = (meeting.action_points as string | null) || 'Not recorded'
  const partnership = meeting.partnership as { id: string; title: string } | null
  const tracker = trackerBlock(trackerPoints)

  const sourceData = `--- SOURCE DATA ---
Meeting Title: ${title}
Date: ${date}
Type: External Meeting${partnership ? `\nPartnership: ${partnership.title}` : ''}
Attendees: ${attendees}
Agenda: ${agenda}
Minutes / Notes: ${minutes}
Action Points Raised: ${actionPoints}

Action Point Tracker Status:
${tracker}`

  if (reportType === 'summary') {
    return `You are drafting a concise summary of an external meeting for SSNIT (Social Security and National Insurance Trust), Ghana. ${BASE_INSTRUCTION}

Output only a few focused paragraphs covering the key highlights of this meeting — what it was about, the most important points discussed, any key decisions, and the overall status of action points.

${sourceData}`
  }

  return `You are drafting a detailed official report of an external meeting for SSNIT (Social Security and National Insurance Trust), Ghana. ${BASE_INSTRUCTION}

Output ONLY the report in the exact structure below, replacing each bracketed instruction with content drawn from the source data. Do not summarise the minutes — include every point that was recorded.

MEETING REPORT

MEETING: ${title}
DATE: ${date}
TYPE: External Meeting${partnership ? `\nPARTNERSHIP: ${partnership.title}` : ''}

ATTENDEES
[List all attendees from the source data, or "Not recorded" if none.]

AGENDA
[Write out the full agenda items as recorded. Do not shorten or paraphrase.]

MINUTES
[Write out the full meeting minutes and notes as recorded. Do not summarise — include every point. Maintain the exact meaning of what was written.]

ACTION POINTS
[List every action point raised. Then cross-reference the Action Point Tracker Status below to show the current status of each one (Pending, Done, or Failed) and any notes recorded against them.]

${sourceData}`
}

export function buildInternalMeetingReportPrompt(
  meeting: Record<string, unknown>,
  trackerPoints: ActionPoint[],
  reportType: ReportType,
): string {
  const title = meeting.title as string
  const date = meeting.meeting_date ? formatDate(meeting.meeting_date as string) : 'Not recorded'
  const agenda = (meeting.agenda as string | null) || 'Not recorded'
  const minutes = (meeting.minutes as string | null) || 'Not recorded'
  const actionPoints = (meeting.action_points as string | null) || 'Not recorded'
  const partnership = meeting.partnership as { id: string; title: string } | null
  const tracker = trackerBlock(trackerPoints)

  const sourceData = `--- SOURCE DATA ---
Meeting Title: ${title}
Date: ${date}
Type: Internal Meeting${partnership ? `\nPartnership: ${partnership.title}` : ''}
Agenda: ${agenda}
Minutes / Notes: ${minutes}
Action Points Raised: ${actionPoints}

Action Point Tracker Status:
${tracker}`

  if (reportType === 'summary') {
    return `You are drafting a concise summary of an internal meeting for SSNIT (Social Security and National Insurance Trust), Ghana. ${BASE_INSTRUCTION}

Output only a few focused paragraphs covering the key highlights of this meeting — what it was about, the most important points discussed, any key decisions, and the overall status of action points.

${sourceData}`
  }

  return `You are drafting a detailed official report of an internal meeting for SSNIT (Social Security and National Insurance Trust), Ghana. ${BASE_INSTRUCTION}

Output ONLY the report in the exact structure below, replacing each bracketed instruction with content drawn from the source data. Do not summarise the minutes — include every point that was recorded.

MEETING REPORT

MEETING: ${title}
DATE: ${date}
TYPE: Internal Meeting${partnership ? `\nPARTNERSHIP: ${partnership.title}` : ''}

AGENDA
[Write out the full agenda items as recorded. Do not shorten or paraphrase.]

MINUTES
[Write out the full meeting minutes and notes as recorded. Do not summarise — include every point. Maintain the exact meaning of what was written.]

ACTION POINTS
[List every action point raised. Then cross-reference the Action Point Tracker Status below to show the current status of each one (Pending, Done, or Failed) and any notes recorded against them.]

${sourceData}`
}
