import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Download, Loader2, Sparkles, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { generatePdf, generateMemoPdf } from '@/lib/pdf'
import { useAISummary } from '@/hooks/useAISummary'

// ─── Memo Modal ───────────────────────────────────────────────────────────────

interface MemoModalProps {
  open: boolean
  onClose: () => void
  prompt: string
  filename: string
}

function MemoModal({ open, onClose, prompt, filename }: MemoModalProps) {
  const { summary, isGenerating, error, generate, reset } = useAISummary()
  const [savingPdf, setSavingPdf] = useState(false)

  // Auto-generate on first open when no summary exists
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
      generateMemoPdf(summary, filename)
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
            <p className="text-sm font-semibold leading-tight">AI Memo</p>
            <p className="text-xs text-muted-foreground">DDG, Operations &amp; Benefits</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[200px] max-h-[65vh] overflow-y-auto">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={26} className="animate-spin text-brand" />
              <p className="text-sm text-muted-foreground">Drafting memorandum…</p>
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
                Generate Memo
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

// ─── Report Page ──────────────────────────────────────────────────────────────

interface ReportPageProps {
  title: string
  subtitle: string
  filename: string
  children: React.ReactNode
  loading?: boolean
  memoPrompt?: string | null
}

export function ReportPage({
  title,
  subtitle,
  filename,
  children,
  loading,
  memoPrompt,
}: ReportPageProps) {
  const [generating, setGenerating] = useState(false)
  const [memoOpen, setMemoOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  async function handleDownload() {
    if (!printRef.current || loading) return
    setGenerating(true)
    try {
      await generatePdf(printRef.current, filename)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <Link
          to="/reports"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ChevronLeft size={15} />
          <span className="hidden sm:inline">Back to Reports</span>
          <span className="sm:hidden">Back</span>
        </Link>

        <div className="flex items-center gap-2">
          {memoPrompt && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMemoOpen(true)}
              disabled={loading}
              className="gap-2 shrink-0"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">Generate Memo</span>
              <span className="sm:hidden">Memo</span>
            </Button>
          )}
          <Button
            onClick={handleDownload}
            disabled={generating || loading}
            size="sm"
            className="gap-2 shrink-0"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span className="hidden sm:inline">
              {generating ? 'Generating PDF…' : 'Download PDF'}
            </span>
            <span className="sm:hidden">{generating ? 'Generating…' : 'PDF'}</span>
          </Button>
        </div>
      </div>

      {/* Printable area */}
      <div
        ref={printRef}
        className="bg-white rounded-xl border p-4 sm:p-8 space-y-6 sm:space-y-8 min-h-[400px]"
      >
        {/* Branded header */}
        <div className="flex items-start justify-between pb-6 border-b">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-md bg-brand flex items-center justify-center text-white font-extrabold text-xs shrink-0">
                S
              </div>
              <span className="font-semibold text-sm text-zinc-700">
                SSNIT Strategic Business Support System
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
            <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
          </div>
          <div className="text-right text-xs text-zinc-400 shrink-0">
            <p className="text-zinc-500 font-medium">Generated</p>
            <p className="text-zinc-700 font-semibold mt-0.5">
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-zinc-400">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {children}
      </div>

      {/* Memo modal — always mounted so generated memo persists across open/close */}
      {memoPrompt && (
        <MemoModal
          open={memoOpen}
          onClose={() => setMemoOpen(false)}
          prompt={memoPrompt}
          filename={filename}
        />
      )}
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function KpiRow({
  items,
}: {
  items: { label: string; value: string | number; color?: string }[]
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(item => (
        <div key={item.label} className="p-3 sm:p-4 rounded-lg border bg-zinc-50">
          <p className="text-xs text-zinc-500 font-medium leading-snug">{item.label}</p>
          <p className={`text-xl sm:text-2xl font-bold tabular-nums mt-1 ${item.color ?? 'text-zinc-900'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-zinc-800 border-b pb-2">{children}</h2>
}

export function ChartWrapper({
  children,
  minWidth = 300,
}: {
  children: React.ReactNode
  minWidth?: number
}) {
  return (
    <div className="overflow-x-auto w-full">
      <div style={{ minWidth }}>{children}</div>
    </div>
  )
}

export function ReportTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: (string | number)[][]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 border-b">
            {headers.map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-zinc-50/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-xs text-zinc-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-xs text-zinc-400"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
