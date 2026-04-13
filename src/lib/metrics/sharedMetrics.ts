import type { DailySummary } from '@/types'

export function calcGrossRevenue(summaries: DailySummary[]): number {
  return summaries.reduce((sum, s) => sum + s.grossSales, 0)
}

export function calcNetRevenue(summaries: DailySummary[]): number {
  return summaries.reduce((sum, s) => sum + s.netSales, 0)
}

export function calcAvgRevenuePerDay(
  summaries: DailySummary[],
  excludeDates?: Set<string>
): number {
  const filtered = excludeDates
    ? summaries.filter(s => !excludeDates.has(s.date))
    : summaries
  if (filtered.length === 0) return 0
  return calcNetRevenue(filtered) / filtered.length
}

export function calcTotalTransactions(summaries: DailySummary[]): number {
  return summaries.reduce((sum, s) => sum + s.totalTransactions, 0)
}

export function calcATV(summaries: DailySummary[]): number {
  const transactions = calcTotalTransactions(summaries)
  if (transactions === 0) return 0
  return calcNetRevenue(summaries) / transactions
}

export function calcTipRate(summaries: DailySummary[]): number {
  const net = calcNetRevenue(summaries)
  if (net === 0) return 0
  const tips = summaries.reduce((sum, s) => sum + s.tips, 0)
  return (tips / net) * 100
}

export function calcDiscountRate(summaries: DailySummary[]): number {
  const gross = calcGrossRevenue(summaries)
  if (gross === 0) return 0
  const discounts = summaries.reduce(
    (sum, s) => sum + Math.abs(s.discounts),
    0
  )
  return (discounts / gross) * 100
}

export function calcAutoPricingRate(summaries: DailySummary[]): number {
  const gross = calcGrossRevenue(summaries)
  if (gross === 0) return 0
  const autoPricing = summaries.reduce(
    (sum, s) => sum + Math.abs(s.autoPricingDiscounts),
    0
  )
  return (autoPricing / gross) * 100
}

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
