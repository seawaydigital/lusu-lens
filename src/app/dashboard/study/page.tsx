'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { initDB, getUploads, getSummaries, getProducts } from '@/lib/db'
import {
  calcGrossRevenue, calcNetRevenue, calcAvgRevenuePerDay,
  calcTotalTransactions, calcATV, calcTipRate, calcDiscountRate,
  formatCurrency, formatPercent,
} from '@/lib/metrics/sharedMetrics'
import { calcFoodAttachRate } from '@/lib/metrics/studyMetrics'
import KpiCard from '@/components/shared/KpiCard'
import MonthSelector from '@/components/shared/MonthSelector'
import DataQualityBanner from '@/components/shared/DataQualityBanner'
import DataQualityBannerGroup from '@/components/shared/DataQualityBannerGroup'
import DailyTrendChart from '@/components/shared/DailyTrendChart'
import CategoryDonut from '@/components/shared/CategoryDonut'
import TopItemsChart from '@/components/shared/TopItemsChart'
import DowChart from '@/components/shared/DowChart'
import PaymentMethodChart from '@/components/shared/PaymentMethodChart'
import DaypartChart from '@/components/shared/DaypartChart'
import SectionMixChart from '@/components/shared/SectionMixChart'
import WeeklyView from '@/components/shared/WeeklyView'
import HotColdSplit from '@/components/study/HotColdSplit'
import FoodAttachRate from '@/components/study/FoodAttachRate'
import SizeDistribution from '@/components/study/SizeDistribution'
import SeasonalItemTracker from '@/components/study/SeasonalItemTracker'
import AutoInsights from '@/components/shared/AutoInsights'
import ExportButton from '@/components/shared/ExportButton'
import MissingDataSection from '@/components/shared/MissingDataSection'
import type { UploadRecord, DailySummary, ProductRecord } from '@/types'

// Plain-language explanations for metrics that may not be obvious to all staff
const HINTS = {
  grossRevenue: 'Total sales before any discounts or adjustments. This is the full "sticker price" of everything sold.',
  netRevenue: 'Revenue after staff discounts and adjustments are removed. This is the actual amount collected from customers.',
  avgDay: 'Average net revenue per day the café was open.',
  transactions: 'Total number of customer orders processed — essentially how many times the till rang.',
  atv: 'Average Transaction Value — the average amount each customer spent per visit. Calculated by dividing total revenue by number of orders.',
  tipRate: 'Tips as a percentage of net revenue. Shows how generously customers are tipping on average through the POS system.',
  discountRate: 'Staff-applied discounts as a percentage of gross sales — includes voids, comps, and any manual price reductions.',
}

