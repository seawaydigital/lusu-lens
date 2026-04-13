'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { initDB, getUploads, getSummaries } from '@/lib/db'
import {
  calcNetRevenue, calcAvgRevenuePerDay,
  calcTotalTransactions, calcATV, calcTipRate, formatCurrency,
  formatPercent,
} from '@/lib/metrics/sharedMetrics'
import { detectEventDays } from '@/lib/metrics/eventDetector'
import KpiCard from '@/components/shared/KpiCard'
import MonthSelector from '@/components/shared/MonthSelector'
import DailyTrendChart from '@/components/shared/DailyTrendChart'
import type { UploadRecord, DailySummary } from '@/types'

function OverviewContent() {
  const searchParams = useSearchParams()
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [studySummaries, setStudySummaries] = useState<DailySummary[]>([])
  const [outpostSummaries, setOutpostSummaries] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(true)

  const monthsParam = searchParams.get('months')

  useEffect(() => {
    async function load() {
      setLoading(true)
      await initDB()
      const allUploads = await getUploads()
      setUploads(allUploads)

      if (allUploads.length === 0) { setLoading(false); return }

      const allKeys = Array.from(
        new Set(allUploads.map(u => `${u.year}-${u.month}`))
      ).sort((a, b) => {
        const [ay, am] = a.split('-').map(Number)
        const [by, bm] = b.split('-').map(Number)
        return (by * 100 + bm) - (ay * 100 + am)
      })
      const defaultKey = allKeys[0]

      let selectedKeys: string[]
      if (monthsParam) {
        selectedKeys = monthsParam.split(',').filter(k => allKeys.includes(k))
        if (selectedKeys.length === 0) selectedKeys = [defaultKey]
      } else {
        selectedKeys = [defaultKey]
      }

      const studyUploads = allUploads.filter(u => u.venue === 'study')
      const outpostUploads = allUploads.filter(u => u.venue === 'outpost')

      const studyKeys = selectedKeys.filter(k =>
        studyUploads.some(u => `${u.year}-${u.month}` === k)
      )
      const outpostKeys = selectedKeys.filter(k =>
        outpostUploads.some(u => `${u.year}-${u.month}` === k)
      )

      const [studyResults, outpostResults] = await Promise.all([
        Promise.all(studyKeys.map(k => {
          const [y, m] = k.split('-').map(Number)
          return getSummaries('study', y, m)
        })),
        Promise.all(outpostKeys.map(k => {
          const [y, m] = k.split('-').map(Number)
          return getSummaries('outpost', y, m)
        })),
      ])

      setStudySummaries(studyResults.flat())
      setOutpostSummaries(outpostResults.flat())
      setLoading(false)
    }
    load()
  }, [monthsParam])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  if (uploads.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data uploaded yet.</p>
        <a href="/" className="text-lusu-cyan hover:underline mt-2 inline-block">
          Upload files →
        </a>
      </div>
    )
  }

  const studyNet = calcNetRevenue(studySummaries)
  const outpostNet = calcNetRevenue(outpostSummaries)
  const combinedNet = studyNet + outpostNet

  const eventDays = detectEventDays(outpostSummaries)
  const eventDates = new Set(eventDays.map(e => e.date))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lusu-navy">Overview</h1>
        <MonthSelector uploads={uploads} />
      </div>

      {/* Hero metric */}
      <div className="bg-lusu-navy rounded-xl p-8 text-white text-center">
        <p className="text-sm uppercase tracking-wide text-lusu-cyan">
          Combined LUSU Revenue
        </p>
        <p className="text-4xl font-bold mt-2">{formatCurrency(combinedNet)}</p>
        <p className="text-sm text-gray-300 mt-2">
          Study {formatCurrency(studyNet)} ({combinedNet !== 0 ? ((studyNet / combinedNet) * 100).toFixed(0) : '—'}%)
          {' · '}
          Outpost {formatCurrency(outpostNet)} ({combinedNet !== 0 ? ((outpostNet / combinedNet) * 100).toFixed(0) : '—'}%)
        </p>
      </div>

      {/* KPI cards — two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Study column */}
        <div className="space-y-4">
          <h2 className="font-semibold text-study-black">The Study</h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Net Revenue" value={formatCurrency(studyNet)} accentColor="border-study-gold" />
            <KpiCard label="Transactions" value={calcTotalTransactions(studySummaries).toLocaleString()} accentColor="border-study-gold" />
            <KpiCard label="Avg/Day" value={formatCurrency(calcAvgRevenuePerDay(studySummaries))} accentColor="border-study-gold" />
            <KpiCard label="ATV" value={`$${calcATV(studySummaries).toFixed(2)}`} accentColor="border-study-gold" />
            <KpiCard label="Tip Rate" value={formatPercent(calcTipRate(studySummaries))} accentColor="border-study-gold" />
          </div>
        </div>

        {/* Outpost column */}
        <div className="space-y-4">
          <h2 className="font-semibold text-outpost-black">The Outpost</h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Net Revenue" value={formatCurrency(outpostNet)} accentColor="border-outpost-black" />
            <KpiCard label="Transactions" value={calcTotalTransactions(outpostSummaries).toLocaleString()} accentColor="border-outpost-black" />
            <KpiCard
              label="Avg/Day"
              value={formatCurrency(calcAvgRevenuePerDay(outpostSummaries))}
              subValue={`Event-adjusted: ${formatCurrency(calcAvgRevenuePerDay(outpostSummaries, eventDates))}`}
              accentColor="border-outpost-black"
            />
            <KpiCard label="ATV" value={`$${calcATV(outpostSummaries).toFixed(2)}`} accentColor="border-outpost-black" />
            <KpiCard label="Tip Rate" value={formatPercent(calcTipRate(outpostSummaries))} accentColor="border-outpost-black" />
          </div>
        </div>
      </div>

      {/* Side-by-side trend charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DailyTrendChart summaries={studySummaries} accentColor="#C4A952" />
        <DailyTrendChart
          summaries={outpostSummaries}
          accentColor="#0D0D0D"
          eventDays={eventDays}
          showRollingAvg
        />
      </div>
    </div>
  )
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <OverviewContent />
    </Suspense>
  )
}
