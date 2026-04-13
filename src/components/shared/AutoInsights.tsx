'use client'

import { TrendingUp, Calendar, Users, Tag, Zap, BarChart2, DollarSign, Music } from 'lucide-react'
import type { DailySummary } from '@/types'
import type { EventDay } from '@/lib/metrics/eventDetector'

interface InsightCard {
  icon: React.ReactNode
  value: string
  label: string
  subtext: string
}

interface Props {
  summaries: DailySummary[]
  venue: 'study' | 'outpost'
  eventDays?: EventDay[]
}

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

function buildStudyInsights(summaries: DailySummary[]): InsightCard[] {
  const cards: InsightCard[] = []

  // 1. Best single day
  const bestDay = summaries.reduce(
    (best, s) => s.netSales > best.netSales ? s : best,
    summaries[0]
  )
  if (bestDay) {
    const d = new Date(bestDay.date + 'T12:00:00')
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    cards.push({
      icon: <TrendingUp size={16} strokeWidth={2} />,
      value: fmt(bestDay.netSales),
      label: 'Best Day',
      subtext: `${DOW_NAMES[d.getDay()]} ${label} — highest revenue day this period`,
    })
  }

  // 2. Best day of week
  const dowTotals: Record<number, { sum: number; count: number }> = {}
  for (const s of summaries) {
    const dow = new Date(s.date + 'T12:00:00').getDay()
    if (!dowTotals[dow]) dowTotals[dow] = { sum: 0, count: 0 }
    dowTotals[dow].sum += s.netSales
    dowTotals[dow].count += 1
  }
  const bestDow = Object.entries(dowTotals).reduce(
    (best, [dow, { sum, count }]) => {
      const avg = sum / count
      return avg > best.avg ? { dow: Number(dow), avg } : best
    },
    { dow: -1, avg: -1 }
  )
  if (bestDow.dow >= 0) {
    cards.push({
      icon: <Calendar size={16} strokeWidth={2} />,
      value: DOW_FULL[bestDow.dow],
      label: 'Strongest Day of Week',
      subtext: `Average of ${fmt(bestDow.avg)} per ${DOW_FULL[bestDow.dow]}`,
    })
  }

  // 3. Revenue per customer (if guestCount available) or avg orders/day
  const totalGuests = summaries.reduce((sum, s) => sum + (s.guestCount ?? 0), 0)
  const totalNet    = summaries.reduce((sum, s) => sum + s.netSales, 0)
  if (totalGuests > 0) {
    cards.push({
      icon: <Users size={16} strokeWidth={2} />,
      value: fmt(totalNet / totalGuests),
      label: 'Revenue per Customer',
      subtext: `Based on ${totalGuests.toLocaleString()} customers served`,
    })
  } else {
    const avgOrders = summaries.reduce((sum, s) => sum + s.totalTransactions, 0) / summaries.length
    cards.push({
      icon: <Users size={16} strokeWidth={2} />,
      value: Math.round(avgOrders).toString(),
      label: 'Avg Orders / Day',
      subtext: 'Average number of transactions per operating day',
    })
  }

  // 4. Discount dollars
  const discountDollars = summaries.reduce((sum, s) => sum + Math.abs(s.discounts), 0)
  const gross           = summaries.reduce((sum, s) => sum + s.grossSales, 0)
  const discountPct     = gross > 0 ? (discountDollars / gross) * 100 : 0
  cards.push({
    icon: <Tag size={16} strokeWidth={2} />,
    value: fmt(discountDollars),
    label: 'Discounts Given Away',
    subtext: `${discountPct.toFixed(1)}% of gross — every dollar here is a direct margin cost`,
  })

  return cards
}

