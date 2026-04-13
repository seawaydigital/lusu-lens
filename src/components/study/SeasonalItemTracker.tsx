'use client'

import { Calendar } from 'lucide-react'

interface SeasonalItemTrackerProps {
  hasMultipleMonths: boolean
  newItems?: Array<{ item: string; revenue: number }>
  removedItems?: Array<{ item: string; lastRevenue: number }>
}

export default function SeasonalItemTracker({
  hasMultipleMonths,
  newItems = [],
  removedItems = [],
}: SeasonalItemTrackerProps) {
  if (!hasMultipleMonths) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm text-center text-gray-400">
        <Calendar size={24} className="mx-auto mb-2" />
        <p className="text-sm">
          Seasonal item tracking is available once you've uploaded multiple months.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Seasonal &amp; Promotional Items
      </h3>
      {newItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-green-600 uppercase mb-2">New this month</p>
          {newItems.map(item => (
            <div key={item.item} className="flex justify-between text-sm py-1">
              <span>{item.item}</span>
              <span className="font-medium">${item.revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {removedItems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-600 uppercase mb-2">No longer available</p>
          {removedItems.map(item => (
            <div key={item.item} className="flex justify-between text-sm py-1 text-gray-500">
              <span>{item.item}</span>
              <span>was ${item.lastRevenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
