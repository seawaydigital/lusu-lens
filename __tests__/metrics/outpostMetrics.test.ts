import {
  calcAlcoholFoodSplit,
  calcDraftVsPackaged,
  calcHappyHourImpact,
  calcFridayWings,
  calcCateringRevenue,
} from '@/lib/metrics/outpostMetrics'
import type { ProductRecord, DailySummary } from '@/types'

function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    date: '2024-09-13', venue: 'outpost', item: 'Smirnoff Vodka',
    size: null, category: 'Liquor', quantity: 1, net: 6, gross: 6.50,
    ...overrides,
  }
}

function makeSummary(overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    date: '2024-09-13', venue: 'outpost', grossSales: 3000,
    autoPricingDiscounts: -200, discounts: -30, netSales: 2770,
    taxes: 360, tips: 200, grossReceipts: 3330,
    totalTransactions: 200, transactions: [], ...overrides,
  }
}

describe('outpostMetrics', () => {
  it('calculates alcohol vs food split', () => {
    const products = [
      makeProduct({ category: 'Liquor', gross: 100 }),
      makeProduct({ category: 'Beer - Draft', gross: 80 }),
      makeProduct({ category: 'Food', gross: 60 }),
      makeProduct({ category: 'Pop', gross: 10 }),
    ]
    const result = calcAlcoholFoodSplit(products)
    expect(result.alcohol).toBe(180)
    expect(result.food).toBe(60)
    expect(result.other).toBe(10)
  })

  it('calculates draft vs packaged', () => {
    const products = [
      makeProduct({ category: 'Beer - Draft', gross: 700 }),
      makeProduct({ category: 'Beer & Coolers - Bottles/Cans', gross: 300 }),
    ]
    const result = calcDraftVsPackaged(products)
    expect(result.draft).toBe(700)
    expect(result.packaged).toBe(300)
    expect(result.draftPct).toBeCloseTo(70)
  })

  it('calculates happy hour impact', () => {
    const summaries = [
      makeSummary({ autoPricingDiscounts: -500, grossSales: 5000 }),
      makeSummary({ date: '2024-09-14', autoPricingDiscounts: -300, grossSales: 3000 }),
      makeSummary({ date: '2024-09-15', autoPricingDiscounts: 0, grossSales: 2000 }),
    ]
    const result = calcHappyHourImpact(summaries)
    expect(result.totalDollars).toBe(800)
    expect(result.daysActive).toBe(2)
    expect(result.pctOfGross).toBeCloseTo(8)
  })

  it('calculates Friday Wings', () => {
    const products = [
      makeProduct({ item: 'FRIDAY WINGS', gross: 900, quantity: 110, date: '2024-09-06' }),
      makeProduct({ item: 'FRIDAY WINGS', gross: 910, quantity: 112, date: '2024-09-13' }),
      makeProduct({ item: 'FRIDAY WINGS', gross: 913, quantity: 108, date: '2024-09-20' }),
      makeProduct({ item: 'Burger', gross: 500, quantity: 50 }),
    ]
    const result = calcFridayWings(products)
    expect(result.totalRevenue).toBe(2723)
    expect(result.totalUnits).toBe(330)
    expect(result.fridayCount).toBe(3)
  })

  it('calculates catering revenue', () => {
    const products = [
      makeProduct({ category: 'CATERING', gross: 9950 }),
      makeProduct({ category: 'DOOR REVENUE', gross: 56.64 }),
      makeProduct({ category: 'Food', gross: 200 }),
    ]
    const result = calcCateringRevenue(products)
    expect(result.total).toBeCloseTo(10006.64)
    expect(result.items).toHaveLength(2)
  })
})
