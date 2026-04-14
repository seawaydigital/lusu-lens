# Menu Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five menu-analytics features to LUSU Lens — ABC Menu Engineering, Size Upgrade Trend, LTO vs Core, Alcohol Category Trend, and Outpost Food Attach Rate — enabling managers to make data-backed decisions about menu, staffing, and event strategy.

**Architecture:** Each feature follows the established pattern: pure metric function in `src/lib/metrics/` → `'use client'` Recharts component in `src/components/` → wired into the relevant dashboard page. No new DB fields, no DB_VERSION bump, no server code.

**Tech Stack:** Next.js 14 (static export), TypeScript strict, Recharts, Tailwind CSS custom tokens. Tests with Jest (`npm run test`). Build validation with `npm run build`.

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `src/types/index.ts` | Add `MenuTier`, `MenuEngineeringItem` |
| Modify | `src/lib/metrics/sharedMetrics.ts` | Add `ProductRecord` import + `calcMenuEngineering` |
| Modify | `src/lib/metrics/studyMetrics.ts` | Add `calcSizeDistributionTrend`, `calcLtoVsCore` |
| Modify | `src/lib/metrics/outpostMetrics.ts` | Add `calcAlcoholCategoryTrend`, `calcOutpostFoodAttach` |
| Create | `src/lib/metrics/__tests__/menuMetrics.test.ts` | Unit tests for all 5 metric functions |
| Create | `src/components/shared/MenuAbcAnalysis.tsx` | Scatter chart + tabbed table |
| Modify | `src/components/study/SizeDistribution.tsx` | Add Trend tab (Distribution tab unchanged) |
| Create | `src/components/study/LtoVsCoreChart.tsx` | Stacked bar + LTO items table |
| Create | `src/components/outpost/AlcoholCategoryTrend.tsx` | 100% stacked bar (multi) or horizontal bars (single) |
| Create | `src/components/outpost/OutpostFoodAttach.tsx` | KPI card + event/regular split bars |
| Modify | `src/app/dashboard/study/page.tsx` | Import + render `MenuAbcAnalysis`, `LtoVsCoreChart` |
| Modify | `src/app/dashboard/outpost/page.tsx` | Import + render `MenuAbcAnalysis`, `AlcoholCategoryTrend`, `OutpostFoodAttach` |

---

## Task 1 — Add new types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `MenuTier` and `MenuEngineeringItem` to the end of `src/types/index.ts`** (before the last closing line, after existing exports)

```ts
export type MenuTier = 'star' | 'plowhorse' | 'puzzle' | 'dog'

export interface MenuEngineeringItem {
  item: string
  category: string
  quantity: number
  revenue: number
  tier: MenuTier
}
```

- [ ] **Step 2: Verify no build errors**

