import * as fs from 'fs'
import * as path from 'path'
import { parseProductFile } from '@/lib/parsers/productParser'
import { parseSummaryFile } from '@/lib/parsers/summaryParser'
import { detectFileType, extractMonthYear } from '@/lib/parsers/fileDetector'

const DOWNLOADS = 'C:/Users/ajaustin/Downloads'

const FILES = [
  'Study Product Sales - September 2024.xlsx',
  'OP Product Sales - September 2024 (1).xlsx',
  'Study - September 2024.xlsx',
  'Outpost - September 2024.xlsx',
]

describe('September 2024 validation benchmarks', () => {
  it('detects all four file types correctly', () => {
    expect(detectFileType(FILES[0])).toEqual({ venue: 'study', type: 'products' })
    expect(detectFileType(FILES[1])).toEqual({ venue: 'outpost', type: 'products' })
    expect(detectFileType(FILES[2])).toEqual({ venue: 'study', type: 'summary' })
    expect(detectFileType(FILES[3])).toEqual({ venue: 'outpost', type: 'summary' })
  })

  it('extracts September 2024 from all filenames', () => {
    for (const f of FILES) {
      const result = extractMonthYear(f)
      expect(result).toEqual({ month: 9, year: 2024 })
    }
  })

  it('Study gross revenue = $28,599 from summary file', () => {
    const buf = fs.readFileSync(path.join(DOWNLOADS, FILES[2]))
    const summaries = parseSummaryFile(new Uint8Array(buf) as unknown as ArrayBuffer, 'study')
    const totalGross = summaries.reduce((sum, s) => sum + s.grossSales, 0)
    expect(Math.round(totalGross)).toBe(28599)
  })

  it('Study net revenue = $28,182 from summary file', () => {
    const buf = fs.readFileSync(path.join(DOWNLOADS, FILES[2]))
    const summaries = parseSummaryFile(new Uint8Array(buf) as unknown as ArrayBuffer, 'study')
    const totalNet = summaries.reduce((sum, s) => sum + s.netSales, 0)
    expect(Math.round(totalNet)).toBe(28182)
  })

  it('Outpost gross revenue = $77,509 from summary file', () => {
    const buf = fs.readFileSync(path.join(DOWNLOADS, FILES[3]))
    const summaries = parseSummaryFile(new Uint8Array(buf) as unknown as ArrayBuffer, 'outpost')
    const totalGross = summaries.reduce((sum, s) => sum + s.grossSales, 0)
    expect(Math.round(totalGross)).toBe(77509)
  })

  it('Outpost net revenue = $74,381 from summary file', () => {
    const buf = fs.readFileSync(path.join(DOWNLOADS, FILES[3]))
    const summaries = parseSummaryFile(new Uint8Array(buf) as unknown as ArrayBuffer, 'outpost')
    const totalNet = summaries.reduce((sum, s) => sum + s.netSales, 0)
    expect(Math.round(totalNet)).toBe(74381)
  })

  it('Study has 19 operating days', () => {
    const buf = fs.readFileSync(path.join(DOWNLOADS, FILES[2]))
    const summaries = parseSummaryFile(new Uint8Array(buf) as unknown as ArrayBuffer, 'study')
    expect(summaries.length).toBe(19)
  })

  it('Outpost has 14 operating days', () => {
    const buf = fs.readFileSync(path.join(DOWNLOADS, FILES[3]))
    const summaries = parseSummaryFile(new Uint8Array(buf) as unknown as ArrayBuffer, 'outpost')
    expect(summaries.length).toBe(14)
  })

  it('Study total transactions = 5435', () => {
    const buf = fs.readFileSync(path.join(DOWNLOADS, FILES[2]))
    const summaries = parseSummaryFile(new Uint8Array(buf) as unknown as ArrayBuffer, 'study')
    const total = summaries.reduce((sum, s) => sum + s.totalTransactions, 0)
    expect(total).toBe(5435)
  })

  it('Product parser filters out Total rows from Outpost', () => {
    const buf = fs.readFileSync(path.join(DOWNLOADS, FILES[1]))
    const products = parseProductFile(new Uint8Array(buf) as unknown as ArrayBuffer, 'outpost')
    const totalItems = products.filter(
      p => p.item.trim().toUpperCase() === 'TOTAL'
    )
    expect(totalItems).toHaveLength(0)
  })
})
