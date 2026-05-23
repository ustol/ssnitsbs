import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function generatePdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    // Ensure full scrollHeight is captured
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgW = pageW
  const imgH = (canvas.height * imgW) / canvas.width

  let remaining = imgH
  let yOffset = 0

  while (remaining > 0) {
    pdf.addImage(imgData, 'PNG', 0, -yOffset, imgW, imgH)
    remaining -= pageH
    if (remaining > 0) {
      pdf.addPage()
      yOffset += pageH
    }
  }

  const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
  pdf.save(`${filename} — ${date}.pdf`)
}
