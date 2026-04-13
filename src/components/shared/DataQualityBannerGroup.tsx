'use client'

import { useState } from 'react'
import { Info, AlertTriangle, X } from 'lucide-react'
import type { UploadRecord, DataQualityFlag } from '@/types'

interface Props {
  uploads: UploadRecord[]
}

function monthLabel(u: UploadRecord) {
  return new Date(u.year, u.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

interface SummarizedFlag {
  type: string
  severity: 'info' | 'warning'
  message: string
}

function summarize(uploads: UploadRecord[]): SummarizedFlag[] {
  const results: SummarizedFlag[] = []

  // --- incomplete_month ---
  const incomplete = uploads.filter(u =>
    u.dataQualityFlags.some(f => f.type === 'incomplete_month')
  )
  if (incomplete.length > 0) {
    const details = incomplete.map(u => {
      const flag = u.dataQualityFlags.find(f => f.type === 'incomplete_month')!
      const match = flag.message.match(/only (\d+) operating days/)
      const days = match ? match[1] : '?'
      return `${monthLabel(u)} (${days} days)`
    }).join(', ')
    results.push({
      type: 'incomplete_month',
      severity: 'warning',
      message: `Incomplete data in ${incomplete.length} month${incomplete.length > 1 ? 's' : ''}: ${details}. Revenue totals for these months may be understated.`,
    })
  }

  // --- net_gross_divergence ---
  const divergence = uploads.filter(u =>
    u.dataQualityFlags.some(f => f.type === 'net_gross_divergence')
  )
  if (divergence.length > 0) {
    let totalRows = 0
    for (const u of divergence) {
      const flag = u.dataQualityFlags.find(f => f.type === 'net_gross_divergence')!
      const match = flag.message.match(/^(\d+)/)
      if (match) totalRows += parseInt(match[1])
    }
    results.push({
      type: 'net_gross_divergence',
      severity: 'info',
      message: `Item-level discounts detected across ${divergence.length} month${divergence.length > 1 ? 's' : ''} (${totalRows} rows total). Gross is used as the revenue figure throughout.`,
    })
  }

  // --- gift_card_present ---
  const giftCard = uploads.filter(u =>
    u.dataQualityFlags.some(f => f.type === 'gift_card_present')
  )
  if (giftCard.length > 0) {
    let total = 0
    for (const u of giftCard) {
      const flag = u.dataQualityFlags.find(f => f.type === 'gift_card_present')!
      const match = flag.message.match(/\$([\d.]+)/)
      if (match) total += parseFloat(match[1])
    }
    results.push({
      type: 'gift_card_present',
      severity: 'info',
      message: `Gift card sales detected across ${giftCard.length} month${giftCard.length > 1 ? 's' : ''} ($${total.toFixed(2)} total).`,
    })
  }

  return results
}

export default function DataQualityBannerGroup({ uploads }: Props) {
  const flags = summarize(uploads)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = flags.filter(f => !dismissed.has(f.type))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map(flag => (
        <div
          key={flag.type}
          className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
            flag.severity === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {flag.severity === 'warning'
            ? <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            : <Info size={16} className="shrink-0 mt-0.5" />
          }
          <span className="flex-1">{flag.message}</span>
          <button
            onClick={() => setDismissed(prev => new Set(Array.from(prev).concat(flag.type)))}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
