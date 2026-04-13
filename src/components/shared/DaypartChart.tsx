'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import type { DailySummary } from '@/types'

interface DaypartChartProps {
  summaries: DailySummary[]
  accentColor?: string
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon → Sun

const DAYPART_COLORS: Record<string, string> = {
  'BREAKFAST':          '#F59E0B',
  'LUNCH':              '#3B82F6',
  'DINNER/LATE NIGHT':  '#6366F1',
}
const FALLBACK_COLORS = ['#10B981', '#EC4899', '#F97316', '#14B8A6']

// Human-readable label for daypart names from the POS
function formatDaypartName(name: string): string {
  const map: Record<string, string> = {
    'BREAKFAST':          'Breakfast',
    'LUNCH':              'Lunch / Daytime',
    'DINNER/LATE NIGHT':  'Dinner & Late Night',
  }
  return map[name] ?? name.charAt(0) + name.slice(1).toLowerCase()
}

export default function DaypartChart({ summaries }: DaypartChartProps) {
  const hasDaypartData = summaries.some(s => s.dayparts && s.dayparts.length > 0)

  if (!hasDaypartData) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Revenue by Time of Day</h3>
        <p className="text-xs text-gray-500 mb-4">
          Shows how revenue is split across morning, daytime, and evening periods.
        </p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <RefreshCw size={28} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 font-medium">Re-upload this month to see time-of-day data</p>
          <p className="text-xs text-gray-400 mt-1">
            This feature was added after your initial upload. Delete this month on the Manage page and upload the same files again.
          </p>
        </div>
      </div>
    )
  }

  // Collect all unique daypart names across all summaries
  const allDaypartNames = Array.from(
    new Set(summaries.flatMap(s => (s.dayparts ?? []).map(d => d.name)))
  )

  // Group summaries by day of week, then average each daypart's net revenue
  const dowGroups: Record<number, Record<string, number[]>> = {}
  for (const s of summaries) {
    if (!s.dayparts) continue
    const dow = new Date(s.date + 'T12:00:00').getDay()
    if (!dowGroups[dow]) dowGroups[dow] = {}
    for (const dp of s.dayparts) {
      if (!dowGroups[dow][dp.name]) dowGroups[dow][dp.name] = []
      dowGroups[dow][dp.name].push(dp.net)
    }
  }

  const chartData = DOW_ORDER
    .filter(dow => dowGroups[dow])
    .map(dow => {
      const entry: Record<string, number | string> = { day: DOW_LABELS[dow] }
      for (const name of allDaypartNames) {
        const vals = dowGroups[dow][name] ?? []
        entry[name] = vals.length > 0
          ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          : 0
      }
      return entry
    })

  const fallbackIdx = { count: 0 }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Revenue by Time of Day</h3>
      <p className="text-xs text-gray-500 mb-5">
        Average revenue per period for each day of the week. Helps identify when customers are most active and where staffing should be focused.
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11 }}
            width={40}
          />
          <Tooltip
            formatter={(value, name) =>
              typeof value === 'number'
                ? [`$${value.toLocaleString()}`, formatDaypartName(String(name))]
                : [value, name]
            }
            labelFormatter={label => `${label} — average`}
          />
          <Legend
            formatter={name => formatDaypartName(String(name))}
            wrapperStyle={{ fontSize: 12 }}
          />
          {allDaypartNames.map(name => {
            const color = DAYPART_COLORS[name] ?? FALLBACK_COLORS[fallbackIdx.count++ % FALLBACK_COLORS.length]
            return <Bar key={name} dataKey={name} stackId="a" fill={color} radius={name === allDaypartNames[allDaypartNames.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
