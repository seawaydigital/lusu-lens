import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function exportPDF(
  containerId: string,
  venue: string,
  monthYear: string
): Promise<void> {
  const container = document.getElementById(containerId)
  if (!container) throw new Error(`Container #${containerId} not found`)

  const sections = container.querySelectorAll('section')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15

  for (let i = 0; i < sections.length; i++) {
    if (i > 0) pdf.addPage()

    const canvas = await html2canvas(sections[i] as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    pdf.setFontSize(10)
    pdf.setTextColor(27, 58, 107)
    pdf.text(`LUSU Lens — ${venue} — ${monthYear}`, margin, 10)

    pdf.addImage(imgData, 'PNG', margin, 15, imgWidth, Math.min(imgHeight, pageHeight - 30))

    pdf.setFontSize(7)
    pdf.setTextColor(150)
    pdf.text(
      `Exported ${new Date().toLocaleString()} · Data source: LUSU POS export`,
      margin,
      pageHeight - 5
    )
  }

  const safeVenue = venue.replace(/ /g, '_')
  const safeMonth = monthYear.replace(/ /g, '_')
  pdf.save(`LUSULens_${safeVenue}_${safeMonth}.pdf`)
}
