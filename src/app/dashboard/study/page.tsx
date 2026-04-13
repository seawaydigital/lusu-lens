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
import KpiCard from '@/components/shared/KpiCard'
import MonthSelector from '@/components/shared/MonthSelector'
import DataQualityBanner from '@/components/shared/DataQualityBanner'
import DailyTrendChart from '@/components/shared/DailyTrendChart'
import CategoryDonut from '@/components/shared/CategoryDonut'
import TopItemsChart from '@/components/shared/TopItemsChart'
import DowChart from '@/components/shared/DowChart'
import PaymentMethodChart from '@/components/shared/PaymentMethodChart'
import HotColdSplit from '@/components/study/HotColdSplit'
import FoodAttachRate from '@/components/study/FoodAttachRate'
import SizeDistribution from '@/components/study/SizeDistribution'
import SeasonalItemTracker from '@/components/study/SeasonalItemTracker'
import ExportButton from '@/components/shared/ExportButton'
import MissingDataSection from '@/components/shared/MissingDataSection'
import type { UploadRecord, DailySummary, ProductRecord } from '@/types'

function StudyContent() {
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

      const studyUploads = allUploads.filter(u => u.venue === 'study')
      if (studyUploads.length === 0) { setLoading(false); return }

      let year: number, month: number
      if (monthParam) {
        [year, month] = monthParam.split('-').map(Number)
      } else {
        const latest = studyUploads.sort(
          (a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month)
        )[0]
        year = latest.year
        month = latest.month
      }

      const [s, p] = await Promise.all([
        getSummaries('study', year, month),
        getProducts('study', year, month),
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
    return <div className="text-center py-12 text-gray-500">No Study data uploaded yet.</div>
  }

  const hasSummary = summaries.length > 0
  const hasProducts = products.length > 0
  const currentUpload = uploads.find(u => u.venue === 'study' && u.year === selectedYear && u.month === selectedMonth)
  const studyUploads = uploads.filter(u => u.venue === 'study')

  return (
    <div className="space-y-8" id="study-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/lusu-lens/logos/study.png" alt="The Study" width={48} height={48} className="rounded-lg" />
          <h1 className="text-2xl font-bold text-study-black">The Study Coffeehouse</h1>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector uploads={uploads} venue="study" />
          <ExportButton
            containerId="study-dashboard"
            venue="The Study"
            monthYear={selectedMonth > 0 ? new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : ''}
            summaries={summaries}
            products={products}
          />
        </div>
      </div>

      {currentUpload && (
        <DataQualityBanner flags={currentUpload.dataQualityFlags} uploadId={currentUpload.id} />
      )}

      {/* Section: Revenue */}
      <section id="revenue">
        <h2 className="text-lg font-semibold text-study-black mb-4 border-b border-study-gold/30 pb-2">Revenue</h2>
        {hasSummary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="Gross Revenue" value={formatCurrency(calcGrossRevenue(summaries))} accentColor="border-study-gold" />
              <KpiCard label="Net Revenue" value={formatCurrency(calcNetRevenue(summaries))} accentColor="border-study-gold" />
              <KpiCard label="Avg/Day" value={formatCurrency(calcAvgRevenuePerDay(summaries))} accentColor="border-study-gold" />
              <KpiCard label="Transactions" value={calcTotalTransactions(summaries).toLocaleString()} accentColor="border-study-gold" />
              <KpiCard label="ATV" value={`$${calcATV(summaries).toFixed(2)}`} accentColor="border-study-gold" />
              <KpiCard label="Tip Rate" value={formatPercent(calcTipRate(summaries))} accentColor="border-study-gold" />
              <KpiCard label="Discount Rate" value={formatPercent(calcDiscountRate(summaries))} accentColor="border-study-gold" />
            </div>
            <DailyTrendChart summaries={summaries} accentColor="#C4A952" />
          </>
        ) : (
          <MissingDataSection fileType="summary" venue="study" />
        )}
      </section>

      {/* Section: Products */}
      <section id="products">
        <h2 className="text-lg font-semibold text-study-black mb-4 border-b border-study-gold/30 pb-2">Products</h2>
        {hasProducts ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryDonut products={products} />
            <TopItemsChart products={products} accentColor="#C4A952" />
          </div>
        ) : (
          <MissingDataSection fileType="products" venue="study" />
        )}
      </section>

      {/* Section: Patterns */}
      <section id="patterns">
        <h2 className="text-lg font-semibold text-study-black mb-4 border-b border-study-gold/30 pb-2">Patterns</h2>
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
        <h2 className="text-lg font-semibold text-study-black mb-4 border-b border-study-gold/30 pb-2">Payment</h2>
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
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <StudyContent />
    </Suspense>
  )
}
