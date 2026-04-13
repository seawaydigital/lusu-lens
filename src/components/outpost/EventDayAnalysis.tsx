'use client'

import { Zap } from 'lucide-react'
import type { DailySummary } from '@/types'
import type { EventDay } from '@/lib/metrics/eventDetector'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'

interface EventDayAnalysisProps {
  summaries: DailySummary[]
  eventDays: EventDay[]
}

export default function EventDayAnalysis({
  summaries,
  eventDays,
}: EventDayAnalysisProps) {
  const eventDates = new Set(eventDays.map(e => e.date))
  const totalGross = summaries.reduce((sum, s) => sum + s.grossSales, 0)
  const eventRevenue = eventDays.reduce((sum, e) => sum + e.grossRevenue, 0)
  const eventPct = totalGross > 0 ? (eventRevenue / totalGross) * 100 : 0

  const regularNights = summaries.filter(s => !eventDates.has(s.date))
  const regularAvg = regularNights.length > 0
    ? regularNights.reduce((sum, s) => sum + s.grossSales, 0) / regularNights.length
    : 0
  const regularMin = regularNights.length > 0
    ? Math.min(...regularNights.map(s => s.grossSales))
    : 0
  const regularMax = regularNights.length > 0
    ? Math.max(...regularNights.map(s => s.grossSales))
    : 0
  const regularTxnAvg = regularNights.length > 0
    ? regularNights.reduce((sum, s) => sum + s.totalTransactions, 0) / regularNights.length
    : 0

  if (eventDays.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-gray-300">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={18} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Event Day Analysis</h3>
        </div>
        <p className="text-sm text-gray-500">No event days detected this month.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-outpost-red">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-outpost-red" />
        <h3 className="text-sm font-semibold text-gray-700">Event Day Analysis</h3>
      </div>

      {/* Event days list */}
      <div className="space-y-2 mb-6">
        {eventDays.map(e => (
          <div key={e.date} className="flex items-center justify-between bg-outpost-red/5 rounded-lg px-4 py-2">
            <span className="text-sm font-medium">
              {new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </span>
            <span className="text-sm font-bold text-outpost-red">
              {formatCurrency(e.grossRevenue)}
            </span>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Event revenue</p>
          <p className="font-bold">{formatCurrency(eventRevenue)} ({eventPct.toFixed(1)}%)</p>
        </div>
        <div>
          <p className="text-gray-500">Regular-night avg</p>
          <p className="font-bold">{formatCurrency(regularAvg)}</p>
        </div>
        <div>
          <p className="text-gray-500">Regular-night range</p>
          <p className="font-bold">{formatCurrency(regularMin)} – {formatCurrency(regularMax)}</p>
        </div>
        <div>
          <p className="text-gray-500">Regular-night avg transactions</p>
          <p className="font-bold">{Math.round(regularTxnAvg)}</p>
        </div>
      </div>
    </div>
  )
}
