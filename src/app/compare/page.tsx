'use client'

import { useEffect, useState } from 'react'
import { initDB, getUploads, getSummaries } from '@/lib/db'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  calcNetRevenue, calcAvgRevenuePerDay, calcTotalTransactions,
  calcATV, calcTipRate, formatCurrency, formatPercent,
} from '@/lib/metrics/sharedMetrics'
import { detectEventDays } from '@/lib/metrics/eventDetector'
import KpiCard from '@/components/shared/KpiCard'
import type { UploadRecord, DailySummary } from '@/types'
import Link from 'next/link'
import { Coffee, Zap, Upload } from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────────────────
const DOW_LABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DOW_INDICES = [1, 2, 3, 4, 5, 6, 0] // Mon=1 … Sun=0

// ─── Helpers ────────────────────────────────────────────────────────────────
function avgByDow(summaries: DailySummary[]): Record<number, number> {
  const groups: Record<number, number[]> = {}
  for (const s of summaries) {
    const d = new Date(s.date + 'T12:00:00').getDay()
    if (!groups[d]) groups[d] = []
    groups[d].push(s.netSales)
  }
  const out: Record<number, number> = {}
  for (const [d, vals] of Object.entries(groups)) {
    out[+d] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  return out
}

function mlabel(u: UploadRecord) {
  return new Date(u.year, u.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })
}

