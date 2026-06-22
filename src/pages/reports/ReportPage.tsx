import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Download, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AIDocumentModal } from '@/components/shared/AIDocumentModal'
import { generatePdf, generateMemoPdf } from '@/lib/pdf'
import { useAISummary } from '@/hooks/useAISummary'

// ─── Inline AI Summary Box ───────────────────────────────────────────────────

function ReportSummaryBox({ prompt }: { prompt: string }) {
  const { summary, isGenerating, error, generate, reset } = useAISummary()
  const triggered = useRef(false)

  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true
      generate(prompt)
    }
  }, [generate, prompt])

  return (
    <div className="rounded-lg border border-orange-100 bg-orange-50/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={12} className="text-brand shrink-0" />
        <span className="text-xs font-semibold text-zinc-700 flex-1">AI Summary</span>
        {(summary || error) && !isGenerating && (
          <button
            type="button"
            className="text-[10px] text-zinc-400 hover:text-brand transition-colors"
            onClick={() => { reset(); setTimeout(() => generate(prompt), 50) }}
          >
            Regenerate
          </button>
        )}
      </div>
      {isGenerating && (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-10/12" />
        </div>
      )}
      {error && !isGenerating && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      {summary && !isGenerating && (
        <p className="text-[0.82rem] text-zinc-700 leading-relaxed">{summary}</p>
      )}
    </div>
  )
}

// ─── Memo Modal ───────────────────────────────────────────────────────────────

interface MemoModalProps {
  open: boolean
  onClose: () => void
  prompt: string
  filename: string
}

function MemoModal({ open, onClose, prompt, filename }: MemoModalProps) {
  return (
    <AIDocumentModal
      open={open}
      onClose={onClose}
      prompt={prompt}
      headerTitle="AI Memo"
      headerSubtitle="DDG, Operations & Benefits"
      loadingText="Drafting memorandum…"
      generateLabel="Generate Memo"
      onSavePdf={text => generateMemoPdf(text, filename)}
    />
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
  summaryPrompt?: string | null
}

export function ReportPage({
  title,
  subtitle,
  filename,
  children,
  loading,
  memoPrompt,
  summaryPrompt,
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

        {summaryPrompt && <ReportSummaryBox prompt={summaryPrompt} />}

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