function buildOutpostInsights(summaries: DailySummary[], eventDays: EventDay[]): InsightCard[] {
  const cards: InsightCard[] = []
  const eventDateSet   = new Set(eventDays.map(e => e.date))
  const eventSummaries  = summaries.filter(s =>  eventDateSet.has(s.date))
  const regularSummaries = summaries.filter(s => !eventDateSet.has(s.date))
  const totalNet  = summaries.reduce((sum, s) => sum + s.netSales, 0)
  const eventNet  = eventSummaries.reduce((sum, s) => sum + s.netSales, 0)

  // 1. Event dependency
  const eventPct = totalNet > 0 ? (eventNet / totalNet) * 100 : 0
  cards.push({
    icon: <Music size={16} strokeWidth={2} />,
    value: `${eventPct.toFixed(0)}%`,
    label: 'Event-Driven Revenue',
    subtext: `${eventDays.length} event night${eventDays.length !== 1 ? 's' : ''} generated ${fmt(eventNet)} of total revenue`,
  })

  // 2. Regular night baseline
  const regularAvg = regularSummaries.length > 0
    ? regularSummaries.reduce((sum, s) => sum + s.netSales, 0) / regularSummaries.length
    : 0
  cards.push({
    icon: <BarChart2 size={16} strokeWidth={2} />,
    value: fmt(regularAvg),
    label: 'Regular Night Average',
    subtext: `Avg net sales on non-event nights (${regularSummaries.length} nights)`,
  })

  // 3. Total tips
  const totalTips = summaries.reduce((sum, s) => sum + s.tips, 0)
  const tipRate   = totalNet > 0 ? (totalTips / totalNet) * 100 : 0
  cards.push({
    icon: <DollarSign size={16} strokeWidth={2} />,
    value: fmt(totalTips),
    label: 'Tips Collected',
    subtext: `${tipRate.toFixed(1)}% tip rate — card tips only, cash tips not tracked`,
  })

  // 4. Best regular DOW (excludes event nights to avoid skew)
  const baselineSummaries = regularSummaries.length >= 3 ? regularSummaries : summaries
  const dowTotals: Record<number, { sum: number; count: number }> = {}
  for (const s of baselineSummaries) {
    const dow = new Date(s.date + 'T12:00:00').getDay()
    if (!dowTotals[dow]) dowTotals[dow] = { sum: 0, count: 0 }
    dowTotals[dow].sum += s.netSales
    dowTotals[dow].count += 1
  }
  const bestDow = Object.entries(dowTotals).reduce(
    (best, [dow, { sum, count }]) => {
      const avg = sum / count
      return avg > best.avg ? { dow: Number(dow), avg } : best
    },
    { dow: -1, avg: -1 }
  )
  if (bestDow.dow >= 0) {
    cards.push({
      icon: <Zap size={16} strokeWidth={2} />,
      value: DOW_FULL[bestDow.dow],
      label: 'Strongest Regular Night',
      subtext: `Averages ${fmt(bestDow.avg)} on ${DOW_FULL[bestDow.dow]}s (excluding events)`,
    })
  }

  return cards
}

export default function AutoInsights({ summaries, venue, eventDays = [] }: Props) {
  if (summaries.length === 0) return null

  const cards = venue === 'study'
    ? buildStudyInsights(summaries)
    : buildOutpostInsights(summaries, eventDays)

  const isStudy = venue === 'study'
  const iconBg   = isStudy ? 'bg-study-gold/10'   : 'bg-lusu-navy/10'
  const iconText = isStudy ? 'text-study-gold'     : 'text-lusu-navy'
  const topBorder = isStudy ? 'border-t-study-gold' : 'border-t-lusu-navy'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] hover:shadow-card-hover transition-all duration-150 border-t-2 ${topBorder} flex flex-col gap-1.5`}
        >
          {/* Icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg} ${iconText} mb-0.5`}>
            {card.icon}
          </div>

          {/* Value */}
          <p className="text-[22px] font-bold text-gray-900 leading-tight tracking-tight tabular-nums">
            {card.value}
          </p>

          {/* Label */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            {card.label}
          </p>

          {/* Subtext */}
          <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
            {card.subtext}
          </p>
        </div>
      ))}
    </div>
  )
}
