import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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
