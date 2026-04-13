'use client'

import { DoorOpen, Users, TrendingUp } from 'lucide-react'
import type { ProductRecord, DailySummary } from '@/types'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'

interface DoorRevenueTrackerProps {
  products: ProductRecord[]
  summaries: DailySummary[]
}

interface EventNight {
  date: string
  coverTier: string         // e.g. "$15"
  attendance: number        // number of people who paid a cover
  doorRevenue: number       // total cover charge + coat check revenue
  barFoodRevenue: number    // everything sold at the bar/food that night
  revenuePerHead: number    // bar+food revenue divided by attendance
}

// Identifies cover charge items — matches "$10 COVER", "$15 COVER" etc.
// Excludes bag/coat check items which are not actual people counts.
function isCoverCharge(item: string): boolean {
  return /^\$\d+\s+COVER$/i.test(item.trim())
}

// Extracts the dollar value from a cover charge item name like "$15 COVER"
function getCoverPrice(item: string): string {
  const m = item.match(/^\$(\d+)\s+COVER$/i)
  return m ? `$${m[1]}` : '?'
}

export default function DoorRevenueTracker({ products, summaries }: DoorRevenueTrackerProps) {
  // Pull all DOOR REVENUE category products
  const doorProducts = products.filter(p =>
    p.category.toUpperCase() === 'DOOR REVENUE'
  )

  if (doorProducts.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <DoorOpen size={18} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Door & Event Revenue</h3>
        </div>
        <p className="text-sm text-gray-500">No events with cover charges this period.</p>
      </div>
    )
  }

  // Group door products by date
  const byDate = new Map<string, ProductRecord[]>()
  for (const p of doorProducts) {
    if (!byDate.has(p.date)) byDate.set(p.date, [])
    byDate.get(p.date)!.push(p)
  }

  const summaryByDate = new Map(summaries.map(s => [s.date, s]))

  // Build one EventNight per event date
  const events: EventNight[] = []
  for (const [date, items] of Array.from(byDate.entries())) {
    const doorRevenue = items.reduce((sum, p) => sum + p.gross, 0)
    const coverItems = items.filter(p => isCoverCharge(p.item))
    const attendance = coverItems.reduce((sum, p) => sum + p.quantity, 0)

    // Determine primary cover tier (highest-qty cover price)
    const tierMap = new Map<string, number>()
    for (const p of coverItems) {
      const tier = getCoverPrice(p.item)
      tierMap.set(tier, (tierMap.get(tier) ?? 0) + p.quantity)
    }
    const coverTier = Array.from(tierMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    const summary = summaryByDate.get(date)
    const totalGross = summary?.grossSales ?? doorRevenue
    const barFoodRevenue = Math.max(0, totalGross - doorRevenue)
    const revenuePerHead = attendance > 0 ? barFoodRevenue / attendance : 0

    events.push({ date, coverTier, attendance, doorRevenue, barFoodRevenue, revenuePerHead })
  }

  events.sort((a, b) => a.date.localeCompare(b.date))

  const totalDoor = events.reduce((sum, e) => sum + e.doorRevenue, 0)
  const totalBar = events.reduce((sum, e) => sum + e.barFoodRevenue, 0)
  const totalAttendance = events.reduce((sum, e) => sum + e.attendance, 0)
  const avgRevenuePerHead = totalAttendance > 0 ? totalBar / totalAttendance : 0
  const totalGrossAll = summaries.reduce((sum, s) => sum + s.grossSales, 0)
  const doorPct = totalGrossAll > 0 ? (totalDoor / totalGrossAll) * 100 : 0

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
      <div className="flex items-center gap-2">
        <DoorOpen size={18} className="text-outpost-black" />
        <h3 className="text-sm font-semibold text-gray-700">Door & Event Revenue</h3>
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        On nights with a cover charge, revenue is split between door takings (cover fees paid at entry) and bar/food sales. <strong>Revenue per person</strong> shows how much each attendee spent at the bar and on food — useful for judging whether events are driving drink and food sales.
      </p>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <DoorOpen size={16} className="text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalDoor)}</p>
          <p className="text-xs text-gray-500">Door revenue</p>
          <p className="text-xs text-gray-400">({doorPct.toFixed(0)}% of period gross)</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <Users size={16} className="text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{totalAttendance.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total attendees</p>
          <p className="text-xs text-gray-400">across {events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <TrendingUp size={16} className="text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{formatCurrency(avgRevenuePerHead)}</p>
          <p className="text-xs text-gray-500">Avg bar spend</p>
          <p className="text-xs text-gray-400">per person</p>
        </div>
      </div>

      {/* Per-event breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Event breakdown</p>
        {events.map(e => {
          const dateLabel = new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
          })
          return (
            <div key={e.date} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">{dateLabel}</span>
                <span className="text-xs bg-outpost-black text-white px-2 py-0.5 rounded-full">
                  {e.coverTier} cover
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Attendance</span>
                  <span className="font-medium">{e.attendance.toLocaleString()} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Door revenue</span>
                  <span className="font-medium">{formatCurrency(e.doorRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bar & food sales</span>
                  <span className="font-medium">{formatCurrency(e.barFoodRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bar spend / person</span>
                  <span className="font-medium text-outpost-black">{formatCurrency(e.revenuePerHead)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