function pct(cur: number, prev: number) {
  return prev > 0 ? ((cur - prev) / prev) * 100 : 0
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface StudyMonth {
  label: string
  netRevenue: number
  avgDaily: number
  transactions: number
  atv: number
  tipRate: number
  operatingDays: number
  dow: Record<number, number>
}

interface OutpostMonth {
  label: string
  netRevenue: number
  eventRevenue: number
  regularRevenue: number
  eventCount: number
  regularAvg: number
  atv: number
  tipRate: number
  operatingDays: number
  regularDays: number
  dow: Record<number, number>
}

// ─── DOW Heatmap ─────────────────────────────────────────────────────────────
function DowHeatmap({
  rows,
  rgbBase,
}: {
  rows: { label: string; dow: Record<number, number> }[]
  rgbBase: string // e.g. "196,169,82"
}) {
  const allVals = rows.flatMap(r => DOW_INDICES.map(d => r.dow[d] ?? 0))
  const max = Math.max(...allVals, 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left section-label pb-3 pr-6 w-16">Month</th>
            {DOW_LABELS.map(d => (
              <th key={d} className="section-label pb-3 px-1 text-center">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, dow }) => (
            <tr key={label}>
              <td className="text-xs text-gray-500 font-medium pr-6 py-1 whitespace-nowrap">{label}</td>
              {DOW_INDICES.map(d => {
                const val = dow[d] ?? 0
                const alpha = val > 0 ? 0.1 + (val / max) * 0.85 : 0
                return (
                  <td key={d} className="px-0.5 py-1">
                    <div
                      className="h-9 rounded-lg flex items-center justify-center font-semibold text-[11px] min-w-[54px] tabular-nums"
                      style={{
                        backgroundColor:
                          val > 0 ? `rgba(${rgbBase},${alpha.toFixed(2)})` : 'transparent',
                        color:
                          alpha > 0.55
                            ? 'white'
                            : val > 0
                            ? `rgba(${rgbBase},1)`
                            : '#D1D5DB',
                        border: val === 0 ? '1px solid #F3F4F6' : 'none',
                      }}
                    >
                      {val > 0 ? `$${(val / 1000).toFixed(1)}k` : '—'}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── KPI Table ───────────────────────────────────────────────────────────────
function KpiTable<T>({
  rows,
  monthly,
}: {
  rows: { label: string; fn: (m: T) => number; fmt: (v: number) => string }[]
  monthly: (T & { label: string })[]
}) {
  return (
    <div className="bg-white rounded-xl shadow-card ring-1 ring-black/[0.06] overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left section-label px-5 py-3">Metric</th>
            {monthly.map(m => (
              <th key={m.label} className="text-right section-label px-5 py-3">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(({ label, fn, fmt }) => (
            <tr key={label} className="hover:bg-gray-50/50">
              <td className="px-5 py-3 font-medium text-gray-700">{label}</td>
              {monthly.map((m, i) => {
                const val  = fn(m)
                const prev = i > 0 ? fn(monthly[i - 1]) : null
                const delta = prev !== null && prev > 0 ? pct(val, prev) : null
                return (
                  <td key={m.label} className="px-5 py-3 text-right">
                    <span className="font-semibold text-gray-900 tabular-nums">{fmt(val)}</span>
                    {delta !== null && (
                      <span
                        className={`ml-1.5 text-[11px] font-medium ${
                          delta > 1
                            ? 'text-emerald-500'
                            : delta < -1
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {delta > 0 ? '+' : ''}
                        {delta.toFixed(0)}%
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Study Tab ───────────────────────────────────────────────────────────────
function StudyTrend({
  data,
}: {
  data: { upload: UploadRecord; summaries: DailySummary[] }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-gray-400 text-sm">No Study data uploaded yet.</p>
        <Link href="/" className="text-sm font-medium text-lusu-cyan hover:underline">
          Import your first month →
        </Link>
      </div>
    )
  }

  const monthly: StudyMonth[] = data.map(({ upload, summaries }) => ({
    label:         mlabel(upload),
    netRevenue:    calcNetRevenue(summaries),
    avgDaily:      calcAvgRevenuePerDay(summaries),
    transactions:  calcTotalTransactions(summaries),
    atv:           calcATV(summaries),
    tipRate:       calcTipRate(summaries),
    operatingDays: summaries.length,
    dow:           avgByDow(summaries),
  }))

  const latest = monthly[monthly.length - 1]
  const prev   = monthly.length >= 2 ? monthly[monthly.length - 2] : null

  const barData = monthly.map(m => ({ month: m.label, 'Avg / Day': Math.round(m.avgDaily) }))
  const heatRows = monthly.map(m => ({ label: m.label, dow: m.dow }))

  return (
    <div className="space-y-10">

      {/* Delta KPIs */}
      <div>
        <div className="section-header">
          <span className="section-label">
            Latest period{prev ? ` — ${latest.label} vs ${prev.label}` : ` — ${latest.label}`}
          </span>
          <span className="section-rule" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: 'Net Revenue',     val: latest.netRevenue,   prevVal: prev?.netRevenue,   fmt: formatCurrency },
            { label: 'Avg / Day',       val: latest.avgDaily,     prevVal: prev?.avgDaily,     fmt: formatCurrency },
            { label: 'Orders',          val: latest.transactions, prevVal: prev?.transactions, fmt: (v: number) => v.toLocaleString() },
            { label: 'Avg Order Value', val: latest.atv,          prevVal: prev?.atv,          fmt: (v: number) => `$${v.toFixed(2)}` },
          ] as { label: string; val: number; prevVal: number | undefined; fmt: (v: number) => string }[]).map(
            ({ label, val, prevVal, fmt }) => {
              const change =
                prevVal !== undefined && prevVal > 0 ? pct(val, prevVal) : null
              return (
                <KpiCard
                  key={label}
                  label={label}
                  value={fmt(val)}
                  trend={
                    change !== null
                      ? {
                          direction: change > 1 ? 'up' : change < -1 ? 'down' : 'neutral',
                          value:
                            change > 1
                              ? `+${change.toFixed(1)}% vs ${prev!.label}`
                              : change < -1
                              ? `${change.toFixed(1)}% vs ${prev!.label}`
                              : `Flat vs ${prev!.label}`,
                        }
                      : undefined
                  }
                  accentColor="border-study-gold"
                />
              )
            }
          )}
        </div>
      </div>

      {/* Monthly average daily revenue */}
      <div>
        <div className="section-header">
          <span className="section-label">Average Daily Revenue by Month</span>
          <span className="section-rule" />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06]">
          <p className="text-xs text-gray-400 mb-4">
            Showing avg daily revenue — not monthly totals — so months with fewer operating days are fairly comparable.
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : ''} />
              <Bar dataKey="Avg / Day" fill="#C4A952" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DOW heatmap */}
      {monthly.length >= 2 && (
        <div>
          <div className="section-header">
            <span className="section-label">Average Revenue by Day of Week</span>
            <span className="section-rule" />
          </div>
          <div className="bg-white rounded-xl p-6 shadow-card ring-1 ring-black/[0.06]">
            <p className="text-xs text-gray-400 mb-5">
              Each cell shows avg revenue for that day of the week in that month. Darker = stronger day.
            </p>
            <DowHeatmap rows={heatRows} rgbBase="196,169,82" />
          </div>
        </div>
      )}

      {/* KPI table */}
      {monthly.length >= 2 && (
        <div>
          <div className="section-header">
            <span className="section-label">All Months — KPI Breakdown</span>
            <span className="section-rule" />
          </div>
          <KpiTable
            monthly={monthly}
            rows={[
              { label: 'Net Revenue',     fn: m => m.netRevenue,    fmt: formatCurrency },
              { label: 'Avg / Day',       fn: m => m.avgDaily,      fmt: formatCurrency },
              { label: 'Orders',          fn: m => m.transactions,  fmt: v => v.toLocaleString() },
              { label: 'Avg Order Value', fn: m => m.atv,           fmt: v => `$${v.toFixed(2)}` },
              { label: 'Tip Rate',        fn: m => m.tipRate,       fmt: formatPercent },
              { label: 'Operating Days',  fn: m => m.operatingDays, fmt: v => v.toString() },
            ]}
          />
        </div>
      )}
    </div>
  )
}

// ─── Outpost Tab ─────────────────────────────────────────────────────────────
function OutpostTrend({
  data,
}: {
  data: { upload: UploadRecord; summaries: DailySummary[] }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-gray-400 text-sm">No Outpost data uploaded yet.</p>
        <Link href="/" className="text-sm font-medium text-lusu-cyan hover:underline">
          Import your first month →
        </Link>
      </div>
    )
  }

  const monthly: OutpostMonth[] = data.map(({ upload, summaries }) => {
    const events         = detectEventDays(summaries)
    const eventDates     = new Set(events.map(e => e.date))
    const eventSums      = summaries.filter(s =>  eventDates.has(s.date))
    const regularSums    = summaries.filter(s => !eventDates.has(s.date))
    const regularRevenue = calcNetRevenue(regularSums)
    const regularDays    = regularSums.length

    return {
      label:          mlabel(upload),
      netRevenue:     calcNetRevenue(summaries),
      eventRevenue:   calcNetRevenue(eventSums),
      regularRevenue,
      eventCount:     events.length,
      regularAvg:     regularDays > 0 ? regularRevenue / regularDays : 0,
      atv:            calcATV(summaries),
      tipRate:        calcTipRate(summaries),
      operatingDays:  summaries.length,
      regularDays,
      // Heatmap uses regular nights only — removes event night skew
      dow: avgByDow(regularDays >= 3 ? regularSums : summaries),
    }
  })

  const latest = monthly[monthly.length - 1]
  const prev   = monthly.length >= 2 ? monthly[monthly.length - 2] : null

  const stackedData = monthly.map(m => ({
    month:            m.label,
    'Regular Nights': Math.round(m.regularRevenue),
    'Event Nights':   Math.round(m.eventRevenue),
  }))

  const baselineData = monthly.map(m => ({
    month: m.label,
    'Regular Avg':    Math.round(m.regularAvg),
  }))

  const heatRows = monthly.map(m => ({ label: m.label, dow: m.dow }))

  return (
    <div className="space-y-10">

      {/* Delta KPIs */}
      <div>
        <div className="section-header">
          <span className="section-label">
            Latest period{prev ? ` — ${latest.label} vs ${prev.label}` : ` — ${latest.label}`}
          </span>
          <span className="section-rule" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: 'Net Revenue',        val: latest.netRevenue,  prevVal: prev?.netRevenue,  fmt: formatCurrency,                 accent: 'border-lusu-navy' },
            { label: 'Regular Night Avg',  val: latest.regularAvg,  prevVal: prev?.regularAvg,  fmt: formatCurrency,                 accent: 'border-lusu-navy' },
            { label: 'Events Run',         val: latest.eventCount,  prevVal: prev?.eventCount,  fmt: (v: number) => v.toString(),    accent: 'border-outpost-red' },
            { label: 'Avg Order Value',    val: latest.atv,         prevVal: prev?.atv,         fmt: (v: number) => `$${v.toFixed(2)}`, accent: 'border-lusu-navy' },
          ] as { label: string; val: number; prevVal: number | undefined; fmt: (v: number) => string; accent: string }[]).map(
            ({ label, val, prevVal, fmt, accent }) => {
              const change =
                prevVal !== undefined && prevVal > 0 ? pct(val, prevVal) : null
              return (
                <KpiCard
                  key={label}
                  label={label}
                  value={fmt(val)}
                  trend={
                    change !== null
                      ? {
                          direction: change > 1 ? 'up' : change < -1 ? 'down' : 'neutral',
                          value:
                            change > 1
                              ? `+${change.toFixed(1)}% vs ${prev!.label}`
                              : change < -1
                              ? `${change.toFixed(1)}% vs ${prev!.label}`
                              : `Flat vs ${prev!.label}`,
                        }
                      : undefined
                  }
                  accentColor={accent}
                />
              )
            }
          )}
        </div>
      </div>

      {/* Stacked bar: event vs regular */}
      <div>
        <div className="section-header">
          <span className="section-label">Revenue Split — Regular vs Events</span>
          <span className="section-rule" />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06]">
          <p className="text-xs text-gray-400 mb-4">
            Event nights are auto-detected (revenue more than 2× the monthly median). This shows how much of each month's total was driven by events vs regular service.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stackedData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : ''} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Regular Nights" stackId="a" fill="#1B3A6B" />
              <Bar dataKey="Event Nights"   stackId="a" fill="#E63946" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regular baseline trend */}
      <div>
        <div className="section-header">
          <span className="section-label">Regular Night Baseline</span>
          <span className="section-rule" />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06]">
          <p className="text-xs text-gray-400 mb-4">
            Average revenue on non-event nights. This is the clearest signal of whether the Outpost's day-to-day business is growing — event revenue can mask a declining baseline.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={baselineData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : ''} />
              <Bar dataKey="Regular Avg" fill="#1B3A6B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DOW heatmap */}
      {monthly.length >= 2 && (
        <div>
          <div className="section-header">
            <span className="section-label">Average Revenue by Day of Week</span>
            <span className="section-rule" />
          </div>
          <div className="bg-white rounded-xl p-6 shadow-card ring-1 ring-black/[0.06]">
            <p className="text-xs text-gray-400 mb-5">
              Event nights excluded — shows regular operating patterns only. Useful for spotting which nights are consistently strong or weak.
            </p>
            <DowHeatmap rows={heatRows} rgbBase="27,58,107" />
          </div>
        </div>
      )}

      {/* KPI table */}
      {monthly.length >= 2 && (
        <div>
          <div className="section-header">
            <span className="section-label">All Months — KPI Breakdown</span>
            <span className="section-rule" />
          </div>
          <KpiTable
            monthly={monthly}
            rows={[
              { label: 'Net Revenue',       fn: m => m.netRevenue,    fmt: formatCurrency },
              { label: 'Regular Night Avg', fn: m => m.regularAvg,    fmt: formatCurrency },
              { label: 'Regular Revenue',   fn: m => m.regularRevenue,fmt: formatCurrency },
              { label: 'Event Revenue',     fn: m => m.eventRevenue,  fmt: formatCurrency },
              { label: 'Events Run',        fn: m => m.eventCount,    fmt: v => v.toString() },
              { label: 'Avg Order Value',   fn: m => m.atv,           fmt: v => `$${v.toFixed(2)}` },
              { label: 'Tip Rate',          fn: m => m.tipRate,       fmt: formatPercent },
              { label: 'Operating Days',    fn: m => m.operatingDays, fmt: v => v.toString() },
            ]}
          />
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [uploads, setUploads]       = useState<UploadRecord[]>([])
  const [studyData,  setStudyData]  = useState<{ upload: UploadRecord; summaries: DailySummary[] }[]>([])
  const [outpostData, setOutpostData] = useState<{ upload: UploadRecord; summaries: DailySummary[] }[]>([])
  const [tab,     setTab]           = useState<'study' | 'outpost'>('study')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      await initDB()
      const all = await getUploads()
      setUploads(all)

      const studyUploads  = all.filter(u => u.venue === 'study' ).sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))
      const outpostUploads = all.filter(u => u.venue === 'outpost').sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))

      const [studyRes, outpostRes] = await Promise.all([
        Promise.all(studyUploads.map(async u => ({ upload: u, summaries: await getSummaries(u.venue, u.year, u.month) }))),
        Promise.all(outpostUploads.map(async u => ({ upload: u, summaries: await getSummaries(u.venue, u.year, u.month) }))),
      ])

      setStudyData(studyRes)
      setOutpostData(outpostRes)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="spinner" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <p className="text-gray-400 text-sm">No data uploaded yet.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2 bg-lusu-navy text-white text-sm font-semibold rounded-lg hover:bg-lusu-navy/90 transition-colors"
        >
          <Upload size={14} />
          Import files
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Trend Analysis</h1>
          <p className="text-xs text-gray-400 mt-0.5">Revenue patterns and month-over-month performance</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setTab('study')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'study'
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/[0.06]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Coffee size={13} />
            The Study
          </button>
          <button
            onClick={() => setTab('outpost')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'outpost'
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/[0.06]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap size={13} />
            The Outpost
          </button>
        </div>
      </div>

      {tab === 'study'
        ? <StudyTrend   data={studyData} />
        : <OutpostTrend data={outpostData} />
      }

    </div>
  )
}
