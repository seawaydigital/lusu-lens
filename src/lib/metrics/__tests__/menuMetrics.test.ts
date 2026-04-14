import { calcMenuEngineering } from '../sharedMetrics'
import { calcSizeDistributionTrend, calcLtoVsCore } from '../studyMetrics'
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

  it('assigns bestseller to items above both medians', () => {
    const products = [
      makeProduct('A', 'Coffee', 50, 200),
      makeProduct('B', 'Food', 50, 50),
      makeProduct('C', 'Tea', 10, 200),
      makeProduct('D', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const a = result.find(r => r.item === 'A')
    expect(a?.tier).toBe('bestseller')
  })

  it('assigns slowmover to items below both medians', () => {
    const products = [
      makeProduct('A', 'Coffee', 50, 200),
      makeProduct('B', 'Food', 50, 50),
      makeProduct('C', 'Tea', 10, 200),
      makeProduct('D', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const d = result.find(r => r.item === 'D')
    expect(d?.tier).toBe('slowmover')
  })

  it('assigns hightraffic to high-volume low-revenue items', () => {
    const products = [
      makeProduct('A', 'Coffee', 50, 200),
      makeProduct('B', 'Food', 50, 50),
      makeProduct('C', 'Tea', 10, 200),
      makeProduct('D', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const b = result.find(r => r.item === 'B')
    expect(b?.tier).toBe('hightraffic')
  })

  it('assigns highvalue to low-volume high-revenue items', () => {
    const products = [
      makeProduct('A', 'Coffee', 50, 200),
      makeProduct('B', 'Food', 50, 50),
      makeProduct('C', 'Tea', 10, 200),
      makeProduct('D', 'Other', 10, 50),
    ]
    const result = calcMenuEngineering(products)
    const c = result.find(r => r.item === 'C')
    expect(c?.tier).toBe('highvalue')
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

describe('calcLtoVsCore', () => {
  it('returns null when only 1 month of data', () => {
    const products = [makeProduct('Latte', 'Coffee', 10, 100)]
    expect(calcLtoVsCore(products)).toBeNull()
  })

  it('classifies items present in >= 50% of months as core', () => {
    // 3 months: Latte in all 3 (100% → core), Special in only 1 (33% → lto)
    const p1: ProductRecord = { ...makeProduct('Latte', 'Coffee', 10, 100), date: '2025-01-10' }
    const p2: ProductRecord = { ...makeProduct('Latte', 'Coffee', 10, 100), date: '2025-02-10' }
    const p3: ProductRecord = { ...makeProduct('Latte', 'Coffee', 10, 100), date: '2025-03-10' }
    const p4: ProductRecord = { ...makeProduct('Special', 'Food', 5, 50), date: '2025-01-10' }
    const result = calcLtoVsCore([p1, p2, p3, p4])
    expect(result).not.toBeNull()
    const jan = result!.data.find(d => d.month === '2025-01')!
    expect(jan.core).toBe(100) // Latte (core, 3/3 = 100%)
    expect(jan.lto).toBe(50)   // Special (lto, 1/3 ≈ 33%)
  })

  it('classifies items present in < 50% of months as lto', () => {
    const products: ProductRecord[] = [
      { ...makeProduct('Core', 'Coffee', 10, 100), date: '2025-01-10' },
      { ...makeProduct('Core', 'Coffee', 10, 100), date: '2025-02-10' },
      { ...makeProduct('Core', 'Coffee', 10, 100), date: '2025-03-10' },
      { ...makeProduct('LTO', 'Food', 5, 50), date: '2025-01-10' },
    ]
    const result = calcLtoVsCore(products)
    expect(result).not.toBeNull()
    const ltoItem = result!.ltoItems.find(i => i.item === 'LTO')
    expect(ltoItem).toBeDefined()
  })

  it('classifies item at exactly 50% threshold as core (>= 50%)', () => {
    // 2 months, both items in 1/2 months = 50% → core
    const products: ProductRecord[] = [
      { ...makeProduct('Half', 'Coffee', 10, 100), date: '2025-01-10' },
      { ...makeProduct('Other', 'Food', 10, 100), date: '2025-02-10' },
    ]
    const result = calcLtoVsCore(products)
    expect(result).not.toBeNull()
    const feb = result!.data.find(d => d.month === '2025-02')!
    expect(feb.lto).toBe(0) // Other is core (1/2 = 50%)
  })

  it('ltoItems are sorted by revenue descending', () => {
    // 3 months so SmallLTO/BigLTO at 1/3 ≈ 33% are unambiguously LTO
    const products: ProductRecord[] = [
      { ...makeProduct('Core', 'Coffee', 10, 100), date: '2025-01-10' },
      { ...makeProduct('Core', 'Coffee', 10, 100), date: '2025-02-10' },
      { ...makeProduct('Core', 'Coffee', 10, 100), date: '2025-03-10' },
      { ...makeProduct('SmallLTO', 'Food', 5, 10), date: '2025-01-10' },
      { ...makeProduct('BigLTO', 'Food', 5, 80), date: '2025-01-10' },
    ]
    const result = calcLtoVsCore(products)
    expect(result!.ltoItems[0].item).toBe('BigLTO')
    expect(result!.ltoItems[1].item).toBe('SmallLTO')
  })
})

import { calcAlcoholCategoryTrend } from '../outpostMetrics'

function makeOutpostProduct(item: string, category: string, gross: number, date = '2025-01-15'): ProductRecord {
  return { item, category, quantity: 1, gross, date, venue: 'outpost', size: null, net: gross }
}

describe('calcAlcoholCategoryTrend', () => {
  it('returns empty array when no alcohol products', () => {
    const products = [makeOutpostProduct('Wings', 'food', 50)]
    expect(calcAlcoholCategoryTrend(products)).toEqual([])
  })

  it('buckets beer categories correctly', () => {
    const products = [
      makeOutpostProduct('Draft', 'beer - draft', 100),
      makeOutpostProduct('Can', 'beer & coolers - bottles/cans', 50),
    ]
    const result = calcAlcoholCategoryTrend(products)
    expect(result[0].beer).toBeCloseTo(100)
    expect(result[0].spirits).toBeCloseTo(0)
  })

  it('buckets spirits correctly', () => {
    const products = [
      makeOutpostProduct('Vodka', 'liquor', 100),
      makeOutpostProduct('Draft', 'beer - draft', 100),
    ]
    const result = calcAlcoholCategoryTrend(products)
    expect(result[0].spirits).toBeCloseTo(50)
    expect(result[0].beer).toBeCloseTo(50)
  })

  it('percentages sum to 100 within a month', () => {
    const products = [
      makeOutpostProduct('Draft', 'beer - draft', 60),
      makeOutpostProduct('Vodka', 'liquor', 30),
      makeOutpostProduct('Wine', 'wine', 10),
    ]
    const result = calcAlcoholCategoryTrend(products)
    const total = result[0].beer + result[0].spirits + result[0].wine + result[0].other
    expect(total).toBeCloseTo(100)
  })

  it('returns entries sorted by month ascending', () => {
    const products = [
      makeOutpostProduct('Draft', 'beer - draft', 100, '2025-03-01'),
      makeOutpostProduct('Draft', 'beer - draft', 100, '2025-01-01'),
    ]
    const result = calcAlcoholCategoryTrend(products)
    expect(result[0].month).toBe('2025-01')
    expect(result[1].month).toBe('2025-03')
  })
})

import { calcOutpostFoodAttach } from '../outpostMetrics'

describe('calcOutpostFoodAttach', () => {
  it('calculates overall food attach rate correctly', () => {
    const products = [
      makeOutpostProduct('Wings', 'food', 50, '2025-01-10'),
      makeOutpostProduct('Beer', 'beer - draft', 50, '2025-01-10'),
    ]
    const result = calcOutpostFoodAttach(products, new Set())
    expect(result.overall).toBeCloseTo(50)
  })

  it('excludes door revenue, catering, and events (CATERING_CATEGORIES) from totals', () => {
    const products = [
      makeOutpostProduct('Wings', 'food', 50, '2025-01-10'),
      makeOutpostProduct('Cover', 'door revenue', 500, '2025-01-10'),
      makeOutpostProduct('Catering', 'catering', 500, '2025-01-10'),
      makeOutpostProduct('EventItem', 'events', 500, '2025-01-10'),
    ]
    const result = calcOutpostFoodAttach(products, new Set())
    expect(result.overall).toBeCloseTo(100)
    expect(result.totalGross).toBeCloseTo(50)
  })

  it('returns event = null when eventDays is empty', () => {
    const products = [makeOutpostProduct('Wings', 'food', 50)]
    const result = calcOutpostFoodAttach(products, new Set())
    expect(result.event).toBeNull()
  })

  it('splits event vs regular correctly', () => {
    const products = [
      makeOutpostProduct('Wings', 'food', 20, '2025-01-10'),
      makeOutpostProduct('Beer', 'beer - draft', 80, '2025-01-10'),
      makeOutpostProduct('Wings', 'food', 10, '2025-01-15'),
      makeOutpostProduct('Beer', 'beer - draft', 90, '2025-01-15'),
    ]
    const eventDays = new Set(['2025-01-15'])
    const result = calcOutpostFoodAttach(products, eventDays)
    expect(result.regular).toBeCloseTo(20)
    expect(result.event).toBeCloseTo(10)
  })
})
