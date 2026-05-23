import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generatePdf } from '@/lib/pdf'

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
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <Link
          to="/reports"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={15} />
          Back to Reports
        </Link>
        <Button onClick={handleDownload} disabled={generating || loading} className="gap-2">
          {generating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {generating ? 'Generating PDF…' : 'Download PDF'}
        </Button>
      </div>

      {/* Printable area */}
      <div ref={printRef} className="bg-white rounded-xl border p-8 space-y-8 min-h-[400px]">
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
    <div className={`grid gap-4 grid-cols-${Math.min(items.length, 4)}`} style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)` }}>
      {items.map(item => (
        <div key={item.label} className="p-4 rounded-lg border bg-zinc-50">
          <p className="text-xs text-zinc-500 font-medium">{item.label}</p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${item.color ?? 'text-zinc-900'}`}>{item.value}</p>
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

export function ReportTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
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
