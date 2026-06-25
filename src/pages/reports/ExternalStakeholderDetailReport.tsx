import { useParams } from 'react-router-dom'
import { useExternalStakeholderDetailReport } from '@/hooks/useReports'
import { ReportPage, KpiRow, SectionTitle, ReportTable } from './ReportPage'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'

type StakeholderDetail = NonNullable<ReturnType<typeof useExternalStakeholderDetailReport>['data']>

function buildAISummary(data: StakeholderDetail): string {
  const s = data.stakeholder
  return `Write exactly 2 concise sentences profiling SSNIT's engagement with this external stakeholder. Sentence 1: who they are, their organisation, and how many partnerships/meetings they're linked to. Sentence 2: a notable engagement insight (recency, depth, or a gap). No preambles.\n\nDATA: ${s.name} (${s.organization ?? 'Unknown org'}) | ${data.partnerships.length} partnership(s) | ${data.meetingCount} meeting(s)${data.lastMeetingDate ? ` | last meeting ${data.lastMeetingDate}` : ' | no meetings recorded'}`
}

function buildPrompt(data: StakeholderDetail): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const s = data.stakeholder

  const partnershipLines = data.partnerships
    .map(p => `  • ${p.title}${p.status?.name ? ` [${p.status.name}]` : ''}${p.organization ? ` — ${p.organization}` : ''}`)
    .join('\n')

  const meetingLines = data.meetings.slice(0, 10)
    .map(m => `  • ${m.title} (${m.meeting_date ? formatDate(m.meeting_date) : 'date not set'}) — ${m.partnershipTitle ?? 'Unknown partnership'}${m.location ? ` @ ${m.location}` : ''}`)
    .join('\n')

  const vitalLines = data.vitalInfo.slice(0, 10)
    .map(v => `  • [${formatDate(v.date)}] ${v.subject}${v.details ? `: ${v.details}` : ''}`)
    .join('\n')

  return `Write a formal internal memorandum from the Special Business Support Team to the DDG, Operations and Benefits, SSNIT.

Output the memo EXACTLY in this format (include all header lines):

MEMORANDUM

TO: DDG, Operations and Benefits
FROM: Special Business Support Team
DATE: ${today}
SUBJECT: External Stakeholder Profile — ${s.name}

[Write exactly 3 paragraphs: (1) who this stakeholder is — name, role/title, organisation, and how many partnerships and meetings they're connected to; (2) specifics of their engagement — name the partnerships, cite recent meeting activity and any notable vital information; (3) recommended next steps to maintain or deepen this relationship. Reference actual names and figures, and write "Not recorded" rather than inventing anything not present below.]

--- DATA ---

STAKEHOLDER: ${s.name}
TITLE: ${s.title ?? 'Not recorded'}
ORGANISATION: ${s.organization ?? 'Not recorded'}
EMAIL: ${s.email ?? 'Not recorded'}
PHONE: ${s.phone ?? 'Not recorded'}
NOTES: ${s.notes ?? 'Not recorded'}

LINKED PARTNERSHIPS (${data.partnerships.length}):
${partnershipLines || '  None'}

RECENT MEETINGS (${data.meetingCount} total):
${meetingLines || '  None recorded'}

VITAL INFORMATION:
${vitalLines || '  None recorded'}`
}

export function ExternalStakeholderDetailReport() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useExternalStakeholderDetailReport(id!)

  return (
    <ReportPage
      title={data ? data.stakeholder.name : 'External Stakeholder Profile'}
      subtitle="Individual engagement profile — partnerships, meetings and vital information"
      filename={data ? `Stakeholder Profile — ${data.stakeholder.name}` : 'Stakeholder Profile'}
      loading={isLoading}
      memoPrompt={data ? buildPrompt(data) : null}
      summaryPrompt={data ? buildAISummary(data) : null}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      ) : data && (
        <>
          <KpiRow items={[
            { label: 'Partnerships',    value: data.partnerships.length },
            { label: 'Meetings',        value: data.meetingCount },
            { label: 'Last Meeting',    value: data.lastMeetingDate ? formatDate(data.lastMeetingDate) : '—' },
            { label: 'Vital Info Items', value: data.vitalInfo.length },
          ]} />

          <div className="space-y-3">
            <SectionTitle>Contact Profile</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4 bg-zinc-50/60">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Title</p>
                <p className="text-sm mt-0.5">{data.stakeholder.title ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Organisation</p>
                <p className="text-sm mt-0.5">{data.stakeholder.organization ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="text-sm mt-0.5">{data.stakeholder.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Phone</p>
                <p className="text-sm mt-0.5">{data.stakeholder.phone ?? '—'}</p>
              </div>
              {data.stakeholder.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{data.stakeholder.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle>Linked Partnerships</SectionTitle>
            <ReportTable
              headers={['Partnership', 'Organisation', 'Status', 'Proposed Value']}
              rows={data.partnerships.map(p => [
                p.title,
                p.organization ?? '—',
                p.status?.name ?? '—',
                p.proposed_value != null ? p.proposed_value.toLocaleString() : '—',
              ])}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle>Related Meetings</SectionTitle>
            <ReportTable
              headers={['Meeting', 'Partnership', 'Date', 'Location', 'Status']}
              rows={data.meetings.map(m => [
                m.title,
                m.partnershipTitle ?? '—',
                m.meeting_date ? formatDate(m.meeting_date) : '—',
                m.location ?? '—',
                m.status?.name ?? '—',
              ])}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle>Vital Information</SectionTitle>
            <ReportTable
              headers={['Date', 'Subject', 'Details']}
              rows={data.vitalInfo.map(v => [
                formatDate(v.date),
                v.subject,
                v.details ?? '—',
              ])}
            />
          </div>
        </>
      )}
    </ReportPage>
  )
}
