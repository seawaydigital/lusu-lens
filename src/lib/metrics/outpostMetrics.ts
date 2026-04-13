import type { ProductRecord, DailySummary } from '@/types'

const ALCOHOL_CATEGORIES = new Set([
  'liquor', 'beer - draft', 'beer & coolers - bottles/cans',
  'wine', 'study alcohol',
])

const CATERING_CATEGORIES = new Set([
  'catering', 'events', 'door revenue',
])

export function calcAlcoholFoodSplit(products: ProductRecord[]): {
  alcohol: number
  food: number
  other: number
} {
  let alcohol = 0
  let food = 0
  let other = 0

  for (const p of products) {
    const cat = p.category.toLowerCase()
    if (cat === 'gift cards' || CATERING_CATEGORIES.has(cat)) continue
    if (ALCOHOL_CATEGORIES.has(cat)) alcohol += p.gross
    else if (cat === 'food') food += p.gross
    else other += p.gross
  }

  return { alcohol, food, other }
}

export function calcDraftVsPackaged(products: ProductRecord[]): {
  draft: number
  packaged: number
  draftPct: number
} {
  let draft = 0
  let packaged = 0

  for (const p of products) {
    const cat = p.category.toLowerCase()
    if (cat === 'beer - draft') draft += p.gross
    else if (cat === 'beer & coolers - bottles/cans') packaged += p.gross
  }

  const total = draft + packaged
  return {
    draft,
    packaged,
    draftPct: total > 0 ? (draft / total) * 100 : 0,
  }
}

export function calcHappyHourImpact(summaries: DailySummary[]): {
  totalDollars: number
  pctOfGross: number
  daysActive: number
} {
  const totalDollars = summaries.reduce(
    (sum, s) => sum + Math.abs(s.autoPricingDiscounts),
    0
  )
  const totalGross = summaries.reduce((sum, s) => sum + s.grossSales, 0)
  const daysActive = summaries.filter(
    s => s.autoPricingDiscounts < 0
  ).length

  return {
    totalDollars,
    pctOfGross: totalGross > 0 ? (totalDollars / totalGross) * 100 : 0,
    daysActive,
  }
}

export function calcFridayWings(products: ProductRecord[]): {
  totalRevenue: number
  totalUnits: number
  fridayCount: number
  revenuePerFriday: number
  unitsPerFriday: number
  avgPrice: number
} {
  const wings = products.filter(
    p => p.item.trim().toUpperCase() === 'FRIDAY WINGS'
  )

  const totalRevenue = wings.reduce((sum, p) => sum + p.gross, 0)
  const totalUnits = wings.reduce((sum, p) => sum + p.quantity, 0)
  const fridayDates = new Set(wings.map(p => p.date))
  const fridayCount = fridayDates.size

  return {
    totalRevenue,
    totalUnits,
    fridayCount,
    revenuePerFriday: fridayCount > 0 ? totalRevenue / fridayCount : 0,
    unitsPerFriday: fridayCount > 0 ? totalUnits / fridayCount : 0,
    avgPrice: totalUnits > 0 ? totalRevenue / totalUnits : 0,
  }
}

export function calcCateringRevenue(products: ProductRecord[]): {
  total: number
  items: Array<{ item: string; date: string; gross: number; quantity: number }>
} {
  const catering = products.filter(p =>
    CATERING_CATEGORIES.has(p.category.toLowerCase())
  )

  return {
    total: catering.reduce((sum, p) => sum + p.gross, 0),
    items: catering.map(p => ({
      item: p.item,
      date: p.date,
      gross: p.gross,
      quantity: p.quantity,
    })),
  }
}
