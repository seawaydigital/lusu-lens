import { detectFileType, extractMonthYear } from '@/lib/parsers/fileDetector'

describe('detectFileType', () => {
  it('detects Study product sales', () => {
    expect(detectFileType('Study Product Sales - September 2024.xlsx'))
      .toEqual({ venue: 'study', type: 'products' })
  })

  it('detects Outpost product sales', () => {
    expect(detectFileType('OP Product Sales - September 2024 (1).xlsx'))
      .toEqual({ venue: 'outpost', type: 'products' })
  })

  it('detects Study summary', () => {
    expect(detectFileType('Study - September 2024.xlsx'))
      .toEqual({ venue: 'study', type: 'summary' })
  })

  it('detects Outpost summary', () => {
    expect(detectFileType('Outpost - September 2024.xlsx'))
      .toEqual({ venue: 'outpost', type: 'summary' })
  })

  it('returns null for unrecognised files', () => {
    expect(detectFileType('random_spreadsheet.xlsx')).toBeNull()
    expect(detectFileType('photo.jpg')).toBeNull()
  })
})

describe('extractMonthYear', () => {
  it('extracts September 2024', () => {
    expect(extractMonthYear('Study Product Sales - September 2024.xlsx'))
      .toEqual({ month: 9, year: 2024 })
  })

  it('extracts January 2025', () => {
    expect(extractMonthYear('Outpost - January 2025.xlsx'))
      .toEqual({ month: 1, year: 2025 })
  })

  it('returns null for unrecognised format', () => {
    expect(extractMonthYear('no_date_here.xlsx')).toBeNull()
  })

  it('is case insensitive', () => {
    expect(extractMonthYear('study product sales - SEPTEMBER 2024.xlsx'))
      .toEqual({ month: 9, year: 2024 })
  })
})