```bash
npm run build
```
Expected: clean build (same output as before, no new errors)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add MenuTier and MenuEngineeringItem types"
```

---

## Task 2 — `calcMenuEngineering` metric function

**Files:**
- Modify: `src/lib/metrics/sharedMetrics.ts`
- Create: `src/lib/metrics/__tests__/menuMetrics.test.ts`

- [ ] **Step 1: Create test file with failing tests for `calcMenuEngineering`**

Create `src/lib/metrics/__tests__/menuMetrics.test.ts`:

```ts
import { calcMenuEngineering } from '../sharedMetrics'
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
    // 4 items: medianQty=25, medianRev=125
    // Item A: qty=50, rev=200 → star
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
    // Two rows for 'Latte' — should be combined before median calc
    const products = [
      makeProduct('Latte', 'Coffee', 20, 80),
      makeProduct('Latte', 'Coffee', 30, 120),  // combined: qty=50, rev=200
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
```

- [ ] **Step 2: Run tests — expect FAIL (function not yet defined)**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: FAIL — "calcMenuEngineering is not a function" or similar import error

- [ ] **Step 3: Add `calcMenuEngineering` to `src/lib/metrics/sharedMetrics.ts`**

At the top, change the import line from:
```ts
import type { DailySummary } from '@/types'
```
to:
```ts
import type { DailySummary, ProductRecord, MenuEngineeringItem, MenuTier } from '@/types'
```

Then add the following at the end of the file (after `formatPercent`):

```ts
function medianOf(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function calcMenuEngineering(products: ProductRecord[]): MenuEngineeringItem[] {
  // Aggregate by item
  const itemMap = new Map<string, { category: string; quantity: number; revenue: number }>()
  for (const p of products) {
    const existing = itemMap.get(p.item)
    if (existing) {
      existing.quantity += p.quantity
      existing.revenue += p.gross
    } else {
      itemMap.set(p.item, { category: p.category, quantity: p.quantity, revenue: p.gross })
    }
  }

  if (itemMap.size < 4) return []

  const items = Array.from(itemMap.entries()).map(([item, data]) => ({ item, ...data }))

  const sortedQty = items.map(i => i.quantity).sort((a, b) => a - b)
  const sortedRev = items.map(i => i.revenue).sort((a, b) => a - b)
  const medianQty = medianOf(sortedQty)
  const medianRev = medianOf(sortedRev)

  return items.map(({ item, category, quantity, revenue }) => {
    let tier: MenuTier
    if (quantity >= medianQty && revenue >= medianRev) tier = 'star'
    else if (quantity >= medianQty && revenue < medianRev) tier = 'plowhorse'
    else if (quantity < medianQty && revenue >= medianRev) tier = 'puzzle'
    else tier = 'dog'
    return { item, category, quantity, revenue, tier }
  })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: all 5 `calcMenuEngineering` tests pass

- [ ] **Step 5: Verify it builds**

```bash
npm run build
```
Expected: clean build — TypeScript picks up the new import and types correctly

- [ ] **Step 6: Commit**

```bash
git add src/lib/metrics/sharedMetrics.ts src/lib/metrics/__tests__/menuMetrics.test.ts
git commit -m "feat: add calcMenuEngineering metric function with tests"
```

---

## Task 3 — `calcSizeDistributionTrend` metric function

**Files:**
- Modify: `src/lib/metrics/studyMetrics.ts`
- Modify: `src/lib/metrics/__tests__/menuMetrics.test.ts`

- [ ] **Step 1: Add failing tests for `calcSizeDistributionTrend` to the test file**

Append to `src/lib/metrics/__tests__/menuMetrics.test.ts`:

```ts
import { calcSizeDistributionTrend } from '../studyMetrics'

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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: FAIL — `calcSizeDistributionTrend` not defined

- [ ] **Step 3: Add `calcSizeDistributionTrend` to `src/lib/metrics/studyMetrics.ts`**

Append after the existing `findSeasonalItems` function:

```ts
export function calcSizeDistributionTrend(
  products: ProductRecord[]
): Array<{ month: string; sizes: Record<string, number> }> {
  const sized = products.filter(p => p.size !== null)
  if (sized.length === 0) return []

  const monthMap = new Map<string, Map<string, number>>()
  for (const p of sized) {
    const month = p.date.slice(0, 7) // YYYY-MM
    const size = p.size as string
    if (!monthMap.has(month)) monthMap.set(month, new Map())
    const sizeMap = monthMap.get(month)!
    sizeMap.set(size, (sizeMap.get(size) || 0) + p.gross)
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, sizeMap]) => {
      const total = Array.from(sizeMap.values()).reduce((sum, v) => sum + v, 0)
      const sizes: Record<string, number> = {}
      for (const [size, rev] of Array.from(sizeMap.entries())) {
        sizes[size] = total > 0 ? (rev / total) * 100 : 0
      }
      return { month, sizes }
    })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: all `calcSizeDistributionTrend` tests pass

- [ ] **Step 5: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 6: Commit**

```bash
git add src/lib/metrics/studyMetrics.ts src/lib/metrics/__tests__/menuMetrics.test.ts
git commit -m "feat: add calcSizeDistributionTrend metric function with tests"
```

---

## Task 4 — `calcLtoVsCore` metric function

**Files:**
- Modify: `src/lib/metrics/studyMetrics.ts`
- Modify: `src/lib/metrics/__tests__/menuMetrics.test.ts`

- [ ] **Step 1: Add failing tests for `calcLtoVsCore`**

Append to `src/lib/metrics/__tests__/menuMetrics.test.ts`:

```ts
import { calcLtoVsCore } from '../studyMetrics'

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
    // 3 months: item in 1 month → lto (1/3 ≈ 33%)
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
    // 2 months, item in 1 month → 1/2 = 50% → core
    const products: ProductRecord[] = [
      { ...makeProduct('Half', 'Coffee', 10, 100), date: '2025-01-10' },
      { ...makeProduct('Other', 'Food', 10, 100), date: '2025-02-10' },
    ]
    const result = calcLtoVsCore(products)
    expect(result).not.toBeNull()
    // 'Half' appears in 1/2 months = 50% → core
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: FAIL — `calcLtoVsCore` not defined

- [ ] **Step 3: Add `calcLtoVsCore` to `src/lib/metrics/studyMetrics.ts`**

Append after `calcSizeDistributionTrend`:

```ts
export function calcLtoVsCore(products: ProductRecord[]): {
  data: Array<{ month: string; core: number; lto: number }>
  ltoItems: Array<{ item: string; months: string[]; revenue: number }>
} | null {
  const months = Array.from(new Set(products.map(p => p.date.slice(0, 7))))
  if (months.length < 2) return null

  const totalMonths = months.length

  // Count distinct months per item and accumulate revenue
  const itemMonths = new Map<string, Set<string>>()
  const itemRevenue = new Map<string, number>()
  for (const p of products) {
    const month = p.date.slice(0, 7)
    if (!itemMonths.has(p.item)) itemMonths.set(p.item, new Set())
    itemMonths.get(p.item)!.add(month)
    itemRevenue.set(p.item, (itemRevenue.get(p.item) || 0) + p.gross)
  }

  // Classify: >= 50% of months → core, otherwise lto
  const coreItems = new Set<string>()
  const ltoItems = new Set<string>()
  for (const [item, monthSet] of Array.from(itemMonths.entries())) {
    if (monthSet.size / totalMonths >= 0.5) coreItems.add(item)
    else ltoItems.add(item)
  }

  // Aggregate core and lto revenue per month
  const monthData = new Map<string, { core: number; lto: number }>()
  for (const month of months) monthData.set(month, { core: 0, lto: 0 })
  for (const p of products) {
    const month = p.date.slice(0, 7)
    const entry = monthData.get(month)!
    if (coreItems.has(p.item)) entry.core += p.gross
    else if (ltoItems.has(p.item)) entry.lto += p.gross
  }

  const sortedMonths = Array.from(monthData.keys()).sort()
  const data = sortedMonths.map(month => ({ month, ...monthData.get(month)! }))

  const ltoItemsArray = Array.from(ltoItems)
    .map(item => ({
      item,
      months: Array.from(itemMonths.get(item)!),
      revenue: itemRevenue.get(item) || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  return { data, ltoItems: ltoItemsArray }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: all `calcLtoVsCore` tests pass

- [ ] **Step 5: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 6: Commit**

```bash
git add src/lib/metrics/studyMetrics.ts src/lib/metrics/__tests__/menuMetrics.test.ts
git commit -m "feat: add calcLtoVsCore metric function with tests"
```

---

## Task 5 — `calcAlcoholCategoryTrend` metric function

**Files:**
- Modify: `src/lib/metrics/outpostMetrics.ts`
- Modify: `src/lib/metrics/__tests__/menuMetrics.test.ts`

- [ ] **Step 1: Add failing tests for `calcAlcoholCategoryTrend`**

Append to `src/lib/metrics/__tests__/menuMetrics.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: FAIL — `calcAlcoholCategoryTrend` not defined

- [ ] **Step 3: Add `calcAlcoholCategoryTrend` to `src/lib/metrics/outpostMetrics.ts`**

Append after `calcCateringRevenue`:

```ts
export function calcAlcoholCategoryTrend(
  products: ProductRecord[]
): Array<{ month: string; beer: number; spirits: number; wine: number; other: number }> {
  const alcoholProducts = products.filter(p => ALCOHOL_CATEGORIES.has(p.category.toLowerCase()))
  if (alcoholProducts.length === 0) return []

  const monthMap = new Map<string, { beer: number; spirits: number; wine: number; other: number }>()
  for (const p of alcoholProducts) {
    const month = p.date.slice(0, 7)
    if (!monthMap.has(month)) monthMap.set(month, { beer: 0, spirits: 0, wine: 0, other: 0 })
    const entry = monthMap.get(month)!
    const cat = p.category.toLowerCase()
    if (cat === 'beer - draft' || cat === 'beer & coolers - bottles/cans') entry.beer += p.gross
    else if (cat === 'liquor') entry.spirits += p.gross
    else if (cat === 'wine') entry.wine += p.gross
    else entry.other += p.gross
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { beer, spirits, wine, other }]) => {
      const total = beer + spirits + wine + other
      if (total === 0) return { month, beer: 0, spirits: 0, wine: 0, other: 0 }
      return {
        month,
        beer: (beer / total) * 100,
        spirits: (spirits / total) * 100,
        wine: (wine / total) * 100,
        other: (other / total) * 100,
      }
    })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: all `calcAlcoholCategoryTrend` tests pass

- [ ] **Step 5: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 6: Commit**

```bash
git add src/lib/metrics/outpostMetrics.ts src/lib/metrics/__tests__/menuMetrics.test.ts
git commit -m "feat: add calcAlcoholCategoryTrend metric function with tests"
```

---

## Task 6 — `calcOutpostFoodAttach` metric function

**Files:**
- Modify: `src/lib/metrics/outpostMetrics.ts`
- Modify: `src/lib/metrics/__tests__/menuMetrics.test.ts`

- [ ] **Step 1: Add failing tests for `calcOutpostFoodAttach`**

Append to `src/lib/metrics/__tests__/menuMetrics.test.ts`:

```ts
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
    // Only Wings counts — door revenue, catering, events are excluded
    // food = 50, total = 50 → 100%
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
      makeOutpostProduct('Wings', 'food', 20, '2025-01-10'),       // regular night
      makeOutpostProduct('Beer', 'beer - draft', 80, '2025-01-10'), // regular night
      makeOutpostProduct('Wings', 'food', 10, '2025-01-15'),        // event night
      makeOutpostProduct('Beer', 'beer - draft', 90, '2025-01-15'), // event night
    ]
    const eventDays = new Set(['2025-01-15'])
    const result = calcOutpostFoodAttach(products, eventDays)
    expect(result.regular).toBeCloseTo(20)  // 20/100 = 20%
    expect(result.event).toBeCloseTo(10)    // 10/100 = 10%
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: FAIL — `calcOutpostFoodAttach` not defined

- [ ] **Step 3: Add `calcOutpostFoodAttach` to `src/lib/metrics/outpostMetrics.ts`**

Append after `calcAlcoholCategoryTrend`:

```ts
export function calcOutpostFoodAttach(
  products: ProductRecord[],
  eventDays: Set<string>
): { overall: number; regular: number; event: number | null; foodGross: number; totalGross: number } {
  // Exclude all CATERING_CATEGORIES (door revenue, catering, events)
  const eligible = products.filter(p => !CATERING_CATEGORIES.has(p.category.toLowerCase()))

  // Group by date
  const dateMap = new Map<string, { food: number; total: number }>()
  for (const p of eligible) {
    if (!dateMap.has(p.date)) dateMap.set(p.date, { food: 0, total: 0 })
    const entry = dateMap.get(p.date)!
    entry.total += p.gross
    if (p.category.toLowerCase() === 'food') entry.food += p.gross
  }

  const foodGross = eligible.filter(p => p.category.toLowerCase() === 'food').reduce((sum, p) => sum + p.gross, 0)
  const totalGross = eligible.reduce((sum, p) => sum + p.gross, 0)

  const dates = Array.from(dateMap.entries())
  const toRate = ([, { food, total }]: [string, { food: number; total: number }]) =>
    total > 0 ? food / total : 0

  const allRates = dates.map(toRate)
  const overall = allRates.length > 0
    ? (allRates.reduce((sum, r) => sum + r, 0) / allRates.length) * 100
    : 0

  const regularDates = dates.filter(([date]) => !eventDays.has(date))
  const eventDates = dates.filter(([date]) => eventDays.has(date))

  const regular = regularDates.length > 0
    ? (regularDates.map(toRate).reduce((sum, r) => sum + r, 0) / regularDates.length) * 100
    : 0
  const event = eventDates.length > 0
    ? (eventDates.map(toRate).reduce((sum, r) => sum + r, 0) / eventDates.length) * 100
    : null

  return { overall, regular, event, foodGross, totalGross }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test -- --testPathPattern=menuMetrics
```
Expected: all `calcOutpostFoodAttach` tests pass

- [ ] **Step 5: Run full test suite to ensure no regressions**

```bash
npm run test
```
Expected: all tests pass

- [ ] **Step 6: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 7: Commit**

```bash
git add src/lib/metrics/outpostMetrics.ts src/lib/metrics/__tests__/menuMetrics.test.ts
git commit -m "feat: add calcOutpostFoodAttach metric function with tests"
```

---

## Task 7 — `MenuAbcAnalysis` component

**Files:**
- Create: `src/components/shared/MenuAbcAnalysis.tsx`

- [ ] **Step 1: Create `src/components/shared/MenuAbcAnalysis.tsx`**

```tsx
'use client'

import { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { calcMenuEngineering, formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { ProductRecord, MenuEngineeringItem, MenuTier } from '@/types'

const TIER_COLORS: Record<MenuTier, string> = {
  star: '#C4A952',
  plowhorse: '#00B4E6',
  puzzle: '#7C3AED',
  dog: '#9CA3AF',
}

const TIER_LABELS: Record<MenuTier, string> = {
  star: '⭐ Stars',
  plowhorse: '🐴 Plowhorses',
  puzzle: '🧩 Puzzles',
  dog: '🐶 Dogs',
}

const TIER_DESCRIPTIONS: Record<MenuTier, string> = {
  star: 'High volume + high revenue. Keep and promote.',
  plowhorse: 'High volume, low revenue. Review pricing.',
  puzzle: 'Low volume, high revenue. Reposition and promote.',
  dog: 'Low volume, low revenue. Consider removing.',
}

interface MenuAbcAnalysisProps {
  products: ProductRecord[]
  venue: 'study' | 'outpost'
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: MenuEngineeringItem }>
}

function ScatterTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 max-w-[180px] truncate">{item.item}</p>
      <p className="text-gray-400">{item.category}</p>
      <p className="text-gray-700 mt-0.5">{formatCurrency(item.revenue)} · {item.quantity.toLocaleString()} units</p>
      <p className="font-medium mt-0.5" style={{ color: TIER_COLORS[item.tier] }}>{TIER_LABELS[item.tier]}</p>
    </div>
  )
}

export default function MenuAbcAnalysis({ products, venue }: MenuAbcAnalysisProps) {
  const [activeTab, setActiveTab] = useState<MenuTier>('dog')

  const items = calcMenuEngineering(products)

  const topBorder = venue === 'study' ? 'border-t-study-gold' : 'border-t-outpost-black'

  if (items.length === 0) {
    return (
      <div className={`bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 ${topBorder}`}>
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-2">Menu Engineering</p>
        <p className="text-sm text-gray-400">Not enough menu data to classify items.</p>
      </div>
    )
  }

  // Recompute medians for reference lines (mirrors calcMenuEngineering logic)
  const sortedQty = items.map(i => i.quantity).sort((a, b) => a - b)
  const sortedRev = items.map(i => i.revenue).sort((a, b) => a - b)
  const midQ = Math.floor(sortedQty.length / 2)
  const midR = Math.floor(sortedRev.length / 2)
  const medianQty = sortedQty.length % 2 === 0
    ? (sortedQty[midQ - 1] + sortedQty[midQ]) / 2 : sortedQty[midQ]
  const medianRev = sortedRev.length % 2 === 0
    ? (sortedRev[midR - 1] + sortedRev[midR]) / 2 : sortedRev[midR]

  const tabs: MenuTier[] = ['star', 'plowhorse', 'puzzle', 'dog']
  const tabItems = items.filter(i => i.tier === activeTab).sort((a, b) => b.revenue - a.revenue)

  return (
    <div className={`bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 ${topBorder} col-span-full`}>
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">Menu Engineering</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {tabs.map(tier => (
          <div key={tier} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TIER_COLORS[tier] }} />
            <span>{TIER_LABELS[tier]}</span>
          </div>
        ))}
      </div>

      {/* Scatter plot */}
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="quantity"
            name="Units Sold"
            tick={{ fontSize: 11 }}
            label={{ value: 'Units Sold', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9CA3AF' }}
          />
          <YAxis
            dataKey="revenue"
            name="Revenue"
            tick={{ fontSize: 11 }}
            tickFormatter={v => typeof v === 'number' ? (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`) : ''}
          />
          <ReferenceLine x={medianQty} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1.5} />
          <ReferenceLine y={medianRev} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1.5} />
          <Tooltip content={<ScatterTooltip />} />
          <Scatter data={items} fillOpacity={0.85}>
            {items.map((item, idx) => (
              <Cell key={idx} fill={TIER_COLORS[item.tier]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Tab strip */}
      <div className="mt-5">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tabs.map(tier => (
            <button
              key={tier}
              onClick={() => setActiveTab(tier)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeTab === tier
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {TIER_LABELS[tier]}{' '}
              <span className={activeTab === tier ? 'opacity-60' : 'opacity-50'}>
                {items.filter(i => i.tier === tier).length}
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 mb-3">{TIER_DESCRIPTIONS[activeTab]}</p>

        {tabItems.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No items in this tier.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 pr-4 text-gray-400 font-medium">Item</th>
                  <th className="text-left py-1.5 pr-4 text-gray-400 font-medium">Category</th>
                  <th className="text-right py-1.5 pr-4 text-gray-400 font-medium">Units</th>
                  <th className="text-right py-1.5 text-gray-400 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tabItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-4 text-gray-900 font-medium max-w-[180px] truncate">{item.item}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{item.category}</td>
                    <td className="py-1.5 pr-4 text-gray-900 text-right tabular-nums">{item.quantity.toLocaleString()}</td>
                    <td className="py-1.5 text-gray-900 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```
Expected: clean build — no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/MenuAbcAnalysis.tsx
git commit -m "feat: add MenuAbcAnalysis scatter chart component"
```

---

## Task 8 — Enhanced `SizeDistribution` component

**Files:**
- Modify: `src/components/study/SizeDistribution.tsx`

- [ ] **Step 1: Replace the full contents of `src/components/study/SizeDistribution.tsx`**

```tsx
'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { calcSizeDistribution, calcSizeDistributionTrend } from '@/lib/metrics/studyMetrics'
import type { ProductRecord } from '@/types'

interface SizeDistributionProps {
  products: ProductRecord[]
}

const LINE_COLORS = ['#C4A952', '#00B4E6', '#1B3A6B', '#9CA3AF']

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' })
}

export default function SizeDistribution({ products }: SizeDistributionProps) {
  const [tab, setTab] = useState<'distribution' | 'trend'>('distribution')

  const data = calcSizeDistribution(products)
  if (data.length === 0) return null

  const monthCount = Array.from(new Set(products.map(p => p.date.slice(0, 7)))).length
  const showTrend = monthCount >= 2

  const trendRaw = showTrend ? calcSizeDistributionTrend(products) : []
  const allSizes = Array.from(new Set(trendRaw.flatMap(d => Object.keys(d.sizes))))
  const trendData = trendRaw.map(d => ({
    month: formatMonthLabel(d.month),
    ...d.sizes,
  }))

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400">
          Size Distribution
        </h3>
        {showTrend && (
          <div className="flex gap-1">
            {(['distribution', 'trend'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  tab === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t === 'distribution' ? 'Distribution' : 'Trend'}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'distribution' ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="size" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''} />
            <Bar dataKey="revenue" fill="#C4A952" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={v => `${typeof v === 'number' ? v.toFixed(0) : v}%`}
              domain={[0, 100]}
            />
            <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}%` : ''} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            {allSizes.map((size, idx) => (
              <Line
                key={size}
                type="monotone"
                dataKey={size}
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 3: Commit**

```bash
git add src/components/study/SizeDistribution.tsx
git commit -m "feat: add Trend tab to SizeDistribution component"
```

---

## Task 9 — `LtoVsCoreChart` component

**Files:**
- Create: `src/components/study/LtoVsCoreChart.tsx`

- [ ] **Step 1: Create `src/components/study/LtoVsCoreChart.tsx`**

```tsx
'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { calcLtoVsCore } from '@/lib/metrics/studyMetrics'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { ProductRecord } from '@/types'

interface LtoVsCoreChartProps {
  products: ProductRecord[]
}

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' })
}

export default function LtoVsCoreChart({ products }: LtoVsCoreChartProps) {
  const result = calcLtoVsCore(products)

  if (!result) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-study-gold">
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-2">LTO vs Core Revenue</p>
        <p className="text-sm text-gray-400">Select 2+ months to see LTO analysis.</p>
      </div>
    )
  }

  const { data, ltoItems } = result

  // Insight: first-to-last core delta
  const firstCore = data[0]?.core ?? 0
  const lastCore = data[data.length - 1]?.core ?? 0
  const coreDeltaPct = firstCore > 0 ? ((lastCore - firstCore) / firstCore) * 100 : 0
  const coreDirection = coreDeltaPct > 3 ? 'grew' : coreDeltaPct < -3 ? 'declined' : 'held steady'

  const totalRevenue = data.reduce((sum, d) => sum + d.core + d.lto, 0)
  const totalLto = data.reduce((sum, d) => sum + d.lto, 0)
  const ltoPct = totalRevenue > 0 ? (totalLto / totalRevenue) * 100 : 0

  const chartData = data.map(d => ({
    month: formatMonthLabel(d.month),
    Core: Math.round(d.core),
    LTO: Math.round(d.lto),
  }))

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-study-gold col-span-full">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">LTO vs Core Revenue</p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => typeof v === 'number' ? (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`) : ''}
          />
          <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : ''} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Core" stackId="a" fill="#C4A952" />
          <Bar dataKey="LTO" stackId="a" fill="#00B4E6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 mt-3">
        LTO items contributed{' '}
        <span className="text-gray-700 font-medium">{ltoPct.toFixed(1)}%</span> of revenue.
        Core revenue{' '}
        <span className="text-gray-700 font-medium">{coreDirection}</span> while LTOs were active.
      </p>

      {ltoItems.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-2">LTO Items</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 pr-4 text-gray-400 font-medium">Item</th>
                  <th className="text-left py-1.5 pr-4 text-gray-400 font-medium">Active Months</th>
                  <th className="text-right py-1.5 text-gray-400 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {ltoItems.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-4 text-gray-900 font-medium max-w-[200px] truncate">{item.item}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{item.months.map(formatMonthLabel).join(', ')}</td>
                    <td className="py-1.5 text-gray-900 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 3: Commit**

```bash
git add src/components/study/LtoVsCoreChart.tsx
git commit -m "feat: add LtoVsCoreChart component"
```

---

## Task 10 — `AlcoholCategoryTrend` component

**Files:**
- Create: `src/components/outpost/AlcoholCategoryTrend.tsx`

- [ ] **Step 1: Create `src/components/outpost/AlcoholCategoryTrend.tsx`**

```tsx
'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { calcAlcoholCategoryTrend } from '@/lib/metrics/outpostMetrics'
import type { ProductRecord } from '@/types'

interface AlcoholCategoryTrendProps {
  products: ProductRecord[]
}

const BUCKET_COLORS = {
  Beer: '#1B3A6B',
  Spirits: '#E63946',
  Wine: '#7C3AED',
  Other: '#9CA3AF',
}

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' })
}

export default function AlcoholCategoryTrend({ products }: AlcoholCategoryTrendProps) {
  const trendData = calcAlcoholCategoryTrend(products)
  if (trendData.length === 0) return null

  const monthCount = Array.from(new Set(products.map(p => p.date.slice(0, 7)))).length

  const chartData = trendData.map(d => ({
    month: formatMonthLabel(d.month),
    Beer: parseFloat(d.beer.toFixed(1)),
    Spirits: parseFloat(d.spirits.toFixed(1)),
    Wine: parseFloat(d.wine.toFixed(1)),
    Other: parseFloat(d.other.toFixed(1)),
  }))

  if (monthCount < 2) {
    // Single-month: horizontal bar breakdown
    const d = chartData[0]
    const categories = (Object.keys(BUCKET_COLORS) as Array<keyof typeof BUCKET_COLORS>)
      .map(name => ({ name, value: d[name], color: BUCKET_COLORS[name] }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)

    return (
      <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06]">
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">Alcohol Category Mix</p>
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{cat.name}</span>
                <span className="text-gray-900 font-medium tabular-nums">{cat.value.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${cat.value}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06]">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">Alcohol Category Mix</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}%` : ''} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Beer" stackId="a" fill={BUCKET_COLORS.Beer} />
          <Bar dataKey="Spirits" stackId="a" fill={BUCKET_COLORS.Spirits} />
          <Bar dataKey="Wine" stackId="a" fill={BUCKET_COLORS.Wine} />
          <Bar dataKey="Other" stackId="a" fill={BUCKET_COLORS.Other} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 3: Commit**

```bash
git add src/components/outpost/AlcoholCategoryTrend.tsx
git commit -m "feat: add AlcoholCategoryTrend component"
```

---

## Task 11 — `OutpostFoodAttach` component

**Files:**
- Create: `src/components/outpost/OutpostFoodAttach.tsx`

- [ ] **Step 1: Create `src/components/outpost/OutpostFoodAttach.tsx`**

```tsx
'use client'

import { calcOutpostFoodAttach } from '@/lib/metrics/outpostMetrics'
import type { ProductRecord } from '@/types'

interface OutpostFoodAttachProps {
  products: ProductRecord[]
  eventDays: Set<string>
}

export default function OutpostFoodAttach({ products, eventDays }: OutpostFoodAttachProps) {
  const { overall, regular, event, foodGross, totalGross } = calcOutpostFoodAttach(products, eventDays)

  // Dynamic target: always 5pp above current, rounded to nearest 5
  const target = Math.ceil((overall + 5) / 5) * 5
  const revenueGain = Math.round((totalGross * (target - overall)) / 100)

  let insight: string
  if (event !== null) {
    const diff = regular - event
    if (event > regular) {
      insight = 'Food ordering is stronger on event nights — good F&B synergy.'
    } else if (diff > 5) {
      insight = `Food attach drops ${diff.toFixed(1)}pp on event nights — opportunity to promote food during events.`
    } else {
      insight = 'Food attach is consistent across event and regular nights.'
    }
  } else if (overall >= 30) {
    insight = 'Strong food attachment for a campus pub. Focus on maintaining quality and variety.'
  } else {
    insight = `Raising to ${target}% would add ~$${revenueGain.toLocaleString()}/month without a single new customer.`
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-outpost-black">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-2">
        Food Attach Rate
      </p>
      <p className="text-[28px] font-bold text-gray-900 tracking-tight tabular-nums">
        {overall.toFixed(1)}%
      </p>
      <p className="text-xs text-gray-400 font-medium mt-1.5">
        ${Math.round(foodGross).toLocaleString()} food of ${Math.round(totalGross).toLocaleString()} total sales
      </p>

      {event !== null && (
        <div className="mt-4 space-y-2.5">
          {[
            { label: 'Regular Nights', value: regular, color: '#1B3A6B' },
            { label: 'Event Nights', value: event, color: '#E63946' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium tabular-nums">{value.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 leading-relaxed mt-3">{insight}</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 3: Commit**

```bash
git add src/components/outpost/OutpostFoodAttach.tsx
git commit -m "feat: add OutpostFoodAttach component"
```

---

## Task 12 — Wire into Study dashboard page

**Files:**
- Modify: `src/app/dashboard/study/page.tsx`

- [ ] **Step 1: Add imports at the top of `src/app/dashboard/study/page.tsx`**

Find the existing import block (ends around line 30 with `import type { UploadRecord, DailySummary, ProductRecord } from '@/types'`). Add these two new imports directly above the `import type` line:

```ts
import MenuAbcAnalysis from '@/components/shared/MenuAbcAnalysis'
import LtoVsCoreChart from '@/components/study/LtoVsCoreChart'
```

- [ ] **Step 2: Add `MenuAbcAnalysis` to the Products section**

Find the Products section (around line 195–210). It currently ends with:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <CategoryDonut products={products} />
  <TopItemsChart products={products} accentColor="#C4A952" />
</div>
```

Change it to:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <CategoryDonut products={products} />
  <TopItemsChart products={products} accentColor="#C4A952" />
  <MenuAbcAnalysis products={products} venue="study" />
</div>
```

- [ ] **Step 3: Add `LtoVsCoreChart` to the Patterns section**

> **Placement note:** The spec lists this under "Products section" but `SeasonalItemTracker` (the logical sibling) lives in the Patterns section. Place `LtoVsCoreChart` in the Patterns section beside `SeasonalItemTracker` — this is the correct location in the actual page structure.

Find the Patterns section. It currently renders `<SeasonalItemTracker hasMultipleMonths={studyUploads.length >= 2} />`. Add `LtoVsCoreChart` immediately after it:

```tsx
{hasProducts && <SeasonalItemTracker hasMultipleMonths={studyUploads.length >= 2} />}
{hasProducts && <LtoVsCoreChart products={products} />}
```

- [ ] **Step 4: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/study/page.tsx
git commit -m "feat: wire MenuAbcAnalysis and LtoVsCoreChart into Study dashboard"
```

---

## Task 13 — Wire into Outpost dashboard page

**Files:**
- Modify: `src/app/dashboard/outpost/page.tsx`

- [ ] **Step 1: Add imports at the top of `src/app/dashboard/outpost/page.tsx`**

Find the existing import block. Add these three new imports directly above the `import type` line:

```ts
import MenuAbcAnalysis from '@/components/shared/MenuAbcAnalysis'
import AlcoholCategoryTrend from '@/components/outpost/AlcoholCategoryTrend'
import OutpostFoodAttach from '@/components/outpost/OutpostFoodAttach'
```

- [ ] **Step 2: Add `MenuAbcAnalysis` to the Products section**

Find the Products section. It currently ends with:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <CategoryDonut products={products} excludeGiftCards showCateringDistinct />
  <TopItemsChart products={products} accentColor="#0D0D0D" excludeCategories={['CATERING', 'Gift Cards']} />
</div>
```

Change to:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <CategoryDonut products={products} excludeGiftCards showCateringDistinct />
  <TopItemsChart products={products} accentColor="#0D0D0D" excludeCategories={['CATERING', 'Gift Cards']} />
  <MenuAbcAnalysis products={products} venue="outpost" />
</div>
```

- [ ] **Step 3: Add `AlcoholCategoryTrend` to the Alcohol & Beverage section**

Find the Alcohol & Beverage section. It currently renders `{hasProducts && <AlcoholFoodSplit products={products} />}`. Add `AlcoholCategoryTrend` immediately after it:

```tsx
{hasProducts && <AlcoholFoodSplit products={products} />}
{hasProducts && <AlcoholCategoryTrend products={products} />}
```

- [ ] **Step 4: Add `OutpostFoodAttach` to the Food section**

Find the Food section. It currently contains this entire conditional block:

```tsx
{hasProducts ? (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <FridayWingsTracker products={products} />
    <CateringRevenue products={products} />
  </div>
) : (
  <MissingDataSection fileType="products" venue="outpost" />
)}
```

Replace it with:

```tsx
{hasProducts ? (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <OutpostFoodAttach products={products} eventDays={eventDates} />
    <FridayWingsTracker products={products} />
    <CateringRevenue products={products} />
  </div>
) : (
  <MissingDataSection fileType="products" venue="outpost" />
)}
```

Note: `eventDates` is already in scope (`const eventDates = new Set(eventDays.map(e => e.date))`). No new variable needed.

- [ ] **Step 5: Verify it builds**

```bash
npm run build
```
Expected: clean build

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/outpost/page.tsx
git commit -m "feat: wire MenuAbcAnalysis, AlcoholCategoryTrend, OutpostFoodAttach into Outpost dashboard"
```

---

## Task 14 — Final validation and push

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```
Expected: all tests pass, no failures

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: clean build, 10 static pages, zero TypeScript errors

- [ ] **Step 3: Push to GitHub (triggers GitHub Pages deploy)**

```bash
git push origin main
```

- [ ] **Step 4: Verify deploy completes**

Check GitHub Actions at `https://github.com/seawaydigital/lusu-lens/actions`. The workflow should complete successfully within ~2 minutes.

---

## Testing Checklist (manual, post-deploy)

After deploy to `https://seawaydigital.github.io/lusu-lens`:

- [ ] Study dashboard with 1 month: `SizeDistribution` shows Distribution tab only (no Trend tab)
- [ ] Study dashboard with 2+ months: Trend tab appears and renders line chart
- [ ] Study dashboard with 1 month: `LtoVsCoreChart` shows placeholder text
- [ ] Study dashboard with 2+ months: `LtoVsCoreChart` shows stacked bar + LTO items table
- [ ] Study dashboard: `MenuAbcAnalysis` scatter renders with 4 quadrants, Dogs tab is default
- [ ] Outpost dashboard with 1 month: `AlcoholCategoryTrend` shows horizontal bars
- [ ] Outpost dashboard with 2+ months: `AlcoholCategoryTrend` shows 100% stacked bars
- [ ] Outpost dashboard with no events detected: `OutpostFoodAttach` shows no split bars, insight uses benchmark
- [ ] Outpost dashboard with events detected: `OutpostFoodAttach` shows Regular/Event bars
- [ ] `npm run build` passes clean
