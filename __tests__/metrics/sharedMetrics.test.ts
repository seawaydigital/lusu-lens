import {
  calcGrossRevenue,
  calcNetRevenue,
  calcAvgRevenuePerDay,
  calcTotalTransactions,
  calcATV,
  calcTipRate,
  calcDiscountRate,
  calcAutoPricingRate,
} from '@/lib/metrics/sharedMetrics'
import type { DailySummary } from '@/types'

function makeSummary(overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    date: '2024-09-03', venue: 'study', grossSales: 1500,
    autoPricingDiscounts: 0, discounts: -20, netSales: 1480,
    taxes: 192, tips: 110, grossReceipts: 1782,
    totalTransactions: 286, transactions: [],
    ...overrides,
  }
}

describe('sharedMetrics', () => {
  const summaries = [
    makeSummary({ grossSales: 1500, netSales: 1480, tips: 110, totalTransactions: 286, discounts: -20 }),
    makeSummary({ date: '2024-09-04', grossSales: 1600, netSales: 1575, tips: 120, totalTransactions: 300, discounts: -25 }),
  ]

  it('calculates gross revenue', () => {
    expect(calcGrossRevenue(summaries)).toBe(3100)
  })

  it('calculates net revenue', () => {
    expect(calcNetRevenue(summaries)).toBe(3055)
  })

  it('calculates average revenue per day', () => {
    expect(calcAvgRevenuePerDay(summaries)).toBeCloseTo(1527.50)
  })

  it('calculates total transactions', () => {
    expect(calcTotalTransactions(summaries)).toBe(586)
  })

  it('calculates ATV', () => {
    expect(calcATV(summaries)).toBeCloseTo(5.21, 1)
  })

  it('calculates tip rate', () => {
    expect(calcTipRate(summaries)).toBeCloseTo(7.53, 1)
  })

  it('calculates discount rate', () => {
    expect(calcDiscountRate(summaries)).toBeCloseTo(1.45, 1)
  })

  it('calculates auto pricing rate', () => {
    const outpostSummaries = [
      makeSummary({ grossSales: 2000, autoPricingDiscounts: -100 }),
      makeSummary({ date: '2024-09-04', grossSales: 3000, autoPricingDiscounts: -150 }),
    ]
    expect(calcAutoPricingRate(outpostSummaries)).toBeCloseTo(5.0, 1)
  })
})
