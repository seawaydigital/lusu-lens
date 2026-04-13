import { calcHotColdSplit, calcFoodAttachRate, calcSizeDistribution, findSeasonalItems } from '@/lib/metrics/studyMetrics'
import type { ProductRecord } from '@/types'

function makeProduct(overrides: Partial<ProductRecord> = {}): ProductRecord {
  return {
    date: '2024-09-03', venue: 'study', item: 'Coffee',
    size: 'Medium', category: 'Coffee', quantity: 1,
    net: 3.50, gross: 3.50, ...overrides,
  }
}

describe('studyMetrics', () => {
  describe('calcHotColdSplit', () => {
    it('classifies hot and cold drinks correctly', () => {
      const products = [
        makeProduct({ item: 'Coffee', category: 'Coffee', gross: 100 }),
        makeProduct({ item: 'ICED Latte', category: 'Cappuccino/Latte', gross: 80 }),
        makeProduct({ item: 'Tea', category: 'Tea', gross: 60 }),
        makeProduct({ item: 'COLD Brew', category: 'Coffee', gross: 40 }),
        makeProduct({ item: 'Frappe', category: 'Cider', gross: 30 }),
      ]
      const result = calcHotColdSplit(products)
      expect(result.hot).toBe(160) // Coffee + Tea
      expect(result.cold).toBe(150) // ICED Latte + COLD Brew + Frappe(Cider)
    })
  })

  describe('calcFoodAttachRate', () => {
    it('calculates food attach rate', () => {
      const products = [
        makeProduct({ category: 'Food', gross: 50 }),
        makeProduct({ category: 'Pastries', gross: 25 }),
        makeProduct({ category: 'Coffee', gross: 200 }),
      ]
      const rate = calcFoodAttachRate(products)
      expect(rate).toBeCloseTo(27.27, 1) // 75/275 * 100
    })
  })

  describe('calcSizeDistribution', () => {
    it('groups by size', () => {
      const products = [
        makeProduct({ size: 'Small', gross: 20 }),
        makeProduct({ size: 'Medium', gross: 50 }),
        makeProduct({ size: 'Large', gross: 80 }),
        makeProduct({ size: null, gross: 30 }), // Food — excluded
      ]
      const result = calcSizeDistribution(products)
      expect(result).toEqual([
        { size: 'Large', revenue: 80 },
        { size: 'Medium', revenue: 50 },
        { size: 'Small', revenue: 20 },
      ])
    })
  })

  describe('findSeasonalItems', () => {
    it('identifies new and removed items between months', () => {
      const current = [
        makeProduct({ item: 'Pumpkin Latte', gross: 120 }),
        makeProduct({ item: 'Regular Coffee', gross: 200 }),
      ]
      const prior = [
        makeProduct({ item: 'Iced Tea', gross: 90 }),
        makeProduct({ item: 'Regular Coffee', gross: 185 }),
      ]
      const result = findSeasonalItems(current, prior)
      expect(result.newItems).toEqual([{ item: 'Pumpkin Latte', revenue: 120 }])
      expect(result.removedItems).toEqual([{ item: 'Iced Tea', lastRevenue: 90 }])
    })
  })
})
