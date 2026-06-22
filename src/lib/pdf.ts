import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export function generateMemoPdf(memoText: string, reportName: string): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const LEFT = 25
  const RIGHT = 185
  const USABLE = RIGHT - LEFT
  const LH = 6.5
  let y = 20

  // Orange header bar
  pdf.setFillColor(232, 98, 26)
  pdf.rect(0, 0, 210, 14, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(8.5)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SSNIT Strategic Business Support System', 10, 9.5)
  pdf.setTextColor(0, 0, 0)
  y = 30

  let pastHeader = false

  for (const rawLine of memoText.split('\n')) {
    const line = rawLine.trim()

    if (line === 'MEMORANDUM') {
      pdf.setFontSize(17)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 30, 30)
      pdf.text('MEMORANDUM', 210 / 2, y, { align: 'center' })
      const tw = pdf.getTextWidth('MEMORANDUM')
      pdf.setDrawColor(232, 98, 26)
      pdf.setLineWidth(0.7)
      pdf.line(210 / 2 - tw / 2, y + 1.8, 210 / 2 + tw / 2, y + 1.8)
      y += LH * 2

    } else if (/^(TO|FROM|DATE|SUBJECT):/.test(line)) {
      const colonIdx = line.indexOf(':')
      const key = line.substring(0, colonIdx + 1)
      const val = line.substring(colonIdx + 2)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(90, 90, 90)
      pdf.text(key, LEFT, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(30, 30, 30)
      const wrapped = pdf.splitTextToSize(val, USABLE - 28) as string[]
      pdf.text(wrapped[0] ?? '', LEFT + 28, y)
      for (let i = 1; i < wrapped.length; i++) {
        y += LH
        pdf.text(wrapped[i], LEFT + 28, y)
      }
      y += LH
      if (line.startsWith('SUBJECT:')) {
        pdf.setDrawColor(210, 210, 210)
        pdf.setLineWidth(0.3)
        pdf.line(LEFT, y + 1, RIGHT, y + 1)
        y += LH
        pastHeader = true
      }

    } else if (pastHeader && line === '') {
      y += LH * 0.5

    } else if (pastHeader && line) {
      pdf.setFontSize(10.5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(40, 40, 40)
      const wrapped = pdf.splitTextToSize(line, USABLE) as string[]
      for (const wl of wrapped) {
        if (y > 278) { pdf.addPage(); y = 20 }
        pdf.text(wl, LEFT, y)
        y += LH
      }
      y += LH * 0.4
    }
  }

  // Footer
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(170, 170, 170)
  const footDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  pdf.text(`Generated ${footDate} · SSNIT SBS System`, 210 / 2, 290, { align: 'center' })

  const dateStamp = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  pdf.save(`${reportName} — Memo — ${dateStamp}.pdf`)
}

export function generateMinutesPdf(minutesText: string, meetingTitle: string): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const LEFT = 25
  const RIGHT = 185
  const USABLE = RIGHT - LEFT
  const LH = 6.5
  let y = 20

  // Orange header bar
  pdf.setFillColor(232, 98, 26)
  pdf.rect(0, 0, 210, 14, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(8.5)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SSNIT Strategic Business Support System', 10, 9.5)
  pdf.setTextColor(0, 0, 0)
  y = 30

  let pastHeader = false
  const headerKeyRegex = /^(MEETING|DATE|LOCATION|PARTNERSHIP|STATUS|ATTENDEES):/
  const sectionHeadingRegex = /^\d+\.\s+[A-Z][A-Z\s&]*$/

  for (const rawLine of minutesText.split('\n')) {
    const line = rawLine.trim()

    if (line === 'MEETING MINUTES') {
      pdf.setFontSize(17)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 30, 30)
      pdf.text('MEETING MINUTES', 210 / 2, y, { align: 'center' })
      const tw = pdf.getTextWidth('MEETING MINUTES')
      pdf.setDrawColor(232, 98, 26)
      pdf.setLineWidth(0.7)
      pdf.line(210 / 2 - tw / 2, y + 1.8, 210 / 2 + tw / 2, y + 1.8)
      y += LH * 2

    } else if (headerKeyRegex.test(line)) {
      const colonIdx = line.indexOf(':')
      const key = line.substring(0, colonIdx + 1)
      const val = line.substring(colonIdx + 2)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(90, 90, 90)
      pdf.text(key, LEFT, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(30, 30, 30)
      const wrapped = pdf.splitTextToSize(val, USABLE - 32) as string[]
      pdf.text(wrapped[0] ?? '', LEFT + 32, y)
      for (let i = 1; i < wrapped.length; i++) {
        y += LH
        pdf.text(wrapped[i], LEFT + 32, y)
      }
      y += LH
      if (line.startsWith('ATTENDEES:')) {
        pdf.setDrawColor(210, 210, 210)
        pdf.setLineWidth(0.3)
        pdf.line(LEFT, y + 1, RIGHT, y + 1)
        y += LH
        pastHeader = true
      }

    } else if (pastHeader && sectionHeadingRegex.test(line)) {
      y += LH * 0.5
      if (y > 270) { pdf.addPage(); y = 20 }
      pdf.setFontSize(11.5)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(232, 98, 26)
      pdf.text(line, LEFT, y)
      y += LH * 1.3

    } else if (pastHeader && line === '') {
      y += LH * 0.5

    } else if (pastHeader && line) {
      pdf.setFontSize(10.5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(40, 40, 40)
      const wrapped = pdf.splitTextToSize(line, USABLE) as string[]
      for (const wl of wrapped) {
        if (y > 278) { pdf.addPage(); y = 20 }
        pdf.text(wl, LEFT, y)
        y += LH
      }
      y += LH * 0.4
    }
  }

  // Footer
  pdf.setFontSize(7.5)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(170, 170, 170)
  const footDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  pdf.text(`Generated ${footDate} · SSNIT SBS System`, 210 / 2, 290, { align: 'center' })

  const dateStamp = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  pdf.save(`${meetingTitle} — Minutes — ${dateStamp}.pdf`)
}

export async function generatePdf(element: HTMLElement, filename: string): Promise<void> {
  // Pin to a fixed width so charts and grids render at a consistent, known size
  const savedWidth = element.style.width
  const savedMaxWidth = element.style.maxWidth
  const savedMinWidth = element.style.minWidth
  element.style.width = '1100px'
  element.style.maxWidth = '1100px'
  element.style.minWidth = '1100px'

  // Allow the browser to reflow at the new width before capturing
  await new Promise(r => setTimeout(r, 250))

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1100,
  })

  // Restore original styles
  element.style.width = savedWidth
  element.style.maxWidth = savedMaxWidth
  element.style.minWidth = savedMinWidth

  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  // Build a single-page PDF whose height exactly matches the content.
  // This eliminates all page-break cut-offs — no chart will ever be split.
  const A4_WIDTH_MM = 210
  const MARGIN_MM = 10
  const contentWidthMM = A4_WIDTH_MM - MARGIN_MM * 2
  const contentHeightMM = contentWidthMM * (canvas.height / canvas.width)
  const pageHeightMM = contentHeightMM + MARGIN_MM * 2

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [A4_WIDTH_MM, pageHeightMM],
  })

  pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, contentWidthMM, contentHeightMM)

  const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  pdf.save(`${filename} — ${date}.pdf`)
}
