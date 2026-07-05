import { useState } from 'react'
import { Download, FileText, Table, File, Filter } from 'lucide-react'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useTelehealthEntries, useTelehealthConfig } from '@/hooks/useTelehealth'
import { writeAudit } from '@/hooks/useAuditLog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { TelehealthEntry, TelehealthFilters } from '@/types/database'
import { toast } from 'sonner'

const COLUMNS: { key: keyof TelehealthEntry; label: string }[] = [
  { key: 'entry_id',                    label: 'Entry ID' },
  { key: 'reporting_period',            label: 'Reporting Period' },
  { key: 'weekly_cycle',                label: 'Weekly Cycle' },
  { key: 'date_of_interaction',         label: 'Date of Interaction' },
  { key: 'quarter',                     label: 'Quarter' },
  { key: 'cro_name',                    label: 'CRO Name' },
  { key: 'patient_full_name',           label: 'Patient Full Name' },
  { key: 'telephone_number',            label: 'Telephone Number' },
  { key: 'alternative_contact_number',  label: 'Alternative Contact' },
  { key: 'email_address',               label: 'Email Address' },
  { key: 'physical_location',           label: 'Physical Location' },
  { key: 'region',                      label: 'Region' },
  { key: 'engagement_type',             label: 'Engagement Type' },
  { key: 'digital_channel_used',        label: 'Digital Channel' },
  { key: 'feedback_category',           label: 'Feedback Category' },
  { key: 'positive_feedback',           label: 'Positive Feedback' },
  { key: 'complaint',                   label: 'Complaint' },
  { key: 'suggestion',                  label: 'Suggestion' },
  { key: 'detailed_feedback_narrative', label: 'Detailed Feedback' },
  { key: 'successful_contact',          label: 'Successful Contact' },
  { key: 'issue_resolved',              label: 'Issue Resolved' },
  { key: 'escalation_required',         label: 'Escalation Required' },
  { key: 'key_observation',             label: 'Key Observation' },
  { key: 'root_cause',                  label: 'Root Cause' },
  { key: 'emerging_trend',              label: 'Emerging Trend' },
  { key: 'recommendation',             label: 'Recommendation' },
  { key: 'priority_level',              label: 'Priority Level' },
  { key: 'responsible_unit',            label: 'Responsible Unit' },
  { key: 'status',                      label: 'Status' },
  { key: 'duplicate_flag',              label: 'Duplicate Flag' },
  { key: 'contact_missing',             label: 'Contact Missing' },
  { key: 'phone_check',                 label: 'Phone Check' },
]

