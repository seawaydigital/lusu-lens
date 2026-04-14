'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { initDB, getUploads, getSummaries, getProducts } from '@/lib/db'
import {
  calcGrossRevenue, calcNetRevenue, calcAvgRevenuePerDay,
  calcTotalTransactions, calcATV, calcTipRate, calcDiscountRate,
  calcAutoPricingRate, formatCurrency, formatPercent,
} from '@/lib/metrics/sharedMetrics'
import { detectEventDays } from '@/lib/metrics/eventDetector'
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
import EventDayAnalysis from '@/components/outpost/EventDayAnalysis'
import AlcoholFoodSplit from '@/components/outpost/AlcoholFoodSplit'
import DraftVsPackaged from '@/components/outpost/DraftVsPackaged'
import HappyHourImpact from '@/components/outpost/HappyHourImpact'
import FridayWingsTracker from '@/components/outpost/FridayWingsTracker'
import CateringRevenue from '@/components/outpost/CateringRevenue'
import DoorRevenueTracker from '@/components/outpost/DoorRevenueTracker'
import AlcoholCategoryTrend from '@/components/outpost/AlcoholCategoryTrend'
import OutpostFoodAttach from '@/components/outpost/OutpostFoodAttach'
import MenuAbcAnalysis from '@/components/shared/MenuAbcAnalysis'
import AutoInsights from '@/components/shared/AutoInsights'
import ExportButton from '@/components/shared/ExportButton'
import MissingDataSection from '@/components/shared/MissingDataSection'
import type { UploadRecord, DailySummary, ProductRecord } from '@/types'

// Plain-language explanations for metrics that may not be obvious to all staff
const HINTS = {
  grossRevenue: 'Total sales before any discounts or adjustments. This is the full "sticker price" of everything sold.',
  netRevenue: 'Revenue after discounts and adjustments are removed. This is the actual amount collected from customers.',
  avgDay: 'Average net revenue per operating day. The "Event-adjusted" figure removes high-revenue event nights so you can see what a typical regular night looks like.',
  transactions: 'Total number of customer orders (tabs/tickets) processed. On event nights this includes cover charges.',
  atv: 'Average Transaction Value — the average amount spent per order or tab. On event nights this is skewed upward by cover charges.',
  tipRate: 'Tips as a percentage of net revenue. Cash tips paid directly are not tracked through the POS, so this figure reflects card-tipped amounts only.',
  manualDiscounts: 'Staff-applied discounts as a percentage of gross sales — includes voids, comps, and manually reduced prices.',
  happyHour: 'Automatic Happy Hour price reductions applied by the POS system, shown as a percentage of gross sales.',
}

