'use client'

import { FileSpreadsheet, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface MissingDataSectionProps {
  fileType: 'summary' | 'products'
  venue: 'study' | 'outpost'
}

const FILE_INFO = {
  summary: {
    label: 'Monthly Summary Sales file',
    filename: '"Summary Sales" .xlsx',
    provides: [
      'Daily gross & net revenue',
      'Transaction counts',
      'Tips, discounts & auto-pricing',
      'Payment method breakdown',
    ],
    sections: 'Revenue metrics, trends, and payment analysis',
  },
  products: {
    label: 'Product Sales file',
    filename: '"Product Sales" .xlsx',
    provides: [
      'Individual item sales by date',
      'Category & size breakdown',
      'Top-selling items',
      'Alcohol, food & specialty splits',
    ],
    sections: 'Product breakdown, category analysis, and menu insights',
  },
}

export default function MissingDataSection({ fileType, venue }: MissingDataSectionProps) {
  const info = FILE_INFO[fileType]

  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
      <FileSpreadsheet size={36} className="mx-auto text-gray-300 mb-3" />
      <p className="font-semibold text-gray-700 mb-1">
        {info.label} not uploaded
      </p>
      <p className="text-sm text-gray-500 mb-4">
        {info.sections} require this file.
      </p>
      <div className="inline-flex flex-col items-start bg-white border border-gray-200 rounded-lg px-4 py-3 text-left mb-5 text-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          This file provides
        </p>
        <ul className="space-y-1">
          {info.provides.map(item => (
            <li key={item} className="text-gray-600 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-lusu-cyan shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-3">
          Look for a file named like: <span className="font-mono text-gray-500">{info.filename}</span>
        </p>
      </div>
      <div>
        <Link
          href={`/?venue=${venue}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-lusu-cyan text-white rounded-lg text-sm font-medium hover:bg-lusu-cyan/90"
        >
          Upload missing file
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
