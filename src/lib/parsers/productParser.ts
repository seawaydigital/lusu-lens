import * as XLSX from 'xlsx'
import type { ProductRecord, Venue } from '@/types'

export function parseProductFile(
  buffer: ArrayBuffer,
  venue: Venue
): ProductRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const records: ProductRecord[] = []

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

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 7) continue

      const item = String(row[0] ?? '').trim()
      const gross = parseFloat(row[6])

      if (!item) continue
      if (item.toLowerCase() === 'total') continue
      if (isNaN(gross)) continue
      if (gross === 0 && (parseFloat(row[4]) || 0) === 0) continue

      records.push({
        date: date.toISOString().split('T')[0],
        venue,
        item,
        size: row[1] ? String(row[1]).trim() : null,
        category: String(row[2] ?? 'Uncategorised').trim() || 'Uncategorised',
        quantity: parseFloat(row[4]) || 0,
        net: parseFloat(row[5]) || 0,
        gross,
      })
    }
  }

  return records
}
