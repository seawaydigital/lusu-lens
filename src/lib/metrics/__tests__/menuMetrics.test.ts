import { calcMenuEngineering } from '../sharedMetrics'
import { calcSizeDistributionTrend } from '../studyMetrics'
import type { ProductRecord } from '@/types'

function makeProduct(item: string, category: string, quantity: number, gross: number): ProductRecord {
  return { item, category, quantity, gross, date: '2025-01-15', venue: 'study', size: null, net: gross }
}

describe('calcMenuEngineering', () => {
  it('returns empty array when fewer than 4 unique items', () => {
    const products = [
      makeProduct('Latte', 'Coffee', 50, 200),
      makeProduct('Muffin', 'Food', 10, 50),
    ]
    expect(calcMenuEngineering(products)).toEqual([])
  })

  it('assigns star to items above both medians', () => {
    const products = [
      makeProduct('A', 'Coffee', 50, 200),
      makeProduct('B', 'Food', 50, 50),
      makeProduct('C', 'Tea', 10, 200),
      makeProduct('D', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const a = result.find(r => r.item === 'A')
    expect(a?.tier).toBe('star')
  })

  it('assigns dog to items below both medians', () => {
    const products = [
      makeProduct('A', 'Coffee', 50, 200),
      makeProduct('B', 'Food', 50, 50),
      makeProduct('C', 'Tea', 10, 200),
      makeProduct('D', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const d = result.find(r => r.item === 'D')
    expect(d?.tier).toBe('dog')
  })

  it('assigns plowhorse to high-volume low-revenue items', () => {
    const products = [
      makeProduct('A', 'Coffee', 50, 200),
      makeProduct('B', 'Food', 50, 50),
      makeProduct('C', 'Tea', 10, 200),
      makeProduct('D', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const b = result.find(r => r.item === 'B')
    expect(b?.tier).toBe('plowhorse')
  })

  it('assigns puzzle to low-volume high-revenue items', () => {
    const products = [
      makeProduct('A', 'Coffee', 50, 200),
      makeProduct('B', 'Food', 50, 50),
      makeProduct('C', 'Tea', 10, 200),
      makeProduct('D', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const c = result.find(r => r.item === 'C')
    expect(c?.tier).toBe('puzzle')
  })

  it('aggregates multiple rows for the same item before classifying', () => {
    const products = [
      makeProduct('Latte', 'Coffee', 20, 80),
      makeProduct('Latte', 'Coffee', 30, 120),
      makeProduct('Muffin', 'Food', 50, 50),
      makeProduct('Tea', 'Tea', 10, 200),
      makeProduct('Water', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const latte = result.find(r => r.item === 'Latte')
    expect(latte?.quantity).toBe(50)
    expect(latte?.revenue).toBe(200)
  })
})

describe('calcSizeDistributionTrend', () => {
  it('returns empty array when no products have a size', () => {
    const products = [makeProduct('Latte', 'Coffee', 10, 50)]
    expect(calcSizeDistributionTrend(products)).toEqual([])
  })

  it('returns single entry when all products are in the same month', () => {
    const p1: ProductRecord = { ...makeProduct('Latte', 'Coffee', 10, 100), size: 'Large', date: '2025-01-10' }
    const p2: ProductRecord = { ...makeProduct('Latte', 'Coffee', 20, 100), size: 'Small', date: '2025-01-15' }
    const result = calcSizeDistributionTrend([p1, p2])
    expect(result).toHaveLength(1)
    expect(result[0].month).toBe('2025-01')
  })

  it('calculates percentages correctly within a month', () => {
    const p1: ProductRecord = { ...makeProduct('Latte', 'Coffee', 10, 75), size: 'Large', date: '2025-01-10' }
    const p2: ProductRecord = { ...makeProduct('Latte', 'Coffee', 10, 25), size: 'Small', date: '2025-01-15' }
    const result = calcSizeDistributionTrend([p1, p2])
    expect(result[0].sizes['Large']).toBeCloseTo(75)
    expect(result[0].sizes['Small']).toBeCloseTo(25)
  })

  it('returns entries sorted by month ascending', () => {
    const p1: ProductRecord = { ...makeProduct('Latte', 'Coffee', 10, 100), size: 'Large', date: '2025-03-01' }
    const p2: ProductRecord = { ...makeProduct('Latte', 'Coffee', 10, 100), size: 'Large', date: '2025-01-01' }
    const result = calcSizeDistributionTrend([p1, p2])
    expect(result[0].month).toBe('2025-01')
    expect(result[1].month).toBe('2025-03')
  })
})
