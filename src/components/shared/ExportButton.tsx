'use client'

import { useState } from 'react'
import { Download, Loader2, ChevronDown } from 'lucide-react'
import { exportPDF } from '@/lib/export/pdfExport'
import { exportExcel } from '@/lib/export/excelExport'
import { exportCSV } from '@/lib/export/csvExport'
import type { DailySummary, ProductRecord } from '@/types'

interface ExportButtonProps {
  containerId: string
  venue: string
  monthYear: string
  summaries: DailySummary[]
  products: ProductRecord[]
}

export default function ExportButton({
  containerId,
  venue,
  monthYear,
  summaries,
  products,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleExport(type: 'pdf' | 'excel' | 'csv') {
    setExporting(true)
    setOpen(false)
    try {
      if (type === 'pdf') await exportPDF(containerId, venue, monthYear)
      else if (type === 'excel') exportExcel(summaries, products, venue, monthYear)
      else exportCSV(summaries, products, venue, monthYear)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-lusu-navy text-white rounded-lg text-sm font-medium hover:bg-lusu-navy/90 disabled:opacity-50"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Export
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-50 min-w-[160px]">
          <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export PDF</button>
          <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export Excel</button>
          <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV (ZIP)</button>
        </div>
      )}
    </div>
  )
}
