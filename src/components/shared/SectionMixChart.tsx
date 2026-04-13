'use client'

import { RefreshCw } from 'lucide-react'
import type { DailySummary } from '@/types'
import { formatCurrency } from '@/lib/metrics/sharedMetrics'

interface SectionMixChartProps {
  summaries: DailySummary[]
  venue: 'study' | 'outpost'
}

// Sections we want to hide from the breakdown because they aren't meaningful
// revenue categories on their own (e.g. door revenue is covered separately,
// add-ons are modifiers rather than menu sections)
const EXCLUDED_SECTIONS = new Set([
  'ADD ONS',
  'OTHER REVENUE',   // door/cover — tracked separately in DoorRevenueTracker
  'NON-ALC BEVERAGES',
])

// Colour palette — enough for up to ~10 distinct sections
const SECTION_COLORS = [
  '#0ea5e9', // sky blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#84cc16', // lime
  '#ef4444', // red
]

// Aggregate section revenue across all summaries and return sorted by net desc
function aggregateSections(summaries: DailySummary[]) {
  const totals = new Map<string, { net: number; qty: number }>()

  for (const s of summaries) {
    if (!s.sections) continue
    for (const sec of s.sections) {
      if (EXCLUDED_SECTIONS.has(sec.name.toUpperCase())) continue
      const existing = totals.get(sec.name) ?? { net: 0, qty: 0 }
      totals.set(sec.name, {
        net: existing.net + sec.net,
        qty: existing.qty + sec.qty,
      })
    }
  }

  return Array.from(totals.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.net - a.net)
}

// Make section names readable for non-technical staff
function formatSectionName(name: string): string {
  const map: Record<string, string> = {
    'COFFEE':                'Coffee Drinks',
    'TEA & HOT BEVERAGES':   'Tea & Hot Drinks',
    'SANDWICHES & SALADS':   'Sandwiches & Salads',
    'PASTRIES':              'Pastries & Baked Goods',
    'SNACKS & QUICK BITES':  'Snacks',
    'OTHER BEVERAGES':       'Other Drinks',
    'BEER BOTTLES/CANS':     'Beer (Bottles & Cans)',
    'DRAFT':                 'Draft Beer',
    'CIDER & SELTZERS':      'Cider & Seltzers',
    'COCKTAILS':             'Cocktails',
    'LIQUOR':                'Spirits & Shooters',
    'SHOOTERS':              'Shooters',
    'SPECIALS':              'Drink Specials',
    'POPULAR':               'Popular Items',
    'HANDHELDS':             'Burgers & Wraps',
    'GREENS & BOWLS':        'Salads & Bowls',
    'SMALL BITES':           'Small Bites & Appetizers',
  }
  return map[name] ?? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

export default function SectionMixChart({ summaries, venue }: SectionMixChartProps) {
  const hasSectionData = summaries.some(s => s.sections && s.sections.length > 0)

  if (!hasSectionData) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Menu Category Breakdown</h3>
        <p className="text-xs text-gray-500 mb-4">
          Shows which menu categories are driving the most revenue.
        </p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <RefreshCw size={28} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 font-medium">Re-upload this month to see category data</p>
          <p className="text-xs text-gray-400 mt-1">
            This feature was added after your initial upload. Delete this month on the Manage page and upload the same files again.
          </p>
        </div>
      </div>
    )
  }

  const sections = aggregateSections(summaries)
  const grandTotal = sections.reduce((sum, s) => sum + s.net, 0)

  if (sections.length === 0) return null

  const accentColor = venue === 'study' ? '#C4A952' : '#0D0D0D'

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Menu Category Breakdown</h3>
      <p className="text-xs text-gray-500 mb-5">
        Revenue contribution from each menu category. The bar length shows what percentage of total sales came from that section.
      </p>

      <div className="space-y-2.5">
        {sections.map((sec, i) => {
          const pct = grandTotal > 0 ? (sec.net / grandTotal) * 100 : 0
          const color = SECTION_COLORS[i % SECTION_COLORS.length]
          return (
            <div key={sec.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-gray-700">{formatSectionName(sec.name)}</span>
                <span className="text-gray-500 font-mono">
                  {formatCurrency(sec.net)}
                  <span className="text-gray-400 ml-1.5">({pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs font-semibold"
        style={{ color: accentColor }}
      >
        <span>Total across all categories</span>
        <span>{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  )
}
