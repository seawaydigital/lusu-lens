import { detectEventDays } from '@/lib/metrics/eventDetector'
import type { DailySummary } from '@/types'

function makeSummary(date: string, grossSales: number): DailySummary {
  return {
    date, venue: 'outpost', grossSales, autoPricingDiscounts: 0,
    discounts: 0, netSales: grossSales * 0.95, taxes: grossSales * 0.13,
    tips: grossSales * 0.07, grossReceipts: grossSales * 1.15,
    totalTransactions: Math.round(grossSales / 14), transactions: [],
  }
}

describe('detectEventDays', () => {
  it('flags September 2024 event days correctly', () => {
    const summaries = [
      makeSummary('2024-09-10', 12036),
      makeSummary('2024-09-11', 3200),
      makeSummary('2024-09-12', 2800),
      makeSummary('2024-09-13', 3100),
      makeSummary('2024-09-17', 2900),
      makeSummary('2024-09-18', 3300),
      makeSummary('2024-09-19', 2700),
      makeSummary('2024-09-20', 3000),
      makeSummary('2024-09-23', 2600),
      makeSummary('2024-09-24', 3400),
      makeSummary('2024-09-25', 2500),
      makeSummary('2024-09-26', 12600),
      makeSummary('2024-09-27', 18890),
      makeSummary('2024-09-16', 765),
    ]

    const eventDays = detectEventDays(summaries)
    const eventDates = eventDays.map(e => e.date)

    expect(eventDates).toContain('2024-09-10')
    expect(eventDates).toContain('2024-09-26')
    expect(eventDates).toContain('2024-09-27')
    expect(eventDates).not.toContain('2024-09-11')
    expect(eventDates).not.toContain('2024-09-24')
  })

  it('returns empty array when no outliers exist', () => {
    const summaries = [
      makeSummary('2024-09-10', 3000),
      makeSummary('2024-09-11', 3200),
      makeSummary('2024-09-12', 2800),
      makeSummary('2024-09-13', 3100),
    ]
    const eventDays = detectEventDays(summaries)
    expect(eventDays).toHaveLength(0)
  })

  it('caps at top 3 when >40% of days flagged', () => {
    const summaries = [
      makeSummary('2024-09-10', 100),
      makeSummary('2024-09-11', 100),
      makeSummary('2024-09-12', 500),
      makeSummary('2024-09-13', 600),
      makeSummary('2024-09-14', 700),
    ]
    const eventDays = detectEventDays(summaries)
    expect(eventDays.length).toBeLessThanOrEqual(3)
  })
})
