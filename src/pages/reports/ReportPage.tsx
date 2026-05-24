import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Download, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generatePdf } from '@/lib/pdf'
import { useAISummary } from '@/hooks/useAISummary'

interface ReportPageProps {
  title: string
  subtitle: string
  filename: string
  children: React.ReactNode
  loading?: boolean
}

export function ReportPage({ title, subtitle, filename, children, loading }: ReportPageProps) {
  const [generating, setGenerating] = useState(false)
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
        <Button onClick={handleDownload} disabled={generating || loading} size="sm" className="gap-2 shrink-0">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span className="hidden sm:inline">{generating ? 'Generating PDF…' : 'Download PDF'}</span>
          <span className="sm:hidden">{generating ? 'Generating…' : 'PDF'}</span>
        </Button>
      </div>

      {/* Printable area */}
      <div ref={printRef} className="bg-white rounded-xl border p-4 sm:p-8 space-y-6 sm:space-y-8 min-h-[400px]">
        {/* Branded header */}
        <div className="flex items-start justify-between pb-6 border-b">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-md bg-brand flex items-center justify-center text-white font-extrabold text-xs shrink-0">S</div>
              <span className="font-semibold text-sm text-zinc-700">SSNIT Strategic Business Support System</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
            <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
          </div>
          <div className="text-right text-xs text-zinc-400 shrink-0">
            <p className="text-zinc-500 font-medium">Generated</p>
            <p className="text-zinc-700 font-semibold mt-0.5">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-zinc-400">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function KpiRow({ items }: { items: { label: string; value: string | number; color?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(item => (
        <div key={item.label} className="p-3 sm:p-4 rounded-lg border bg-zinc-50">
          <p className="text-xs text-zinc-500 font-medium leading-snug">{item.label}</p>
          <p className={`text-xl sm:text-2xl font-bold tabular-nums mt-1 ${item.color ?? 'text-zinc-900'}`}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-zinc-800 border-b pb-2">{children}</h2>
  )
}

// ─── AI Summary Card ──────────────────────────────────────────────────────────

export function AISummaryCard({ prompt }: { prompt: string | null }) {
  const { summary, isGenerating, error, generate, reset } = useAISummary()

  if (prompt === null) return null

  return (
    <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/60 to-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center shrink-0">
            <Sparkles size={12} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-zinc-800">AI Memo — DDG, Operations &amp; Benefits</span>
        </div>
        {summary && !isGenerating && (
          <div data-html2canvas-ignore="true">
            <button
              onClick={() => { reset(); setTimeout(() => generate(prompt), 50) }}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Regenerate
            </button>
          </div>
        )}
      </div>

      {!summary && !isGenerating && !error && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            Generate an AI-written paragraph that speaks directly to the figures in this report.
          </p>
          <div data-html2canvas-ignore="true">
            <Button size="sm" variant="outline" onClick={() => generate(prompt)} className="shrink-0 gap-1.5 text-xs">
              <Sparkles size={12} />
              Generate Summary
            </Button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-2 py-1">
          <Loader2 size={14} className="animate-spin text-brand" />
          <span className="text-sm text-zinc-500">Analysing report data…</span>
        </div>
      )}

      {error && !isGenerating && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-red-500">{error}</p>
          <div data-html2canvas-ignore="true">
            <Button size="sm" variant="outline" onClick={() => generate(prompt)} className="shrink-0 text-xs">
              Retry
            </Button>
          </div>
        </div>
      )}

      {summary && !isGenerating && (
        <pre className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap font-sans">{summary}</pre>
      )}
    </div>
  )
}

// ─── Report Table ─────────────────────────────────────────────────────────────

export function ReportTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto -mx-1 rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 border-b">
            {headers.map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-zinc-50/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-xs text-zinc-700">{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-xs text-zinc-400">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
