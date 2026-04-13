import * as XLSX from 'xlsx'
import { parseSummaryFile } from '@/lib/parsers/summaryParser'

function createMockWorkbook(sheets: Record<string, any[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
}

describe('parseSummaryFile', () => {
  const baseSummarySheet = [
    ['Sales Summary'],
    ['Items', 1500],
    ['Non-Revenue Items (Gross)', -50],
    ['Positive Adjustments', 2],
    ['Gross Sales', 1452],
    ['Auto Pricing Discounts', -100],
    ['Discounts', -25],
    ['Net Sales', 1327],
    ['Taxes', 172.51],
    ['Tips', 98.50],
    ['Gross Receipts', 1598.01],
    [],
    ['Type', 'Count', 'Amount', 'Tip', 'Total'],
    ['Cash', 10, 200, 5, 205],
    ['Debit - Interac', 25, 500, 40, 540],
    ['Credit - Visa', 15, 400, 35, 435],
    ['Credit - Mastercard', 8, 200, 15, 215],
    ['Total Credit', 23, 600, 50, 650],
    ['Total - All Transactions', 58, 1300, 95, 1395],
    [],
    ['Cash Reconciliation'],
  ]

  it('parses financial summary fields', () => {
    const buffer = createMockWorkbook({ '9-3-2024': baseSummarySheet })
    const summaries = parseSummaryFile(buffer, 'outpost')
    expect(summaries).toHaveLength(1)
    expect(summaries[0].grossSales).toBe(1452)
    expect(summaries[0].autoPricingDiscounts).toBe(-100)
    expect(summaries[0].discounts).toBe(-25)
    expect(summaries[0].netSales).toBe(1327)
    expect(summaries[0].taxes).toBe(172.51)
    expect(summaries[0].tips).toBe(98.50)
    expect(summaries[0].grossReceipts).toBe(1598.01)
  })

  it('parses transaction records', () => {
    const buffer = createMockWorkbook({ '9-3-2024': baseSummarySheet })
    const summaries = parseSummaryFile(buffer, 'outpost')
    expect(summaries[0].totalTransactions).toBe(58)
    expect(summaries[0].transactions).toHaveLength(4)
    expect(summaries[0].transactions[0]).toEqual({
      type: 'Cash', count: 10, amount: 200, tip: 5, total: 205,
    })
  })

  it('excludes Total Credit from transaction records', () => {
    const buffer = createMockWorkbook({ '9-3-2024': baseSummarySheet })
    const summaries = parseSummaryFile(buffer, 'outpost')
    const types = summaries[0].transactions.map(t => t.type)
    expect(types).not.toContain('Total Credit')
    expect(types).not.toContain('Total - All Transactions')
  })

  it('sets date and venue correctly', () => {
    const buffer = createMockWorkbook({ '9-15-2024': baseSummarySheet })
    const summaries = parseSummaryFile(buffer, 'study')
    expect(summaries[0].date).toBe('2024-09-15')
    expect(summaries[0].venue).toBe('study')
  })

  it('handles Study sheets with no auto pricing discounts', () => {
    const studySheet = [
      ['Sales Summary'],
      ['Items', 1500],
      ['Gross Sales', 1500],
      ['Discounts', -18],
      ['Net Sales', 1482],
      ['Taxes', 192.66],
      ['Tips', 110],
      ['Gross Receipts', 1784.66],
      [],
      ['Type', 'Count', 'Amount', 'Tip', 'Total'],
      ['Cash', 40, 300, 10, 310],
      ['Total - All Transactions', 40, 300, 10, 310],
    ]
    const buffer = createMockWorkbook({ '9-3-2024': studySheet })
    const summaries = parseSummaryFile(buffer, 'study')
    expect(summaries[0].autoPricingDiscounts).toBe(0)
    expect(summaries[0].grossSales).toBe(1500)
  })
})
