import { useEffect, useState } from 'react'
import { Loader2, Sparkles, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAISummary } from '@/hooks/useAISummary'

interface AIDocumentModalProps {
  open: boolean
  onClose: () => void
  prompt: string
  headerTitle: string
  headerSubtitle: string
  loadingText: string
  generateLabel: string
  onSavePdf: (text: string) => void
}

export function AIDocumentModal({
  open, onClose, prompt, headerTitle, headerSubtitle, loadingText, generateLabel, onSavePdf,
}: AIDocumentModalProps) {
  const { summary, isGenerating, error, generate, reset } = useAISummary()
  const [savingPdf, setSavingPdf] = useState(false)

  // Auto-generate on first open when no document exists
  useEffect(() => {
    if (open && !summary && !isGenerating) {
      generate(prompt)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleRegenerate() {
    reset()
    setTimeout(() => generate(prompt), 50)
  }

  function handleSavePdf() {
    if (!summary) return
    setSavingPdf(true)
    try {
      onSavePdf(summary)
    } finally {
      setSavingPdf(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
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
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={26} className="animate-spin text-brand" />
              <p className="text-sm text-muted-foreground">{loadingText}</p>
            </div>
          )}

          {error && !isGenerating && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={() => generate(prompt)}>
                Retry
              </Button>
            </div>
          )}

          {!summary && !isGenerating && !error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Button onClick={() => generate(prompt)} className="gap-2">
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
              Regenerate
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