function StudyContent() {
  const searchParams = useSearchParams()
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [loading, setLoading] = useState(true)

  const monthsParam = searchParams.get('months')

  useEffect(() => {
    async function load() {
      setLoading(true)
      await initDB()
      const allUploads = await getUploads()
      setUploads(allUploads)

      const studyUploads = allUploads
        .filter(u => u.venue === 'study')
        .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
      if (studyUploads.length === 0) { setLoading(false); return }

      const allKeys = studyUploads.map(u => `${u.year}-${u.month}`)
      const defaultKey = allKeys[0]

      let selectedKeys: string[]
      if (monthsParam) {
        selectedKeys = monthsParam.split(',').filter(k => allKeys.includes(k))
        if (selectedKeys.length === 0) selectedKeys = [defaultKey]
      } else {
        selectedKeys = [defaultKey]
      }

      const results = await Promise.all(
        selectedKeys.map(k => {
          const [y, m] = k.split('-').map(Number)
          return Promise.all([
            getSummaries('study', y, m),
            getProducts('study', y, m),
          ])
        })
      )

      setSummaries(results.flatMap(([s]) => s))
      setProducts(results.flatMap(([, p]) => p))
      setLoading(false)
    }
    load()
  }, [monthsParam])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="spinner" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }
  if (summaries.length === 0 && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-gray-400 text-sm">No Study data uploaded yet.</p>
        <a href="/" className="text-sm font-medium text-lusu-cyan hover:underline">Import your first month →</a>
      </div>
    )
  }

  const hasSummary = summaries.length > 0
  const hasProducts = products.length > 0

  const studyUploads = uploads
    .filter(u => u.venue === 'study')
    .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
  const allKeys = studyUploads.map(u => `${u.year}-${u.month}`)
  const defaultKey = allKeys[0] ?? ''
  const activeKeys = monthsParam
    ? monthsParam.split(',').filter(k => allKeys.includes(k))
    : defaultKey ? [defaultKey] : []
  const selectedUploads = studyUploads.filter(u =>
    activeKeys.includes(`${u.year}-${u.month}`)
  )

  const monthLabel = activeKeys.length === 1
    ? (() => {
        const [y, m] = activeKeys[0].split('-').map(Number)
        return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
      })()
    : activeKeys.length > 1 ? `${activeKeys.length} months` : ''

  return (
    <div className="space-y-10" id="study-dashboard">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="hidden md:block md:w-48" />
        <div className="flex flex-col items-center gap-2">
          <Image
            src="/lusu-lens/logos/study.png"
            alt="The Study"
            width={88}
            height={88}
            className="rounded-xl object-contain"
          />
          <h1 className="text-2xl font-bold text-study-black">The Study Coffeehouse</h1>
        </div>
        <div className="flex items-center justify-center gap-3 md:w-48 md:justify-end">
          <MonthSelector uploads={uploads} venue="study" />
          <ExportButton
            containerId="study-dashboard"
            venue="The Study"
            monthYear={monthLabel}
            summaries={summaries}
            products={products}
          />
        </div>
      </div>

      {selectedUploads.length === 1
        ? <DataQualityBanner flags={selectedUploads[0].dataQualityFlags} uploadId={selectedUploads[0].id} />
        : <DataQualityBannerGroup uploads={selectedUploads} />
      }

      {/* Section: Key Insights */}
      {hasSummary && (
        <section id="insights">
          <div className="section-header">
            <span className="section-label">Key Insights</span>
            <span className="section-rule" />
          </div>
          <AutoInsights summaries={summaries} venue="study" />
        </section>
      )}

      {/* Section: Revenue */}
      <section id="revenue">
        <div className="section-header">
          <span className="section-label">Revenue</span>
          <span className="section-rule" />
        </div>
        {hasSummary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard
                label="Gross Revenue"
                value={formatCurrency(calcGrossRevenue(summaries))}
                hint={HINTS.grossRevenue}
                accentColor="border-study-gold"
              />
              <KpiCard
                label="Net Revenue"
                value={formatCurrency(calcNetRevenue(summaries))}
                hint={HINTS.netRevenue}
                accentColor="border-study-gold"
              />
              <KpiCard
                label="Avg / Day"
                value={formatCurrency(calcAvgRevenuePerDay(summaries))}
                hint={HINTS.avgDay}
                accentColor="border-study-gold"
              />
              <KpiCard
                label="Orders"
                value={calcTotalTransactions(summaries).toLocaleString()}
                hint={HINTS.transactions}
                accentColor="border-study-gold"
              />
              <KpiCard
                label="Avg Order Value"
                value={`$${calcATV(summaries).toFixed(2)}`}
                hint={HINTS.atv}
                accentColor="border-study-gold"
              />
              <KpiCard
                label="Tip Rate"
                value={formatPercent(calcTipRate(summaries))}
                subValue={`$${Math.round(summaries.reduce((s, d) => s + d.tips, 0)).toLocaleString()} collected`}
                hint={HINTS.tipRate}
                accentColor="border-study-gold"
              />
              <KpiCard
                label="Discount Rate"
                value={formatPercent(calcDiscountRate(summaries))}
                subValue={`$${Math.round(summaries.reduce((s, d) => s + Math.abs(d.discounts), 0)).toLocaleString()} given away`}
                hint={HINTS.discountRate}
                accentColor="border-study-gold"
              />
              {hasProducts && (
                <KpiCard
                  label="Food Attach Rate"
                  value={`${calcFoodAttachRate(products).toFixed(1)}%`}
                  hint="Percentage of total sales that came from food items. Higher attach rate means more customers are pairing food with their drinks — a key upsell opportunity."
                  accentColor="border-study-gold"
                />
              )}
            </div>
            <DailyTrendChart summaries={summaries} accentColor="#C4A952" />
          </>
        ) : (
          <MissingDataSection fileType="summary" venue="study" />
        )}
      </section>

      {/* Section: Weekly Patterns */}
      {hasSummary && (
        <section id="weekly">
          <div className="section-header">
            <span className="section-label">Weekly Performance</span>
            <span className="section-rule" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyView summaries={summaries} accentColor="#C4A952" />
            <DaypartChart summaries={summaries} />
          </div>
        </section>
      )}

      {/* Section: Products */}
      <section id="products">
        <div className="section-header">
          <span className="section-label">Products</span>
          <span className="section-rule" />
        </div>
        {hasProducts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryDonut products={products} />
            <TopItemsChart products={products} accentColor="#C4A952" />
          </div>
        ) : (
          <MissingDataSection fileType="products" venue="study" />
        )}
      </section>

      {/* Section: Menu Categories */}
      {hasSummary && (
        <section id="menu-categories">
          <div className="section-header">
            <span className="section-label">Menu Category Breakdown</span>
            <span className="section-rule" />
          </div>
          <SectionMixChart summaries={summaries} venue="study" />
        </section>
      )}

      {/* Section: Patterns */}
      <section id="patterns">
        <div className="section-header">
          <span className="section-label">Patterns</span>
          <span className="section-rule" />
        </div>
        {hasSummary || hasProducts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hasSummary && <DowChart summaries={summaries} accentColor="#C4A952" />}
            {hasProducts && <HotColdSplit products={products} />}
            {hasProducts && <FoodAttachRate products={products} />}
            {hasProducts && <SizeDistribution products={products} />}
            {hasProducts && <SeasonalItemTracker hasMultipleMonths={studyUploads.length >= 2} />}
            {!hasSummary && <MissingDataSection fileType="summary" venue="study" />}
            {!hasProducts && <MissingDataSection fileType="products" venue="study" />}
          </div>
        ) : null}
      </section>

      {/* Section: Payment */}
      <section id="payment">
        <div className="section-header">
          <span className="section-label">Payment</span>
          <span className="section-rule" />
        </div>
        {hasSummary ? (
          <PaymentMethodChart summaries={summaries} />
        ) : (
          <MissingDataSection fileType="summary" venue="study" />
        )}
      </section>
    </div>
  )
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center py-20 gap-3"><div className="spinner" /><p className="text-sm text-gray-400">Loading…</p></div>}>
      <StudyContent />
    </Suspense>
  )
}
