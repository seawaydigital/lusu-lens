import * as XLSX from 'xlsx'
import type { DailySummary, ProductRecord } from '@/types'

export function exportExcel(
  summaries: DailySummary[],
  products: ProductRecord[],
  venue: string,
  monthYear: string
): void {
  const wb = XLSX.utils.book_new()

  const net = summaries.reduce((s, d) => s + d.netSales, 0)
  const gross = summaries.reduce((s, d) => s + d.grossSales, 0)
  const txns = summaries.reduce((s, d) => s + d.totalTransactions, 0)
  const tips = summaries.reduce((s, d) => s + d.tips, 0)

  const summaryData = [
    ['Metric', 'Value'],
    ['Gross Revenue', gross],
    ['Net Revenue', net],
    ['Operating Days', summaries.length],
    ['Total Transactions', txns],
    ['ATV', txns > 0 ? (net / txns) : 0],
    ['Tip Rate', net > 0 ? ((tips / net) * 100) : 0],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary')

  const dailyData = [
    ['Date', 'Gross Sales', 'Net Sales', 'Discounts', 'Auto Pricing', 'Taxes', 'Tips', 'Gross Receipts', 'Transactions'],
    ...[...summaries].sort((a, b) => a.date.localeCompare(b.date)).map(s => [
      s.date, s.grossSales, s.netSales, s.discounts, s.autoPricingDiscounts,
      s.taxes, s.tips, s.grossReceipts, s.totalTransactions,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dailyData), 'Daily Revenue')

  const itemMap = new Map<string, { qty: number; gross: number; category: string }>()
  for (const p of products) {
    const existing = itemMap.get(p.item) || { qty: 0, gross: 0, category: p.category }
    existing.qty += p.quantity
    existing.gross += p.gross
    itemMap.set(p.item, existing)
  }
  const productTotals = [
    ['Item', 'Category', 'Total Qty', 'Total Gross'],
    ...Array.from(itemMap.entries())
      .sort((a, b) => b[1].gross - a[1].gross)
      .map(([item, v]) => [item, v.category, v.qty, v.gross]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(productTotals), 'Product Totals')

  const txnData: (string | number)[][] = [['Date', 'Type', 'Count', 'Amount', 'Tip', 'Total']]
  for (const s of [...summaries].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const t of s.transactions) {
      txnData.push([s.date, t.type, t.count, t.amount, t.tip, t.total])
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txnData), 'Transactions')

  const rawData = [
    ['Date', 'Item', 'Size', 'Category', 'Quantity', 'Net', 'Gross'],
    ...[...products].sort((a, b) => a.date.localeCompare(b.date)).map(p => [
      p.date, p.item, p.size || '', p.category, p.quantity, p.net, p.gross,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rawData), 'Raw Products')

  const safeVenue = venue.replace(/ /g, '_')
  const safeMonth = monthYear.replace(/ /g, '_')
  XLSX.writeFile(wb, `LUSULens_${safeVenue}_${safeMonth}_Data.xlsx`)
}
