'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
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
import DailyTrendChart from '@/components/shared/DailyTrendChart'
import CategoryDonut from '@/components/shared/CategoryDonut'
import TopItemsChart from '@/components/shared/TopItemsChart'
import DowChart from '@/components/shared/DowChart'
import PaymentMethodChart from '@/components/shared/PaymentMethodChart'
import EventDayAnalysis from '@/components/outpost/EventDayAnalysis'
import AlcoholFoodSplit from '@/components/outpost/AlcoholFoodSplit'
import DraftVsPackaged from '@/components/outpost/DraftVsPackaged'
import HappyHourImpact from '@/components/outpost/HappyHourImpact'
import FridayWingsTracker from '@/components/outpost/FridayWingsTracker'
import CateringRevenue from '@/components/outpost/CateringRevenue'
import ExportButton from '@/components/shared/ExportButton'
import type { UploadRecord, DailySummary, ProductRecord } from '@/types'

function OutpostContent() {
  const searchParams = useSearchParams()
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(0)
  const [selectedMonth, setSelectedMonth] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const monthParam = searchParams.get('month')

  useEffect(() => {
    async function load() {
      setLoading(true)
      await initDB()
      const allUploads = await getUploads()
      setUploads(allUploads)

      const outpostUploads = allUploads.filter(u => u.venue === 'outpost')
      if (outpostUploads.length === 0) { setLoading(false); return }

      let year: number, month: number
      if (monthParam) {
        [year, month] = monthParam.split('-').map(Number)
      } else {
        const latest = outpostUploads.sort(
          (a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month)
        )[0]
        year = latest.year
        month = latest.month
      }

      const [s, p] = await Promise.all([
        getSummaries('outpost', year, month),
        getProducts('outpost', year, month),
      ])
      setSummaries(s)
      setProducts(p)
      setSelectedYear(year)
      setSelectedMonth(month)
      setLoading(false)
    }
    load()
  }, [monthParam])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>
  if (summaries.length === 0 && products.length === 0) {
    return <div className="text-center py-12 text-gray-500">No Outpost data uploaded yet.</div>
  }

  const eventDays = detectEventDays(summaries)
  const eventDates = new Set(eventDays.map(e => e.date))
  const currentUpload = uploads.find(u => u.venue === 'outpost' && u.year === selectedYear && u.month === selectedMonth)

  return (
    <div className="space-y-8" id="outpost-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/lusu-lens/logos/outpost.png" alt="The Outpost" width={48} height={48} className="rounded-lg" />
          <h1 className="text-2xl font-bold text-outpost-black">The Outpost Campus Pub</h1>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector uploads={uploads} venue="outpost" />
          <ExportButton
            containerId="outpost-dashboard"
            venue="The Outpost"
            monthYear={selectedMonth > 0 ? new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : ''}
            summaries={summaries}
            products={products}
          />
        </div>
      </div>

      {currentUpload && (
        <DataQualityBanner flags={currentUpload.dataQualityFlags} uploadId={currentUpload.id} />
      )}

      {/* SECTION 1: EVENT ANALYSIS — ALWAYS FIRST */}
      <section id="event-analysis">
        <h2 className="text-lg font-semibold mb-4 border-b border-outpost-black/20 pb-2">Event Analysis</h2>
        <EventDayAnalysis summaries={summaries} eventDays={eventDays} />
      </section>

      {/* SECTION 2: Revenue */}
      <section id="revenue">
        <h2 className="text-lg font-semibold mb-4 border-b border-outpost-black/20 pb-2">Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Gross Revenue" value={formatCurrency(calcGrossRevenue(summaries))} accentColor="border-outpost-black" />
          <KpiCard label="Net Revenue" value={formatCurrency(calcNetRevenue(summaries))} accentColor="border-outpost-black" />
          <KpiCard
            label="Avg/Day"
            value={formatCurrency(calcAvgRevenuePerDay(summaries))}
            subValue={`Event-adjusted: ${formatCurrency(calcAvgRevenuePerDay(summaries, eventDates))}`}
            accentColor="border-outpost-black"
          />
          <KpiCard label="Transactions" value={calcTotalTransactions(summaries).toLocaleString()} accentColor="border-outpost-black" />
          <KpiCard label="ATV" value={`$${calcATV(summaries).toFixed(2)}`} accentColor="border-outpost-black" />
          <KpiCard label="Tip Rate" value={formatPercent(calcTipRate(summaries))} accentColor="border-outpost-black" />
          <KpiCard label="Manual Discounts" value={formatPercent(calcDiscountRate(summaries))} accentColor="border-outpost-black" />
          <KpiCard label="Happy Hour Discounts" value={formatPercent(calcAutoPricingRate(summaries))} accentColor="border-outpost-black" />
        </div>
        <DailyTrendChart
          summaries={summaries}
          accentColor="#0D0D0D"
          eventDays={eventDays}
          showRollingAvg
        />
      </section>

      {/* SECTION 3: Products */}
      <section id="products">
        <h2 className="text-lg font-semibold mb-4 border-b border-outpost-black/20 pb-2">Products</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryDonut products={products} excludeGiftCards showCateringDistinct />
          <TopItemsChart products={products} accentColor="#0D0D0D" excludeCategories={['CATERING', 'Gift Cards']} />
        </div>
      </section>

      {/* SECTION 4: Alcohol & Beverage */}
      <section id="alcohol">
        <h2 className="text-lg font-semibold mb-4 border-b border-outpost-black/20 pb-2">Alcohol & Beverage</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DowChart summaries={summaries} accentColor="#0D0D0D" eventDays={eventDays} showEventToggle />
          <AlcoholFoodSplit products={products} />
          <DraftVsPackaged products={products} />
          <HappyHourImpact summaries={summaries} />
        </div>
      </section>

      {/* SECTION 5: Food */}
      <section id="food">
        <h2 className="text-lg font-semibold mb-4 border-b border-outpost-black/20 pb-2">Food</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FridayWingsTracker products={products} />
          <CateringRevenue products={products} />
        </div>
      </section>

      {/* SECTION 6: Payment */}
      <section id="payment">
        <h2 className="text-lg font-semibold mb-4 border-b border-outpost-black/20 pb-2">Payment</h2>
        <PaymentMethodChart summaries={summaries} />
      </section>
    </div>
  )
}

export default function OutpostPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <OutpostContent />
    </Suspense>
  )
}
