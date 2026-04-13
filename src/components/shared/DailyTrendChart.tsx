'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailySummary } from '@/types'
import type { EventDay } from '@/lib/metrics/eventDetector'

interface DailyTrendChartProps {
  summaries: DailySummary[]
  accentColor: string
  eventDays?: EventDay[]
  showRollingAvg?: boolean
}

export default function DailyTrendChart({
  summaries,
  accentColor,
  eventDays = [],
  showRollingAvg = false,
}: DailyTrendChartProps) {
  const eventDates = new Set(eventDays.map(e => e.date))

  const sorted = [...summaries].sort(
    (a, b) => a.date.localeCompare(b.date)
  )

  const data = sorted.map((s, i) => {
    const rollingAvg =
      showRollingAvg && i >= 6
        ? sorted
            .slice(i - 6, i + 1)
            .reduce((sum, d) => sum + d.grossSales, 0) / 7
        : undefined

    return {
      date: new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      fullDate: s.date,
      gross: Math.round(s.grossSales),
      net: Math.round(s.netSales),
      rollingAvg: rollingAvg ? Math.round(rollingAvg) : undefined,
      isEvent: eventDates.has(s.date),
    }
  })

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Daily Revenue Trend
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''}
          />
          <Line
            type="monotone"
            dataKey="gross"
            stroke={accentColor}
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props
              if (payload.isEvent) {
                return (
                  <circle
                    key={payload.fullDate}
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="#E63946"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )
              }
              return (
                <circle
                  key={payload.fullDate}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={accentColor}
                />
              )
            }}
            name="Gross Sales"
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke={accentColor}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            name="Net Sales"
          />
          {showRollingAvg && (
            <Line
              type="monotone"
              dataKey="rollingAvg"
              stroke="#9CA3AF"
              strokeWidth={1.5}
              dot={false}
              name="7-day Avg"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
