'use client'

import type { DailySummary } from '@/types'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'

interface WeeklyViewProps {
  summaries: DailySummary[]
  accentColor?: string   // hex colour for the heatmap cells
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// JS getDay(): 0=Sun, 1=Mon...6=Sat → remap to Mon-first index
const JS_DOW_TO_MON_FIRST = [6, 0, 1, 2, 3, 4, 5]

// Returns the ISO date string of the Monday of the week containing `dateStr`
function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const jsDow = d.getDay()           // 0=Sun, 1=Mon...6=Sat
  const daysToMonday = jsDow === 0 ? -6 : 1 - jsDow
  const monday = new Date(d)
  monday.setDate(d.getDate() + daysToMonday)
  return monday.toISOString().split('T')[0]
}

// Short label for a week column header, e.g. "Jan 6"
function weekLabel(mondayIso: string): string {
  return new Date(mondayIso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

export default function WeeklyView({
  summaries,
  accentColor = '#00b8d4',
}: WeeklyViewProps) {
  if (summaries.length === 0) return null

  // Build a date → grossSales map
  const revenueByDate = new Map<string, number>()
  for (const s of summaries) {
    revenueByDate.set(s.date, (revenueByDate.get(s.date) ?? 0) + s.grossSales)
  }

  // Collect sorted unique week starts (Mondays)
  const weekStarts = Array.from(
    new Set(summaries.map(s => getMondayOf(s.date)))
  ).sort()

  // Build the grid: for each (dowIndex 0-6, weekStart) → revenue or null
  // First, build a map from date → revenue
  // Then for each week start + dow, compute the actual date and look up revenue

  const allValues: number[] = Array.from(revenueByDate.values())
  const maxRevenue = allValues.length > 0 ? Math.max(...allValues) : 1

  function getRevenue(weekStart: string, dowIndex: number): number | null {
    const monday = new Date(weekStart + 'T12:00:00')
    const target = new Date(monday)
    target.setDate(monday.getDate() + dowIndex)
    const iso = target.toISOString().split('T')[0]
    return revenueByDate.has(iso) ? revenueByDate.get(iso)! : null
  }

  // Heatmap intensity: 0-1 based on fraction of max revenue
  function cellOpacity(revenue: number): number {
    return 0.1 + 0.9 * (revenue / maxRevenue)
  }

  // Find which rows (days of week) have any data at all
  const activeDowIndexes = DOW_LABELS.map((_, i) => i).filter(dowIndex =>
    weekStarts.some(ws => getRevenue(ws, dowIndex) !== null)
  )

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Week-by-Week Performance</h3>
      <p className="text-xs text-gray-500 mb-5">
        Each cell shows that day's revenue. Darker colour means higher revenue.
        Useful for spotting which weeks were stronger — and whether a slow month was consistently slow, or just had a few bad days.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1.5 pr-3 text-gray-400 font-medium w-10" />
              {weekStarts.map(ws => (
                <th key={ws} className="text-center py-1.5 px-1 text-gray-500 font-medium whitespace-nowrap">
                  Wk of<br />{weekLabel(ws)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeDowIndexes.map(dowIndex => (
              <tr key={dowIndex}>
                <td className="pr-3 py-1 text-gray-500 font-medium whitespace-nowrap">
                  {DOW_LABELS[dowIndex]}
                </td>
                {weekStarts.map(ws => {
                  const rev = getRevenue(ws, dowIndex)
                  return (
                    <td key={ws} className="px-1 py-1">
                      {rev !== null ? (
                        <div
                          className="rounded-md px-1.5 py-2 text-center min-w-[64px]"
                          style={{
                            backgroundColor: accentColor,
                            opacity: cellOpacity(rev),
                          }}
                          title={formatCurrency(rev)}
                        >
                          <span
                            className="font-semibold"
                            style={{
                              color: cellOpacity(rev) > 0.5 ? 'white' : '#374151',
                              opacity: 1 / cellOpacity(rev),   // keep text readable
                            }}
                          >
                            {formatCurrency(rev)}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-md px-1.5 py-2 text-center min-w-[64px] bg-gray-50 text-gray-300">
                          —
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100">
              <td className="pr-3 py-2 text-gray-400 font-semibold">Total</td>
              {weekStarts.map(ws => {
                const weekTotal = activeDowIndexes.reduce((sum, dowIndex) => {
                  const rev = getRevenue(ws, dowIndex)
                  return sum + (rev ?? 0)
                }, 0)
                return (
                  <td key={ws} className="px-1 py-2 text-center font-semibold text-gray-700">
                    {formatCurrency(weekTotal)}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
        <span>Lower</span>
        <div className="flex gap-0.5">
          {[0.15, 0.35, 0.55, 0.75, 0.95].map(o => (
            <div
              key={o}
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: accentColor, opacity: o }}
            />
          ))}
        </div>
        <span>Higher revenue</span>
      </div>
    </div>
  )
}
