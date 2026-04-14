import type { ProductRecord } from '@/types'

const HOT_CATEGORIES = new Set([
  'coffee', 'americano', 'cappuccino/latte', 'espresso',
  'hot chocolate', 'tea', 'mocha',
])

export function calcHotColdSplit(products: ProductRecord[]): {
  hot: number
  cold: number
} {
  let hot = 0
  let cold = 0

  for (const p of products) {
    const itemUpper = p.item.toUpperCase()
    const catLower = p.category.toLowerCase()

    if (
      itemUpper.includes('ICED') ||
      itemUpper.includes('COLD') ||
      catLower === 'cider'
    ) {
      cold += p.gross
    } else if (HOT_CATEGORIES.has(catLower)) {
      hot += p.gross
    }
  }

  return { hot, cold }
}

export function calcFoodAttachRate(products: ProductRecord[]): number {
  const totalGross = products.reduce((sum, p) => sum + p.gross, 0)
  if (totalGross === 0) return 0

  const foodGross = products
    .filter(p =>
      p.category.toLowerCase() === 'food' ||
      p.category.toLowerCase() === 'pastries'
    )
    .reduce((sum, p) => sum + p.gross, 0)

  return (foodGross / totalGross) * 100
}

export function calcSizeDistribution(
  products: ProductRecord[]
): Array<{ size: string; revenue: number }> {
  const sizeMap = new Map<string, number>()

  for (const p of products) {
    if (!p.size) continue
    sizeMap.set(p.size, (sizeMap.get(p.size) || 0) + p.gross)
  }

  return Array.from(sizeMap.entries())
    .map(([size, revenue]) => ({ size, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
}

export function findSeasonalItems(
  currentProducts: ProductRecord[],
  priorProducts: ProductRecord[]
): {
  newItems: Array<{ item: string; revenue: number }>
  removedItems: Array<{ item: string; lastRevenue: number }>
} {
  const currentItems = new Map<string, number>()
  for (const p of currentProducts) {
    currentItems.set(p.item, (currentItems.get(p.item) || 0) + p.gross)
  }

  const priorItems = new Map<string, number>()
  for (const p of priorProducts) {
    priorItems.set(p.item, (priorItems.get(p.item) || 0) + p.gross)
  }

  const newItems: Array<{ item: string; revenue: number }> = []
  const removedItems: Array<{ item: string; lastRevenue: number }> = []

  for (const [item, revenue] of Array.from(currentItems.entries())) {
    if (!priorItems.has(item)) {
      newItems.push({ item, revenue })
    }
  }

  for (const [item, lastRevenue] of Array.from(priorItems.entries())) {
    if (!currentItems.has(item)) {
      removedItems.push({ item, lastRevenue })
    }
  }

  return {
    newItems: newItems.sort((a, b) => b.revenue - a.revenue),
    removedItems: removedItems.sort((a, b) => b.lastRevenue - a.lastRevenue),
  }
}

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

export function calcLtoVsCore(products: ProductRecord[]): {
  data: Array<{ month: string; core: number; lto: number }>
  ltoItems: Array<{ item: string; months: string[]; revenue: number }>
} | null {
  const months = Array.from(new Set(products.map(p => p.date.slice(0, 7))))
  if (months.length < 2) return null

  const totalMonths = months.length

  const itemMonths = new Map<string, Set<string>>()
  const itemRevenue = new Map<string, number>()
  for (const p of products) {
    const month = p.date.slice(0, 7)
    if (!itemMonths.has(p.item)) itemMonths.set(p.item, new Set())
    itemMonths.get(p.item)!.add(month)
    itemRevenue.set(p.item, (itemRevenue.get(p.item) || 0) + p.gross)
  }

  const coreItems = new Set<string>()
  const ltoItems = new Set<string>()
  for (const [item, monthSet] of Array.from(itemMonths.entries())) {
    if (monthSet.size / totalMonths >= 0.5) coreItems.add(item)
    else ltoItems.add(item)
  }

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
