import { zipSync, strToU8 } from 'fflate'
import type { DailySummary, ProductRecord } from '@/types'

function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (v: string | number | null) => {
    const str = String(v ?? '')
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }
  return [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n')
}

export function exportCSV(
  summaries: DailySummary[],
  products: ProductRecord[],
  venue: string,
  monthYear: string
): void {
  const productCSV = toCSV(
    ['date', 'item', 'size', 'category', 'quantity', 'net', 'gross'],
    products.map(p => [p.date, p.item, p.size || '', p.category, p.quantity, p.net, p.gross])
  )

  const summaryCSV = toCSV(
    ['date', 'grossSales', 'netSales', 'discounts', 'autoPricingDiscounts', 'taxes', 'tips', 'grossReceipts', 'totalTransactions'],
    summaries.map(s => [s.date, s.grossSales, s.netSales, s.discounts, s.autoPricingDiscounts, s.taxes, s.tips, s.grossReceipts, s.totalTransactions])
  )

  const zipped = zipSync({
    'products.csv': strToU8(productCSV),
    'summaries.csv': strToU8(summaryCSV),
  })

  const blob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeVenue = venue.replace(/ /g, '_')
  const safeMonth = monthYear.replace(/ /g, '_')
  a.download = `LUSULens_${safeVenue}_${safeMonth}_Data.zip`
  a.click()
  URL.revokeObjectURL(url)
}
