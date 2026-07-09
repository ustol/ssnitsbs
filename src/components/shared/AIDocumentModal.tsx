import { useEffect, useState } from 'react'
import { Loader2, Sparkles, FileText, AlignLeft, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAISummary } from '@/hooks/useAISummary'
import { cn } from '@/lib/utils'

type ReportType = 'detailed' | 'summary'

interface AIDocumentModalProps {
  open: boolean
  onClose: () => void
  /** Static prompt — used by MeetingMinutesButton (auto-generates on open). */
  prompt?: string
  /** Dynamic prompt builder — when provided, shows a type picker first. */
  buildPromptByType?: (type: ReportType) => string
  headerTitle: string
  headerSubtitle: string
  loadingText: string
  generateLabel: string
  onSavePdf: (text: string) => void
}

export function AIDocumentModal({
  open, onClose, prompt, buildPromptByType,
  headerTitle, headerSubtitle, loadingText, generateLabel, onSavePdf,
}: AIDocumentModalProps) {
  const { summary, isGenerating, error, generate, reset } = useAISummary()
  const [savingPdf, setSavingPdf] = useState(false)
  const [selectedType, setSelectedType] = useState<ReportType | null>(null)

  const hasTypePicker = Boolean(buildPromptByType)

  // For static-prompt usage: auto-generate on first open when no document exists
  useEffect(() => {
    if (open && !hasTypePicker && prompt && !summary && !isGenerating) {
      generate(prompt)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSelectType(type: ReportType) {
    if (!buildPromptByType) return
    setSelectedType(type)
    generate(buildPromptByType(type))
  }

  function handleRegenerate() {
    reset()
    if (hasTypePicker) {
      setSelectedType(null)
    } else if (prompt) {
      setTimeout(() => generate(prompt), 50)
    }
  }

  function handleClose() {
    if (hasTypePicker) setSelectedType(null)
    onClose()
  }

  function handleSavePdf() {
    if (!summary) return
    setSavingPdf(true)
    try { onSavePdf(summary) } finally { setSavingPdf(false) }
  }

  const showTypePicker = hasTypePicker && !selectedType && !summary && !isGenerating && !error

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center shrink-0">
            <Sparkles size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{headerTitle}</p>
            <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[200px] max-h-[65vh] overflow-y-auto">

          {/* Type picker step */}
          {showTypePicker && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-zinc-700">What kind of report would you like to generate?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectType('detailed')}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 border-zinc-200 hover:border-brand hover:bg-orange-50/60 transition-all group',
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-3 group-hover:bg-brand/20 transition-colors">
                    <AlignLeft size={15} className="text-brand" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-800 mb-1">Detailed Report</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">Full report covering everything recorded — agenda, minutes, action points, and current tracker status for each action point.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectType('summary')}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 border-zinc-200 hover:border-brand hover:bg-orange-50/60 transition-all group',
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-3 group-hover:bg-brand/20 transition-colors">
                    <List size={15} className="text-brand" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-800 mb-1">Summary</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">A few focused paragraphs with only the key highlights — purpose, main decisions, and overall action point status.</p>
                </button>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={26} className="animate-spin text-brand" />
              <p className="text-sm text-muted-foreground">{loadingText}</p>
            </div>
          )}

          {error && !isGenerating && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                Retry
              </Button>
            </div>
          )}

          {!summary && !isGenerating && !error && !showTypePicker && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Button onClick={() => prompt && generate(prompt)} className="gap-2">
                <Sparkles size={14} />
                {generateLabel}
              </Button>
            </div>
          )}

          {summary && !isGenerating && (
            <pre className="whitespace-pre-wrap font-sans text-[0.82rem] leading-relaxed text-zinc-800">
              {summary}
            </pre>
          )}
        </div>

        {/* Footer */}
        {(summary || error) && !isGenerating && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs"
              onClick={handleRegenerate}
            >
              {hasTypePicker ? 'Choose different type' : 'Regenerate'}
            </Button>
            {summary && (
              <Button
                size="sm"
                onClick={handleSavePdf}
                disabled={savingPdf}
                className="gap-1.5"
              >
                {savingPdf
                  ? <Loader2 size={13} className="animate-spin" />
                  : <FileText size={13} />
                }
                Save as PDF
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
