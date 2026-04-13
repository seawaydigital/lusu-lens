import * as XLSX from 'xlsx'
import type { DailySummary, TransactionRecord, Venue } from '@/types'

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

    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    })

    const getVal = (label: string): number => {
      const row = rows.find(r => String(r[0] ?? '').trim() === label)
      return row ? parseFloat(row[1]) || 0 : 0
    }

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

    summaries.push({
      date: date.toISOString().split('T')[0],
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
    })
  }

  return summaries
}