function buildPdf(entries: TelehealthEntry[], filters: TelehealthFilters) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })

  // Branded header
  doc.setFillColor(232, 98, 26)
  doc.rect(0, 0, 420, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('SSNIT · The Trust Hospital — Telehealth Service Reporting System', 10, 9)
  doc.setTextColor(0, 0, 0)

  let y = 22
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Telehealth Interaction Report', 10, y)
  y += 7

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90, 90, 90)
  const filterParts: string[] = []
  if (filters.reporting_period) filterParts.push(`Period: ${filters.reporting_period}`)
  if (filters.weekly_cycle)     filterParts.push(`Week: ${filters.weekly_cycle}`)
  if (filters.quarter)          filterParts.push(`Quarter: ${filters.quarter}`)
  if (filters.region)           filterParts.push(`Region: ${filters.region}`)
  if (filters.status)           filterParts.push(`Status: ${filters.status}`)
  if (filters.date_from)        filterParts.push(`From: ${filters.date_from}`)
  if (filters.date_to)          filterParts.push(`To: ${filters.date_to}`)
  doc.text(filterParts.length > 0 ? filterParts.join('  ·  ') : 'All records', 10, y)
  y += 4
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}  ·  Total records: ${entries.length}`, 10, y)
  y += 5
  doc.setTextColor(0, 0, 0)

  const summaryColumns = COLUMNS.slice(0, 12)
  autoTable(doc, {
    startY: y,
    head: [summaryColumns.map(c => c.label)],
    body: entries.map(e => summaryColumns.map(c => String(e[c.key] ?? ''))),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [232, 98, 26], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 10, right: 10 },
  })

  // Page 2: Observations & recommendations
  const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 200
  if (lastY > 180) doc.addPage()

  const insightColumns = [
    { key: 'entry_id' as keyof TelehealthEntry, label: 'Entry ID' },
    { key: 'patient_full_name' as keyof TelehealthEntry, label: 'Patient' },
    { key: 'key_observation' as keyof TelehealthEntry, label: 'Key Observation' },
    { key: 'root_cause' as keyof TelehealthEntry, label: 'Root Cause' },
    { key: 'recommendation' as keyof TelehealthEntry, label: 'Recommendation' },
    { key: 'priority_level' as keyof TelehealthEntry, label: 'Priority' },
    { key: 'responsible_unit' as keyof TelehealthEntry, label: 'Responsible Unit' },
    { key: 'status' as keyof TelehealthEntry, label: 'Status' },
  ]

  const insightEntries = entries.filter(e => e.key_observation || e.recommendation || e.root_cause)

  if (insightEntries.length > 0) {
    const insightY = lastY > 180
      ? 22
      : lastY + 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Observations, Root Causes & Recommendations', 10, insightY - 3)

    autoTable(doc, {
      startY: insightY,
      head: [insightColumns.map(c => c.label)],
      body: insightEntries.map(e => insightColumns.map(c => String(e[c.key] ?? ''))),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 10, right: 10 },
    })
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `SSNIT–Trust Hospital Telehealth Reporting · Confidential · Page ${i} of ${pageCount}`,
      10,
      doc.internal.pageSize.height - 6,
    )
  }

  return doc
}

function buildXlsx(entries: TelehealthEntry[]) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: All data
  const headers = COLUMNS.map(c => c.label)
  const rows = entries.map(e => COLUMNS.map(c => e[c.key] ?? ''))
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws1['!cols'] = COLUMNS.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws1, 'Interaction Data')

  // Sheet 2: Summary
  const statusCounts: Record<string, number> = {}
  const feedbackCounts: Record<string, number> = {}
  const regionCounts: Record<string, number> = {}
  for (const e of entries) {
    statusCounts[e.status]              = (statusCounts[e.status] ?? 0) + 1
    feedbackCounts[e.feedback_category] = (feedbackCounts[e.feedback_category] ?? 0) + 1
    if (e.region) regionCounts[e.region] = (regionCounts[e.region] ?? 0) + 1
  }

  const summaryData = [
    ['SSNIT–Trust Hospital Telehealth Reporting System'],
    [`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`],
    [],
    ['SUMMARY STATISTICS'],
    ['Total Records', entries.length],
    ['Issues Resolved', entries.filter(e => e.issue_resolved === 'Yes').length],
    ['Total Complaints', entries.filter(e => e.complaint === 'Yes').length],
    ['Escalations', entries.filter(e => e.escalation_required === 'Yes').length],
    ['Duplicates Flagged', entries.filter(e => e.duplicate_flag).length],
    [],
    ['BY STATUS'],
    ...Object.entries(statusCounts).map(([k, v]) => [k, v]),
    [],
    ['BY FEEDBACK CATEGORY'],
    ...Object.entries(feedbackCounts).map(([k, v]) => [k, v]),
    [],
    ['BY REGION'],
    ...Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]),
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

  // Sheet 3: Observations & Recommendations
  const insightHeaders = ['Entry ID', 'Patient', 'Date', 'Region', 'Key Observation', 'Root Cause', 'Recommendation', 'Priority', 'Responsible Unit', 'Status']
  const insightRows = entries
    .filter(e => e.key_observation || e.recommendation || e.root_cause)
    .map(e => [
      e.entry_id, e.patient_full_name, e.date_of_interaction, e.region,
      e.key_observation, e.root_cause, e.recommendation,
      e.priority_level, e.responsible_unit, e.status,
    ])
  const ws3 = XLSX.utils.aoa_to_sheet([insightHeaders, ...insightRows])
  ws3['!cols'] = insightHeaders.map(() => ({ wch: 25 }))
  XLSX.utils.book_append_sheet(wb, ws3, 'Observations & Recs')

  return wb
}

export function TelehealthExport() {
  const { data: cfg } = useTelehealthConfig()
  const [filters, setFilters] = useState<TelehealthFilters>({})
  const { data: entries = [], isLoading } = useTelehealthEntries(filters)

  function setFilter(key: keyof TelehealthFilters, val: string) {
    setFilters(prev => ({ ...prev, [key]: val === 'all' ? undefined : val }))
  }

  function clearFilters() { setFilters({}) }

  async function exportPdf() {
    if (entries.length === 0) { toast.error('No records to export'); return }
    const doc = buildPdf(entries, filters)
    doc.save(`telehealth-report-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`)
    writeAudit({ action: 'exported', entity_type: 'telehealth_entry', entity_id: null, entity_name: `PDF export – ${entries.length} records` })
    toast.success(`PDF exported — ${entries.length} records`)
  }

  async function exportExcel() {
    if (entries.length === 0) { toast.error('No records to export'); return }
    const wb = buildXlsx(entries)
    XLSX.writeFile(wb, `telehealth-report-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`)
    writeAudit({ action: 'exported', entity_type: 'telehealth_entry', entity_id: null, entity_name: `Excel export – ${entries.length} records` })
    toast.success(`Excel exported — ${entries.length} records`)
  }

  async function exportCsv() {
    if (entries.length === 0) { toast.error('No records to export'); return }
    const headers = COLUMNS.map(c => c.label).join(',')
    const rows = entries.map(e =>
      COLUMNS.map(c => {
        const val = String(e[c.key] ?? '')
        return val.includes(',') ? `"${val}"` : val
      }).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `telehealth-report-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    writeAudit({ action: 'exported', entity_type: 'telehealth_entry', entity_id: null, entity_name: `CSV export – ${entries.length} records` })
    toast.success(`CSV exported — ${entries.length} records`)
  }

  const filterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Reports & Export"
        subtitle="Filter and export telehealth data as PDF, Excel, or CSV"
      />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter size={13} className="text-brand" />
              Report Filters
            </CardTitle>
            {filterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                Clear {filterCount} filter{filterCount > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reporting Period</Label>
              <Select onValueChange={v => setFilter('reporting_period', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {cfg?.periods.map(p => <SelectItem key={p.id} value={p.value}>{p.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Weekly Cycle</Label>
              <Select onValueChange={v => setFilter('weekly_cycle', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Weeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Weeks</SelectItem>
                  {cfg?.cycles.map(c => <SelectItem key={c.id} value={c.value}>{c.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quarter</Label>
              <Select onValueChange={v => setFilter('quarter', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quarters</SelectItem>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Region</Label>
              <Select onValueChange={v => setFilter('region', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {cfg?.regions.map(r => <SelectItem key={r.id} value={r.value}>{r.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select onValueChange={v => setFilter('status', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {cfg?.statuses.map(s => <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Feedback Category</Label>
              <Select onValueChange={v => setFilter('feedback_category', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {cfg?.feedbackCats.map(f => <SelectItem key={f.id} value={f.value}>{f.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Priority Level</Label>
              <Select onValueChange={v => setFilter('priority_level', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {cfg?.priorities.map(p => <SelectItem key={p.id} value={p.value}>{p.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Responsible Unit</Label>
              <Select onValueChange={v => setFilter('responsible_unit', v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {cfg?.units.map(u => <SelectItem key={u.id} value={u.value}>{u.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date From</Label>
              <Input type="date" className="h-8 text-xs" onChange={e => setFilter('date_from', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date To</Label>
              <Input type="date" className="h-8 text-xs" onChange={e => setFilter('date_to', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview count */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {isLoading ? 'Loading…' : (
            <>
              <strong className="text-foreground">{entries.length.toLocaleString()}</strong> records match the current filters
            </>
          )}
        </span>
        {filterCount > 0 && (
          <div className="flex gap-1 flex-wrap">
            {filters.reporting_period && <Badge variant="outline" className="text-[0.65rem]">{filters.reporting_period}</Badge>}
            {filters.weekly_cycle     && <Badge variant="outline" className="text-[0.65rem]">{filters.weekly_cycle}</Badge>}
            {filters.quarter          && <Badge variant="outline" className="text-[0.65rem]">{filters.quarter}</Badge>}
            {filters.region           && <Badge variant="outline" className="text-[0.65rem]">{filters.region}</Badge>}
            {filters.status           && <Badge variant="outline" className="text-[0.65rem]">{filters.status}</Badge>}
          </div>
        )}
      </div>

      <Separator />

      {/* Export buttons */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="hover:border-red-300 transition-colors cursor-pointer" onClick={exportPdf}>
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <FileText size={22} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Export as PDF</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Branded A3 report with summary and observations
              </p>
            </div>
            <Button variant="outline" size="sm" className="text-xs border-red-200 text-red-700 hover:bg-red-50">
              <Download size={12} className="mr-1" /> Download PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-green-300 transition-colors cursor-pointer" onClick={exportExcel}>
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Table size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Export as Excel</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                3 sheets: data, summary stats, observations
              </p>
            </div>
            <Button variant="outline" size="sm" className="text-xs border-green-200 text-green-700 hover:bg-green-50">
              <Download size={12} className="mr-1" /> Download Excel
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-300 transition-colors cursor-pointer" onClick={exportCsv}>
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <File size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Export as CSV</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Raw comma-separated data for analysis
              </p>
            </div>
            <Button variant="outline" size="sm" className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
              <Download size={12} className="mr-1" /> Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
