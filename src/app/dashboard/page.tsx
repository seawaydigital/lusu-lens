'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
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

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="spinner" />
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="section-header">
      <span className="section-label">{label}</span>
      <span className="section-rule" />
    </div>
  )
}

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

      const studyUploads  = allUploads.filter(u => u.venue === 'study')
      const outpostUploads = allUploads.filter(u => u.venue === 'outpost')

      const studyKeys  = selectedKeys.filter(k => studyUploads.some(u  => `${u.year}-${u.month}` === k))
      const outpostKeys = selectedKeys.filter(k => outpostUploads.some(u => `${u.year}-${u.month}` === k))

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

  if (loading) return <LoadingState />

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-gray-400 text-sm">No data uploaded yet.</p>
        <Link href="/" className="text-sm font-medium text-lusu-cyan hover:underline">
          Import your first month →
        </Link>
      </div>
    )
  }

  const studyNet    = calcNetRevenue(studySummaries)
  const outpostNet  = calcNetRevenue(outpostSummaries)
  const combinedNet = studyNet + outpostNet

  const studyPct   = combinedNet > 0 ? ((studyNet   / combinedNet) * 100).toFixed(0) : '—'
  const outpostPct = combinedNet > 0 ? ((outpostNet / combinedNet) * 100).toFixed(0) : '—'

  const eventDays  = detectEventDays(outpostSummaries)
  const eventDates = new Set(eventDays.map(e => e.date))

  return (
    <div className="space-y-10">

      {/* Page title + selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">Combined performance across both venues</p>
        </div>
        <MonthSelector uploads={uploads} />
      </div>

      {/* Hero metric */}
      <div className="relative overflow-hidden rounded-2xl bg-hero-gradient p-8 text-white">
        {/* Decorative radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 85% 10%, rgba(0,180,230,0.15) 0%, transparent 60%)',
          }}
        />
        <div className="relative text-center">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-lusu-cyan/80 mb-4">
            Combined LUSU Net Revenue
          </p>
          <p className="text-5xl font-bold tracking-tight tabular-nums leading-none">
            {formatCurrency(combinedNet)}
          </p>
          <div className="flex items-center justify-center gap-6 mt-5 text-sm">
            <div className="text-center">
              <p className="text-white/90 font-semibold tabular-nums">{formatCurrency(studyNet)}</p>
              <p className="text-white/40 text-xs mt-0.5">The Study ({studyPct}%)</p>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div className="text-center">
              <p className="text-white/90 font-semibold tabular-nums">{formatCurrency(outpostNet)}</p>
              <p className="text-white/40 text-xs mt-0.5">The Outpost ({outpostPct}%)</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs side-by-side */}
      <div>
        <SectionDivider label="Venue KPIs" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Study */}
          <div>
            <p className="text-xs font-semibold text-study-gold uppercase tracking-[0.1em] mb-4">
              The Study Coffeehouse
            </p>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Net Revenue"   value={formatCurrency(studyNet)}                            accentColor="border-study-gold" />
              <KpiCard label="Orders"        value={calcTotalTransactions(studySummaries).toLocaleString()} accentColor="border-study-gold" />
              <KpiCard label="Avg / Day"     value={formatCurrency(calcAvgRevenuePerDay(studySummaries))}   accentColor="border-study-gold" />
              <KpiCard label="Avg Order"     value={`$${calcATV(studySummaries).toFixed(2)}`}              accentColor="border-study-gold" />
              <KpiCard label="Tip Rate"      value={formatPercent(calcTipRate(studySummaries))}            accentColor="border-study-gold" />
            </div>
          </div>

          {/* Outpost */}
          <div>
            <p className="text-xs font-semibold text-lusu-navy uppercase tracking-[0.1em] mb-4">
              The Outpost Campus Pub
            </p>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Net Revenue"   value={formatCurrency(outpostNet)}                             accentColor="border-lusu-navy" />
              <KpiCard label="Orders"        value={calcTotalTransactions(outpostSummaries).toLocaleString()} accentColor="border-lusu-navy" />
              <KpiCard
                label="Avg / Day"
                value={formatCurrency(calcAvgRevenuePerDay(outpostSummaries))}
                subValue={`Event-adjusted: ${formatCurrency(calcAvgRevenuePerDay(outpostSummaries, eventDates))}`}
                accentColor="border-lusu-navy"
              />
              <KpiCard label="Avg Order"  value={`$${calcATV(outpostSummaries).toFixed(2)}`}              accentColor="border-lusu-navy" />
              <KpiCard label="Tip Rate"   value={formatPercent(calcTipRate(outpostSummaries))}            accentColor="border-lusu-navy" />
            </div>
          </div>

        </div>
      </div>

      {/* Trend charts */}
      <div>
        <SectionDivider label="Daily Revenue Trend" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DailyTrendChart summaries={studySummaries}  accentColor="#C4A952" />
          <DailyTrendChart summaries={outpostSummaries} accentColor="#1B3A6B" eventDays={eventDays} showRollingAvg />
        </div>
      </div>

    </div>
  )
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center py-20 gap-3"><div className="spinner" /><p className="text-sm text-gray-400">Loading…</p></div>}>
      <OverviewContent />
    </Suspense>
  )
}
