import type { Venue, FileType } from '@/types'

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

export function detectFileType(
  filename: string
): { venue: Venue; type: FileType } | null {
  const f = filename.toLowerCase()
  if (f.includes('study product sales') || f.includes('study_product_sales'))
    return { venue: 'study', type: 'products' }
  if (f.includes('op product sales') || f.includes('op_product_sales'))
    return { venue: 'outpost', type: 'products' }
  if (f.match(/study\s*-\s*/) || f.match(/study_-_/))
    return { venue: 'study', type: 'summary' }
  if (f.match(/outpost\s*-\s*/) || f.match(/outpost_-_/))
    return { venue: 'outpost', type: 'summary' }
  return null
}

export function extractMonthYear(
  filename: string
): { month: number; year: number } | null {
  const match = filename.match(/([a-z]+)\s+(\d{4})/i)
  if (!match) return null
  const month = MONTHS[match[1].toLowerCase()]
  const year = parseInt(match[2])
  if (!month || isNaN(year)) return null
  return { month, year }
}
