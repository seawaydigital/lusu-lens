import type { DailySummary } from '@/types'

export interface EventDay {
  date: string
  grossRevenue: number
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function detectEventDays(summaries: DailySummary[]): EventDay[] {
  if (summaries.length < 3) return []

  const revenues = summaries.map(s => s.grossSales)

  // Pass 1
  const med1 = median(revenues)
  const threshold1 = med1 * 2.0
  let flagged = new Set(
    summaries
      .filter(s => s.grossSales > threshold1)
      .map(s => s.date)
  )

  // Pass 2: recalculate median without flagged days
  const unflaggedRevenues = summaries
    .filter(s => !flagged.has(s.date))
    .map(s => s.grossSales)

  if (unflaggedRevenues.length > 0) {
    const med2 = median(unflaggedRevenues)
    const threshold2 = med2 * 2.0
    flagged = new Set(
      summaries
        .filter(s => s.grossSales > threshold2)
        .map(s => s.date)
    )
  }

  let eventDays = summaries
    .filter(s => flagged.has(s.date))
    .map(s => ({ date: s.date, grossRevenue: s.grossSales }))

  // Cap at top 3 if >40% flagged
  if (eventDays.length > summaries.length * 0.4) {
    eventDays = eventDays
      .sort((a, b) => b.grossRevenue - a.grossRevenue)
      .slice(0, 3)
  }

  return eventDays.sort((a, b) => a.date.localeCompare(b.date))
}
