import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Mic, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePartnerships } from '@/hooks/usePartnerships'
import { useCreateExternalMeeting, useCreateInternalMeeting } from '@/hooks/useMeetings'
import { uploadPendingFiles } from '@/hooks/useMeetingAttachments'
import { useTranscribeAudio } from '@/hooks/useTranscription'
import { useAISummary } from '@/hooks/useAISummary'
import { buildTranscriptEnhancementPrompt, parseTranscriptDraft } from '@/lib/meetingTranscribe'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, formatBytes } from '@/lib/storage'
import { writeAudit } from '@/hooks/useAuditLog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { PartnershipWithRelations } from '@/types/database'

const AUDIO_MIME_TYPES = ALLOWED_MIME_TYPES.filter(t => t.startsWith('audio/'))

type MeetingType = 'external' | 'internal'

export function MinutesTranscribe() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: partnerships = [] } = usePartnerships()
  const { transcribe, error: transcribeError } = useTranscribeAudio()
  const { summary, error: aiError, generate, reset: resetAI } = useAISummary()
  const createExternal = useCreateExternalMeeting()
  const createInternal = useCreateInternalMeeting()

  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [phase, setPhase] = useState<'idle' | 'transcribing' | 'drafting'>('idle')

  const [meetingType, setMeetingType] = useState<MeetingType>('external')
  const [partnershipId, setPartnershipId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [transcript, setTranscript] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [location, setLocation] = useState('')
  const [attendees, setAttendees] = useState('')
  const [agenda, setAgenda] = useState('')
  const [minutes, setMinutes] = useState('')
  const [actionPoints, setActionPoints] = useState('')

  // Once the AI draft comes back, parse it into the editable fields and move to review
  useEffect(() => {
    if (phase !== 'drafting' || !summary) return
    const draft = parseTranscriptDraft(summary)
    setTitle(draft.title)
    setMeetingDate(draft.meeting_date)
    setAttendees(draft.attendees)
    setAgenda(draft.agenda)
    setMinutes(draft.minutes)
    setActionPoints(draft.action_points)
    setPhase('idle')
    setStep('review')
  }, [summary, phase])

  useEffect(() => {
    if (phase === 'drafting' && aiError) setPhase('idle')
  }, [aiError, phase])

  function pickFile(raw: FileList | null) {
    const f = raw?.[0]
    if (!f) return
    if (!AUDIO_MIME_TYPES.includes(f.type)) { toast.error(`"${f.name}" is not a supported audio type`); return }
    if (f.size > MAX_FILE_SIZE) { toast.error(`"${f.name}" exceeds the ${formatBytes(MAX_FILE_SIZE)} size limit`); return }
    setFile(f)
  }

  async function handleTranscribeAndDraft() {
    if (!file) return
    resetAI()
    setTranscript('')
    setPhase('transcribing')
    const text = await transcribe(file)
    if (!text) { setPhase('idle'); return }
    setTranscript(text)
    setPhase('drafting')
    generate(buildTranscriptEnhancementPrompt(text, meetingType))
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Title is required'); return }
    setIsSaving(true)
    try {
      const base = {
        title: title.trim(),
        partnership_id: partnershipId || null,
        meeting_date: meetingDate || null,
        location: location.trim() || null,
        agenda: agenda || null,
        minutes: minutes || null,
        action_points: actionPoints || null,
      }

      let created: { id: string; title: string }
      if (meetingType === 'external') {
        const payload = { ...base, attendees_external: attendees || null }
        created = await createExternal.mutateAsync(payload) as unknown as { id: string; title: string }
      } else {
        const payload = { ...base, attendees_internal: attendees || null }
        created = await createInternal.mutateAsync(payload) as unknown as { id: string; title: string }
      }

      if (file) {
        try {
          await uploadPendingFiles([{ file, previewUrl: null, type: 'audio', isDisplay: false }], meetingType, created.id)
        } catch (uploadErr) {
          toast.error(`Recording could not be attached: ${(uploadErr as Error).message}`)
        }
      }

      writeAudit({
        action: 'created',
        entity_type: meetingType === 'external' ? 'external_meeting' : 'internal_meeting',
        entity_id: created.id,
        entity_name: created.title,
      })
      navigate(`/meetings/${meetingType}/${created.id}`)
    } catch (err) {
      toast.error(`Failed to save meeting: ${(err as Error).message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const busy = phase !== 'idle'

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <PageHeader
        title="Minutes Transcribe"
        subtitle="Upload a meeting recording — AI drafts the agenda, minutes, and action points"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back
          </Button>
        }
      />

      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Meeting Type</label>
                <Select value={meetingType} onValueChange={v => setMeetingType(v as MeetingType)} disabled={busy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External Meeting</SelectItem>
                    <SelectItem value="internal">Internal Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Partnership <span className="text-destructive">*</span></label>
                <Select value={partnershipId} onValueChange={setPartnershipId} disabled={busy}>
                  <SelectTrigger><SelectValue placeholder="Select partnership" /></SelectTrigger>
                  <SelectContent>
                    {(partnerships as PartnershipWithRelations[]).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Audio Recording <span className="text-destructive">*</span></label>
              <div
                className="relative border-2 border-dashed border-zinc-200 hover:border-brand/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-orange-50/30"
                onClick={() => inputRef.current?.click()}
                onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files) }}
                onDragOver={e => e.preventDefault()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={AUDIO_MIME_TYPES.join(',')}
                  className="hidden"
                  onChange={e => pickFile(e.target.files)}
                />
                <Mic size={20} className="mx-auto mb-2 text-zinc-400" />
                <p className="text-sm font-medium text-zinc-600">Drop a recording here or click to select</p>
                <p className="text-xs text-zinc-400 mt-0.5">MP3, M4A, WAV, OGG, or WebM — up to {formatBytes(MAX_FILE_SIZE)}</p>
              </div>

              {file && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 bg-white text-sm">
                  <Mic size={14} className="text-purple-500 shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-xs font-medium text-zinc-800">{file.name}</span>
                  <span className="text-[10px] text-zinc-400 shrink-0">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={busy}
                    className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {(transcribeError || aiError) && (
              <p className="text-sm text-red-500">{transcribeError || aiError}</p>
            )}

            <Button
              type="button"
              className="w-full gap-2"
              disabled={!file || !partnershipId || busy}
              onClick={handleTranscribeAndDraft}
            >
              {phase === 'transcribing' && <><Loader2 size={14} className="animate-spin" />Transcribing audio…</>}
              {phase === 'drafting' && <><Loader2 size={14} className="animate-spin" />Drafting minutes…</>}
              {phase === 'idle' && <><Sparkles size={14} />Transcribe &amp; Draft</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'review' && (
        <>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Location</label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Venue or online link" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Attendees</label>
                <Textarea rows={3} value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="Name, Organisation, Position" className="font-mono text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Agenda</label>
                <Textarea rows={3} value={agenda} onChange={e => setAgenda(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Minutes</label>
                <Textarea rows={6} value={minutes} onChange={e => setMinutes(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Action Points</label>
                <Textarea rows={3} value={actionPoints} onChange={e => setActionPoints(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-5 cursor-pointer" onClick={() => setShowTranscript(v => !v)}>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Raw Transcript
                {showTranscript ? <ChevronUp size={14} className="ml-auto text-muted-foreground" /> : <ChevronDown size={14} className="ml-auto text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            {showTranscript && (
              <>
                <Separator />
                <CardContent className="pt-4">
                  <p className="whitespace-pre-wrap text-xs text-zinc-600">{transcript}</p>
                </CardContent>
              </>
            )}
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setStep('upload')} disabled={isSaving}>Back</Button>
            <Button type="button" onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              Save Meeting
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
