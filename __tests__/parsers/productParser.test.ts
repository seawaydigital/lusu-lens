import * as XLSX from 'xlsx'
import { parseProductFile } from '@/lib/parsers/productParser'

function createMockWorkbook(sheets: Record<string, any[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return buf
}

describe('parseProductFile', () => {
  it('parses valid product rows', () => {
    const buffer = createMockWorkbook({
      '9-3-2024': [
        ['ITEMS Tue 09-03-2024'],
        ['Item', 'Size', 'Report Category', 'SKU', 'Qty/Weight', 'Net', 'Gross'],
        ['Iced Chai', 'Large', 'Tea', NaN, 5, 18.75, 19.95],
        ['Coffee', 'Medium', 'Coffee', NaN, 3, 7.50, 7.50],
      ],
    })
    const records = parseProductFile(buffer, 'study')
    expect(records).toHaveLength(2)
    expect(records[0]).toEqual({
      date: '2024-09-03',
      venue: 'study',
      item: 'Iced Chai',
      size: 'Large',
      category: 'Tea',
      quantity: 5,
      net: 18.75,
      gross: 19.95,
    })
  })

  it('filters Total rows', () => {
    const buffer = createMockWorkbook({
      '9-3-2024': [
        ['ITEMS Tue 09-03-2024'],
        ['Item', 'Size', 'Report Category', 'SKU', 'Qty/Weight', 'Net', 'Gross'],
        ['Coffee', 'Medium', 'Coffee', NaN, 3, 7.50, 7.50],
        ['Total', '', '', '', 3, 7.50, 7.50],
      ],
    })
    const records = parseProductFile(buffer, 'outpost')
    expect(records).toHaveLength(1)
    expect(records[0].item).toBe('Coffee')
  })

  it('filters rows with zero gross and zero quantity', () => {
    const buffer = createMockWorkbook({
      '9-3-2024': [
        ['ITEMS'],
        ['Item', 'Size', 'Report Category', 'SKU', 'Qty/Weight', 'Net', 'Gross'],
        ['Coffee', 'Medium', 'Coffee', NaN, 3, 7.50, 7.50],
        ['Spacer', '', '', '', 0, 0, 0],
      ],
    })
    const records = parseProductFile(buffer, 'study')
    expect(records).toHaveLength(1)
  })

  it('skips sheets with invalid date names', () => {
    const buffer = createMockWorkbook({
      'Summary': [['Some non-date sheet']],
      '9-3-2024': [
        ['ITEMS'],
        ['Item', 'Size', 'Report Category', 'SKU', 'Qty/Weight', 'Net', 'Gross'],
        ['Coffee', 'Medium', 'Coffee', NaN, 3, 7.50, 7.50],
      ],
    })
    const records = parseProductFile(buffer, 'study')
    expect(records).toHaveLength(1)
  })

  it('handles null size gracefully', () => {
    const buffer = createMockWorkbook({
      '9-5-2024': [
        ['ITEMS'],
        ['Item', 'Size', 'Report Category', 'SKU', 'Qty/Weight', 'Net', 'Gross'],
        ['Italian Panini', null, 'Food', NaN, 1, 8.00, 8.00],
      ],
    })
    const records = parseProductFile(buffer, 'study')
    expect(records[0].size).toBeNull()
  })

  it('defaults category to Uncategorised when missing', () => {
    const buffer = createMockWorkbook({
      '9-5-2024': [
        ['ITEMS'],
        ['Item', 'Size', 'Report Category', 'SKU', 'Qty/Weight', 'Net', 'Gross'],
        ['Mystery Item', 'Large', null, NaN, 1, 5.00, 5.00],
      ],
    })
    const records = parseProductFile(buffer, 'study')
    expect(records[0].category).toBe('Uncategorised')
  })
})