function OutpostContent() {
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

      const outpostUploads = allUploads
        .filter(u => u.venue === 'outpost')
        .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
      if (outpostUploads.length === 0) { setLoading(false); return }

      const allKeys = outpostUploads.map(u => `${u.year}-${u.month}`)
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
            getSummaries('outpost', y, m),
            getProducts('outpost', y, m),
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
        <p className="text-gray-400 text-sm">No Outpost data uploaded yet.</p>
        <Link href="/" className="text-sm font-medium text-lusu-cyan hover:underline">Import your first month →</Link>
      </div>
    )
  }

  const hasSummary = summaries.length > 0
  const hasProducts = products.length > 0
  const eventDays = hasSummary ? detectEventDays(summaries) : []
  const eventDates = new Set(eventDays.map(e => e.date))

  const outpostUploads = uploads
    .filter(u => u.venue === 'outpost')
    .sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
  const allKeys = outpostUploads.map(u => `${u.year}-${u.month}`)
  const defaultKey = allKeys[0] ?? ''
  const activeKeys = monthsParam
    ? monthsParam.split(',').filter(k => allKeys.includes(k))
    : defaultKey ? [defaultKey] : []
  const selectedUploads = outpostUploads.filter(u =>
    activeKeys.includes(`${u.year}-${u.month}`)
  )

  const monthLabel = activeKeys.length === 1
    ? (() => {
        const [y, m] = activeKeys[0].split('-').map(Number)
        return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
      })()
    : activeKeys.length > 1 ? `${activeKeys.length} months` : ''

  return (
    <div className="space-y-10" id="outpost-dashboard">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="hidden md:block md:w-48" />
        <div className="flex flex-col items-center">
          <Image
            src="/lusu-lens/logos/outpost.png"
            alt="The Outpost"
            width={160}
            height={160}
            className="object-contain"
          />
        </div>
        <div className="flex items-center justify-center gap-3 md:w-48 md:justify-end">
          <MonthSelector uploads={uploads} venue="outpost" />
          <ExportButton
            containerId="outpost-dashboard"
            venue="The Outpost"
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

      {/* SECTION 0: KEY INSIGHTS */}
      {hasSummary && (
        <section id="insights">
          <div className="section-header">
            <span className="section-label">Key Insights</span>
            <span className="section-rule" />
          </div>
          <AutoInsights summaries={summaries} venue="outpost" eventDays={eventDays} />
        </section>
      )}

      {/* SECTION 1: EVENTS */}
      <section id="event-analysis">
        <div className="section-header">
          <span className="section-label">Event Nights</span>
          <span className="section-rule" />
        </div>
        {hasSummary && hasProducts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EventDayAnalysis summaries={summaries} eventDays={eventDays} />
            <DoorRevenueTracker products={products} summaries={summaries} />
          </div>
        ) : hasSummary ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EventDayAnalysis summaries={summaries} eventDays={eventDays} />
            <MissingDataSection fileType="products" venue="outpost" />
          </div>
        ) : (
          <MissingDataSection fileType="summary" venue="outpost" />
        )}
      </section>

      {/* SECTION 2: Revenue */}
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
                accentColor="border-outpost-black"
              />
              <KpiCard
                label="Net Revenue"
                value={formatCurrency(calcNetRevenue(summaries))}
                hint={HINTS.netRevenue}
                accentColor="border-outpost-black"
              />
              <KpiCard
                label="Avg / Day"
                value={formatCurrency(calcAvgRevenuePerDay(summaries))}
                subValue={`Event-adjusted: ${formatCurrency(calcAvgRevenuePerDay(summaries, eventDates))}`}
                hint={HINTS.avgDay}
                accentColor="border-outpost-black"
              />
              <KpiCard
                label="Orders"
                value={calcTotalTransactions(summaries).toLocaleString()}
                hint={HINTS.transactions}
                accentColor="border-outpost-black"
              />
              <KpiCard
                label="Avg Order Value"
                value={`$${calcATV(summaries).toFixed(2)}`}
                hint={HINTS.atv}
                accentColor="border-outpost-black"
              />
              <KpiCard
                label="Tip Rate"
                value={formatPercent(calcTipRate(summaries))}
                subValue={`$${Math.round(summaries.reduce((s, d) => s + d.tips, 0)).toLocaleString()} collected`}
                hint={HINTS.tipRate}
                accentColor="border-outpost-black"
              />
              <KpiCard
                label="Manual Discounts"
                value={formatPercent(calcDiscountRate(summaries))}
                subValue={`$${Math.round(summaries.reduce((s, d) => s + Math.abs(d.discounts), 0)).toLocaleString()} given away`}
                hint={HINTS.manualDiscounts}
                accentColor="border-outpost-black"
              />
              <KpiCard
                label="Happy Hour Discounts"
                value={formatPercent(calcAutoPricingRate(summaries))}
                hint={HINTS.happyHour}
                accentColor="border-outpost-black"
              />
            </div>
            <DailyTrendChart
              summaries={summaries}
              accentColor="#0D0D0D"
              eventDays={eventDays}
              showRollingAvg
            />
          </>
        ) : (
          <MissingDataSection fileType="summary" venue="outpost" />
        )}
      </section>

      {/* SECTION 3: Weekly Patterns */}
      {hasSummary && (
        <section id="weekly">
          <div className="section-header">
            <span className="section-label">Weekly Performance</span>
            <span className="section-rule" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyView summaries={summaries} accentColor="#0D0D0D" />
            <DaypartChart summaries={summaries} />
          </div>
        </section>
      )}

      {/* SECTION 4: Products */}
      <section id="products">
        <div className="section-header">
          <span className="section-label">Products</span>
          <span className="section-rule" />
        </div>
        {hasProducts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryDonut products={products} excludeGiftCards showCateringDistinct />
            <TopItemsChart products={products} accentColor="#0D0D0D" excludeCategories={['CATERING', 'Gift Cards']} />
            <MenuAbcAnalysis products={products} venue="outpost" />
          </div>
        ) : (
          <MissingDataSection fileType="products" venue="outpost" />
        )}
      </section>

      {/* SECTION 5: Menu Categories */}
      {hasSummary && (
        <section id="menu-categories">
          <div className="section-header">
            <span className="section-label">Menu Category Breakdown</span>
            <span className="section-rule" />
          </div>
          <SectionMixChart summaries={summaries} venue="outpost" />
        </section>
      )}

      {/* SECTION 6: Alcohol & Beverage */}
      <section id="alcohol">
        <div className="section-header">
          <span className="section-label">Alcohol & Beverage</span>
          <span className="section-rule" />
        </div>
        {hasSummary || hasProducts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hasSummary && <DowChart summaries={summaries} accentColor="#0D0D0D" eventDays={eventDays} showEventToggle />}
            {hasProducts && <AlcoholFoodSplit products={products} />}
            {hasProducts && <AlcoholCategoryTrend products={products} />}
            {hasProducts && <DraftVsPackaged products={products} />}
            {hasSummary && <HappyHourImpact summaries={summaries} />}
            {!hasSummary && <MissingDataSection fileType="summary" venue="outpost" />}
            {!hasProducts && <MissingDataSection fileType="products" venue="outpost" />}
          </div>
        ) : null}
      </section>

      {/* SECTION 7: Food */}
      <section id="food">
        <div className="section-header">
          <span className="section-label">Food</span>
          <span className="section-rule" />
        </div>
        {hasProducts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OutpostFoodAttach products={products} eventDays={eventDates} />
            <FridayWingsTracker products={products} />
            <CateringRevenue products={products} />
          </div>
        ) : (
          <MissingDataSection fileType="products" venue="outpost" />
        )}
      </section>

      {/* SECTION 8: Payment */}
      <section id="payment">
        <div className="section-header">
          <span className="section-label">Payment</span>
          <span className="section-rule" />
        </div>
        {hasSummary ? (
          <PaymentMethodChart summaries={summaries} />
        ) : (
          <MissingDataSection fileType="summary" venue="outpost" />
        )}
      </section>
    </div>
  )
}

export default function OutpostPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center py-20 gap-3"><div className="spinner" /><p className="text-sm text-gray-400">Loading…</p></div>}>
      <OutpostContent />
    </Suspense>
  )
}
