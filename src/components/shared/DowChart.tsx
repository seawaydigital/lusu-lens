'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailySummary } from '@/types'
import type { EventDay } from '@/lib/metrics/eventDetector'

interface DowChartProps {
  summaries: DailySummary[]
  accentColor: string
  eventDays?: EventDay[]
  showEventToggle?: boolean
}

const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DowChart({
  summaries,
  accentColor,
  eventDays = [],
  showEventToggle = false,
}: DowChartProps) {
  const [excludeEvents, setExcludeEvents] = useState(showEventToggle)
  const eventDates = new Set(eventDays.map(e => e.date))

  const filtered = excludeEvents
    ? summaries.filter(s => !eventDates.has(s.date))
    : summaries

  const dowData = new Map<number, { total: number; count: number }>()
  for (const s of filtered) {
    const dow = new Date(s.date + 'T12:00:00').getDay()
    const existing = dowData.get(dow) || { total: 0, count: 0 }
    existing.total += s.netSales
    existing.count += 1
    dowData.set(dow, existing)
  }

  const data = Array.from(dowData.entries())
    .map(([dow, { total, count }]) => ({
      day: DOW_LABELS[dow],
      avg: Math.round(total / count),
      count,
    }))
    .sort((a, b) => DOW_ORDER.indexOf(a.day) - DOW_ORDER.indexOf(b.day))

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Day-of-Week Performance
        </h3>
        {showEventToggle && (
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={excludeEvents}
              onChange={e => setExcludeEvents(e.target.checked)}
              className="rounded border-gray-300"
            />
            Event-adjusted
          </label>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''}
          />
          <Bar dataKey="avg" fill={accentColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
