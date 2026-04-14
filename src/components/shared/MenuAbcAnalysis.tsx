'use client'

import { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { calcMenuEngineering, formatCurrency } from '@/lib/metrics/sharedMetrics'
import type { ProductRecord, MenuEngineeringItem, MenuTier } from '@/types'

const TIER_COLORS: Record<MenuTier, string> = {
  star: '#C4A952',
  plowhorse: '#00B4E6',
  puzzle: '#7C3AED',
  dog: '#9CA3AF',
}

const TIER_LABELS: Record<MenuTier, string> = {
  star: '⭐ Stars',
  plowhorse: '🐴 Plowhorses',
  puzzle: '🧩 Puzzles',
  dog: '🐶 Dogs',
}

const TIER_DESCRIPTIONS: Record<MenuTier, string> = {
  star: 'High volume + high revenue. Keep and promote.',
  plowhorse: 'High volume, low revenue. Review pricing.',
  puzzle: 'Low volume, high revenue. Reposition and promote.',
  dog: 'Low volume, low revenue. Consider removing.',
}

interface MenuAbcAnalysisProps {
  products: ProductRecord[]
  venue: 'study' | 'outpost'
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: MenuEngineeringItem }>
}

function ScatterTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 max-w-[180px] truncate">{item.item}</p>
      <p className="text-gray-400">{item.category}</p>
      <p className="text-gray-700 mt-0.5">{formatCurrency(item.revenue)} · {item.quantity.toLocaleString()} units</p>
      <p className="font-medium mt-0.5" style={{ color: TIER_COLORS[item.tier] }}>{TIER_LABELS[item.tier]}</p>
    </div>
  )
}

export default function MenuAbcAnalysis({ products, venue }: MenuAbcAnalysisProps) {
  const [activeTab, setActiveTab] = useState<MenuTier>('dog')

  const items = calcMenuEngineering(products)

  const topBorder = venue === 'study' ? 'border-t-study-gold' : 'border-t-outpost-black'

  if (items.length === 0) {
    return (
      <div className={`bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 ${topBorder}`}>
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-2">Menu Engineering</p>
        <p className="text-sm text-gray-400">Not enough menu data to classify items.</p>
      </div>
    )
  }

  const sortedQty = items.map(i => i.quantity).sort((a, b) => a - b)
  const sortedRev = items.map(i => i.revenue).sort((a, b) => a - b)
  const midQ = Math.floor(sortedQty.length / 2)
  const midR = Math.floor(sortedRev.length / 2)
  const medianQty = sortedQty.length % 2 === 0
    ? (sortedQty[midQ - 1] + sortedQty[midQ]) / 2 : sortedQty[midQ]
  const medianRev = sortedRev.length % 2 === 0
    ? (sortedRev[midR - 1] + sortedRev[midR]) / 2 : sortedRev[midR]

  const tabs: MenuTier[] = ['star', 'plowhorse', 'puzzle', 'dog']
  const tabItems = items.filter(i => i.tier === activeTab).sort((a, b) => b.revenue - a.revenue)

  return (
    <div className={`bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 ${topBorder} col-span-full`}>
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 mb-4">Menu Engineering</p>

      <div className="flex flex-wrap gap-4 mb-4">
        {tabs.map(tier => (
          <div key={tier} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TIER_COLORS[tier] }} />
            <span>{TIER_LABELS[tier]}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="quantity"
            name="Units Sold"
            tick={{ fontSize: 11 }}
            label={{ value: 'Units Sold', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9CA3AF' }}
          />
          <YAxis
            dataKey="revenue"
            name="Revenue"
            tick={{ fontSize: 11 }}
            tickFormatter={v => typeof v === 'number' ? (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`) : ''}
          />
          <ReferenceLine x={medianQty} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1.5} />
          <ReferenceLine y={medianRev} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1.5} />
          <Tooltip content={<ScatterTooltip />} />
          <Scatter data={items} fillOpacity={0.85}>
            {items.map((item, idx) => (
              <Cell key={idx} fill={TIER_COLORS[item.tier]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-5">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tabs.map(tier => (
            <button
              key={tier}
              onClick={() => setActiveTab(tier)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeTab === tier
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {TIER_LABELS[tier]}{' '}
              <span className={activeTab === tier ? 'opacity-60' : 'opacity-50'}>
                {items.filter(i => i.tier === tier).length}
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 mb-3">{TIER_DESCRIPTIONS[activeTab]}</p>

        {tabItems.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No items in this tier.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 pr-4 text-gray-400 font-medium">Item</th>
                  <th className="text-left py-1.5 pr-4 text-gray-400 font-medium">Category</th>
                  <th className="text-right py-1.5 pr-4 text-gray-400 font-medium">Units</th>
                  <th className="text-right py-1.5 text-gray-400 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tabItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-4 text-gray-900 font-medium max-w-[180px] truncate">{item.item}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{item.category}</td>
                    <td className="py-1.5 pr-4 text-gray-900 text-right tabular-nums">{item.quantity.toLocaleString()}</td>
                    <td className="py-1.5 text-gray-900 text-right tabular-nums">{formatCurrency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
