import * as XLSX from 'xlsx'
import type { DailySummary, TransactionRecord, DaypartRecord, SectionRecord, Venue } from '@/types'

export function parseSummaryFile(
  buffer: ArrayBuffer,
  venue: Venue
): DailySummary[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const summaries: DailySummary[] = []

  for (const sheetName of workbook.SheetNames) {
    const dateParts = sheetName.split('-').map(Number)
    if (dateParts.length !== 3) continue
    const [month, day, year] = dateParts
    const date = new Date(year, month - 1, day)
    if (isNaN(date.getTime())) continue
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    })

    const getVal = (label: string): number => {
      const row = rows.find(r => String(r[0] ?? '').trim() === label)
      return row ? parseFloat(row[1]) || 0 : 0
    }

    // --- Transactions ---
    const typeRowIndex = rows.findIndex(
      r => String(r[0] ?? '').trim() === 'Type'
    )
    const transactions: TransactionRecord[] = []
    let totalTransactions = 0

    if (typeRowIndex !== -1) {
      for (
        let i = typeRowIndex + 1;
        i < Math.min(typeRowIndex + 15, rows.length);
        i++
      ) {
        const r = rows[i]
        if (!r) break
        const label = String(r[0] ?? '').trim()
        if (!label) break

        const count = parseFloat(r[1]) || 0
        const amount = parseFloat(r[2]) || 0
        const tip = parseFloat(r[3]) || 0
        const total = parseFloat(r[4]) || 0

        if (label.includes('Total - All')) {
          totalTransactions = count
        } else if (!label.includes('Total Credit') && !label.includes('Total -')) {
          transactions.push({ type: label, count, amount, tip, total })
        }
      }
    }

    // --- Dayparts ---
    const daypartsHeaderIdx = rows.findIndex(
      r => String(r[0] ?? '').trim() === 'DAYPARTS'
    )
    const dayparts: DaypartRecord[] = []
    if (daypartsHeaderIdx !== -1) {
      // skip the label row and the column header row
      let i = daypartsHeaderIdx + 2
      while (i < rows.length) {
        const r = rows[i]
        const name = String(r?.[0] ?? '').trim()
        if (!name || name === 'Total') break
        dayparts.push({
          name,
          qty: parseFloat(r[1]) || 0,
          guests: parseFloat(r[3]) || 0,
          net: parseFloat(r[4]) || 0,
        })
        i++
      }
    }

    // --- Sections ---
    const sectionsHeaderIdx = rows.findIndex(
      r => String(r[0] ?? '').trim() === 'SECTIONS'
    )
    const sections: SectionRecord[] = []
    if (sectionsHeaderIdx !== -1) {
      let i = sectionsHeaderIdx + 2
      while (i < rows.length) {
        const r = rows[i]
        const name = String(r?.[0] ?? '').trim()
        if (!name || name === 'Total') break
        sections.push({
          name,
          qty: parseFloat(r[1]) || 0,
          net: parseFloat(r[2]) || 0,
          gross: parseFloat(r[3]) || 0,
        })
        i++
      }
    }

    // --- Guest count from CLOSED TICKETS ---
    const closedTicketsIdx = rows.findIndex(
      r => String(r[0] ?? '').trim() === 'CLOSED TICKETS'
    )
    let guestCount: number | undefined
    if (closedTicketsIdx !== -1) {
      const searchEnd = Math.min(closedTicketsIdx + 8, rows.length)
      for (let i = closedTicketsIdx + 1; i < searchEnd; i++) {
        const r = rows[i]
        if (String(r?.[0] ?? '').trim() === 'Guests') {
          guestCount = parseFloat(r[1]) || undefined
          break
        }
      }
    }

    summaries.push({
      date: isoDate,
      venue,
      grossSales: getVal('Gross Sales'),
      autoPricingDiscounts: getVal('Auto Pricing Discounts'),
      discounts: getVal('Discounts'),
      netSales: getVal('Net Sales'),
      taxes: getVal('Taxes'),
      tips: getVal('Tips'),
      grossReceipts: getVal('Gross Receipts'),
      totalTransactions,
      transactions,
      dayparts: dayparts.length > 0 ? dayparts : undefined,
      sections: sections.length > 0 ? sections : undefined,
      guestCount,
    })
  }

  return summaries
}
