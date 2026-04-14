'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { DailySummary } from '@/types'

interface PaymentSummaryProps {
  summaries: DailySummary[]
}

const PAYMENT_COLORS: Record<string, string> = {
  'Cash':                '#4ECDC4',
  'Debit - Interac':     '#1B3A6B',
  'Credit - Visa':       '#00B4E6',
  'Credit - Mastercard': '#C4A952',
  'Other':               '#9CA3AF',
}

const PAYMENT_ORDER = [
  'Debit - Interac',
  'Credit - Visa',
  'Credit - Mastercard',
  'Cash',
  'Other',
]

function normalizeType(type: string): string {
  if (['Credit - Amex', 'House Account', 'Gift Card'].some(m => type.includes(m))) return 'Other'
  return type
}

export default function PaymentSummary({ summaries }: PaymentSummaryProps) {
  const rows = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; tips: number }>()
    for (const s of summaries) {
      for (const t of s.transactions) {
        const key = normalizeType(t.type)
        const prev = map.get(key) ?? { amount: 0, count: 0, tips: 0 }
        map.set(key, {
          amount: prev.amount + t.amount,
          count:  prev.count  + t.count,
          tips:   prev.tips   + t.tip,
        })
      }
    }

    return PAYMENT_ORDER
      .filter(k => {
        const d = map.get(k)
        return d && (d.amount > 0 || d.count > 0)
      })
      .map(k => {
        const d = map.get(k)!
        return {
          type:     k,
          amount:   d.amount,
          count:    d.count,
          tips:     d.tips,
          avgOrder: d.count > 0 ? d.amount / d.count : 0,
          avgTip:   d.count > 0 ? d.tips  / d.count : 0,
          tipRate:  d.amount > 0 ? (d.tips / d.amount) * 100 : 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [summaries])

  const totalAmount  = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows])
  const maxAvgOrder  = useMemo(() => Math.max(...rows.map(r => r.avgOrder), 0), [rows])

  if (rows.length === 0) return null

  return (
    <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] space-y-6">

      {/* ── 1. Payment Mix ── */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-3">
          Payment Mix
        </p>
        <div className="space-y-3">
          {rows.map(r => {
            const pct   = totalAmount > 0 ? (r.amount / totalAmount) * 100 : 0
            const color = PAYMENT_COLORS[r.type] ?? '#9CA3AF'
            return (
              <div key={r.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="font-medium text-gray-700">{r.type}</span>
                  </span>
                  <span className="tabular-nums text-gray-600">
                    {formatCurrency(r.amount)}&nbsp;
                    <span className="text-gray-400">({pct.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* ── 2. Avg Order Value by Tender ── */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-3">
          Avg Order Value by Tender
        </p>
        <div className="space-y-3">
          {rows.map(r => {
            const pct   = maxAvgOrder > 0 ? (r.avgOrder / maxAvgOrder) * 100 : 0
            const color = PAYMENT_COLORS[r.type] ?? '#9CA3AF'
            return (
              <div key={r.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{r.type}</span>
                  <span className="tabular-nums font-semibold text-gray-800">
                    {formatCurrency(r.avgOrder)}
                    <span className="text-gray-400 font-normal text-xs ml-1.5">
                      ({r.count.toLocaleString()} orders)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* ── 3. Tips by Tender ── */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-3">
          Tips by Tender
        </p>
        <div className="space-y-1">
          {rows.map(r => {
            if (r.type === 'Cash') {
              return (
                <div
                  key={r.type}
                  className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-gray-500">Cash</span>
                  <span className="text-gray-400 text-xs italic">Not tracked via POS</span>
                </div>
              )
            }
            return (
              <div
                key={r.type}
                className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0"
              >
                <span className="text-gray-600">{r.type}</span>
                <div className="text-right">
                  <span className="tabular-nums font-semibold text-gray-800">
                    {formatCurrency(r.tips)}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    avg {formatCurrency(r.avgTip)}/order · {r.tipRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
