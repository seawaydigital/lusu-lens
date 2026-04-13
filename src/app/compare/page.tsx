'use client'

import { useEffect, useState } from 'react'
import { initDB, getUploads, getSummaries } from '@/lib/db'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  calcNetRevenue, calcTotalTransactions, calcATV, calcTipRate,
  formatCurrency, formatPercent,
} from '@/lib/metrics/sharedMetrics'
import type { UploadRecord, DailySummary } from '@/types'
import Link from 'next/link'
import { Upload } from 'lucide-react'

const LINE_COLORS = ['#1B3A6B', '#00B4E6', '#C4A952', '#E63946', '#4ECDC4']

export default function ComparePage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [venue, setVenue] = useState<'study' | 'outpost'>('study')
  const [monthData, setMonthData] = useState<Map<string, DailySummary[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initDB().then(() => getUploads().then(u => {
      setUploads(u)
      setLoading(false)
    }))
  }, [])

  const venueUploads = uploads.filter(u => u.venue === venue)
  const hasEnoughData = venueUploads.length >= 2

  useEffect(() => {
    if (!hasEnoughData) return
    async function loadAll() {
      const data = new Map<string, DailySummary[]>()
      for (const u of venueUploads) {
        const key = `${new Date(u.year, u.month - 1).toLocaleString('default', { month: 'short' })} ${u.year}`
        const summaries = await getSummaries(u.venue, u.year, u.month)
        data.set(key, summaries)
      }
      setMonthData(data)
    }
    loadAll()
  }, [hasEnoughData, venue])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  if (!hasEnoughData) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-gray-500 mb-4">
          Month-over-month comparison requires at least two months of uploaded data.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-lusu-cyan text-white rounded-lg font-medium hover:bg-lusu-cyan/90"
        >
          <Upload size={18} />
          Upload files
        </Link>
      </div>
    )
  }

  const months = Array.from(monthData.keys())
  const maxDays = Math.max(...Array.from(monthData.values()).map(s => s.length))
  const chartData: Record<string, number | null>[] = []
  for (let day = 1; day <= maxDays; day++) {
    const point: Record<string, number | null> = { day }
    for (const [label, summaries] of Array.from(monthData.entries())) {
      const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date))
      point[label] = sorted[day - 1]?.grossSales ?? null
    }
    chartData.push(point)
  }

  const monthEntries = Array.from(monthData.entries()).sort(
    (a, b) => (a[1][0]?.date ?? '').localeCompare(b[1][0]?.date ?? '')
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lusu-navy">Month-over-Month</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setVenue('study')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              venue === 'study' ? 'bg-study-gold text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            The Study
          </button>
          <button
            onClick={() => setVenue('outpost')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              venue === 'outpost' ? 'bg-outpost-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            The Outpost
          </button>
        </div>
      </div>

      {/* Trend lines */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Revenue by Month</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: 'Day of month', position: 'insideBottom', offset: -5 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : 'N/A'} />
            <Legend />
            {months.map((label, i) => (
              <Line
                key={label}
                type="monotone"
                dataKey={label}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* KPI delta table */}
      {monthEntries.length >= 2 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">KPI Comparison</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Metric</th>
                {monthEntries.map(([label]) => (
                  <th key={label} className="text-right py-2">{label}</th>
                ))}
                <th className="text-right py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Net Revenue', fn: calcNetRevenue, fmt: formatCurrency },
                { label: 'Transactions', fn: calcTotalTransactions, fmt: (v: number) => v.toLocaleString() },
                { label: 'ATV', fn: calcATV, fmt: (v: number) => `$${v.toFixed(2)}` },
                { label: 'Tip Rate', fn: calcTipRate, fmt: formatPercent },
              ].map(({ label, fn, fmt }) => {
                const values = monthEntries.map(([, s]) => fn(s))
                const last = values[values.length - 1]
                const prev = values[values.length - 2]
                const change = prev > 0 ? ((last - prev) / prev) * 100 : 0

                return (
                  <tr key={label} className="border-b">
                    <td className="py-2 font-medium">{label}</td>
                    {values.map((v, i) => (
                      <td key={i} className="text-right py-2">{fmt(v)}</td>
                    ))}
                    <td className={`text-right py-2 font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : ''}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
