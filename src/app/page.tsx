'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { detectFileType, extractMonthYear } from '@/lib/parsers/fileDetector'
import { parseProductFile } from '@/lib/parsers/productParser'
import { parseSummaryFile } from '@/lib/parsers/summaryParser'
import {
  initDB,
  saveProducts,
  saveSummaries,
  saveUpload,
  getUpload,
  getUploads,
  deleteUploadData,
} from '@/lib/db'
import type { DetectedFile, UploadRecord, DataQualityFlag } from '@/types'
import Link from 'next/link'

interface FileStatus {
  file: File
  status: 'detected' | 'error' | 'parsing' | 'done'
  label: string
  detected?: DetectedFile
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [processing, setProcessing] = useState(false)
  const [uploads, setUploads] = useState<UploadRecord[]>([])

  useEffect(() => {
    initDB().then(() => getUploads().then(setUploads))
  }, [])

  const processDroppedFiles = useCallback((droppedFiles: File[]) => {
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.file.name + f.file.size))
      const newFiles = droppedFiles.filter(
        f => !existingNames.has(f.name + f.size)
      )
      const statuses: FileStatus[] = newFiles.map(file => {
        const detected = detectFileType(file.name)
        const monthYear = extractMonthYear(file.name)

        if (!detected || !monthYear) {
          return { file, status: 'error' as const, label: `Unrecognised file: ${file.name}` }
        }

        const monthName = new Date(monthYear.year, monthYear.month - 1).toLocaleString(
          'default', { month: 'long' }
        )
        const venueLabel = detected.venue === 'study' ? 'Study' : 'Outpost'
        const typeLabel = detected.type === 'products' ? 'Product Sales' : 'Summary'

        return {
          file,
          status: 'detected' as const,
          label: `Detected: ${venueLabel} ${typeLabel} — ${monthName} ${monthYear.year}`,
          detected: { ...detected, ...monthYear, file },
        }
      })
      return [...prev, ...statuses]
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.xlsx')
    )
    processDroppedFiles(droppedFiles)
  }, [processDroppedFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(
        f => f.name.endsWith('.xlsx')
      )
      processDroppedFiles(selected)
    }
  }, [processDroppedFiles])

  async function handleProcess() {
    setProcessing(true)
    try {
      const detectedFiles = files.filter(f => f.status === 'detected' && f.detected)

      // Group by month+venue
      const groups = new Map<string, DetectedFile[]>()
      for (const f of detectedFiles) {
        const d = f.detected!
        const key = `${d.venue}_${d.year}_${d.month}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(d)
      }

      for (const [uploadId, groupFiles] of Array.from(groups.entries())) {
        const existing = await getUpload(uploadId)
        if (existing) {
          const [venue, yearStr, monthStr] = uploadId.split('_')
          await deleteUploadData(
            venue as 'study' | 'outpost',
            parseInt(yearStr),
            parseInt(monthStr)
          )
        }

        const first = groupFiles[0]
        const flags: DataQualityFlag[] = []
        let operatingDayCount = 0
        const fileTypes: Array<'products' | 'summary'> = []

        for (const df of groupFiles) {
          setFiles(prev =>
            prev.map(f =>
              f.detected === df ? { ...f, status: 'parsing' as const } : f
            )
          )

          const buffer = await df.file.arrayBuffer()

          if (df.type === 'products') {
            const records = parseProductFile(buffer, df.venue)
            await saveProducts(records)
            fileTypes.push('products')

            const giftCards = records.filter(
              r => r.category.toLowerCase() === 'gift cards'
            )
            if (giftCards.length > 0) {
              const total = giftCards.reduce((sum, r) => sum + r.gross, 0)
              flags.push({
                type: 'gift_card_present',
                message: `$${total.toFixed(2)} in gift card sales detected.`,
                severity: 'info',
              })
            }

            const divergent = records.filter(
              r => Math.abs(r.gross - r.net) > 1.0
            )
            if (divergent.length > 0) {
              flags.push({
                type: 'net_gross_divergence',
                message: `${divergent.length} product rows have item-level discounts applied (Net and Gross differ by >$1). Gross is used as the revenue figure throughout.`,
                severity: 'info',
              })
            }
          } else {
            const summaries = parseSummaryFile(buffer, df.venue)
            await saveSummaries(summaries)
            fileTypes.push('summary')
            operatingDayCount = summaries.length
          }

          setFiles(prev =>
            prev.map(f =>
              f.detected === df ? { ...f, status: 'done' as const } : f
            )
          )
        }

        // Check incomplete month
        if (operatingDayCount > 0) {
          const daysInMonth = new Date(first.year, first.month, 0).getDate()
          let expectedWeekdays = 0
          for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(first.year, first.month - 1, d).getDay()
            if (day !== 0 && day !== 6) expectedWeekdays++
          }
          if (operatingDayCount < expectedWeekdays - 3) {
            const monthStr = new Date(first.year, first.month - 1).toLocaleString(
              'default', { month: 'long' }
            )
            flags.push({
              type: 'incomplete_month',
              message: `Warning: only ${operatingDayCount} operating days found. Expected approximately ${expectedWeekdays} for ${monthStr} ${first.year}. Revenue totals may be understated.`,
              severity: 'warning',
            })
          }
        }

        await saveUpload({
          id: uploadId,
          venue: first.venue,
          year: first.year,
          month: first.month,
          uploadedAt: new Date().toISOString(),
          fileTypes,
          operatingDayCount,
          dataQualityFlags: flags,
        })
      }

      const updated = await getUploads()
      setUploads(updated)
    } catch (err) {
      console.error('Upload processing failed:', err)
    } finally {
      setProcessing(false)
    }
  }

  const hasDetectedFiles = files.some(f => f.status === 'detected')

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-lusu-navy">
          LUSU <span className="text-lusu-cyan">Lens</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Upload your monthly POS export files to get started
        </p>
      </div>

      {/* File type explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-lusu-navy">
          <p className="font-semibold text-lusu-navy text-sm mb-1">Monthly Summary Sales</p>
          <p className="text-xs text-gray-500 mb-2">Required for revenue metrics</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-lusu-navy shrink-0" />Daily gross & net sales, transactions</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-lusu-navy shrink-0" />Tips, discounts, payment methods</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-lusu-navy shrink-0" />Event day analysis, trends</li>
          </ul>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-lusu-cyan">
          <p className="font-semibold text-lusu-navy text-sm mb-1">Product Sales</p>
          <p className="text-xs text-gray-500 mb-2">Required for product breakdown</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-lusu-cyan shrink-0" />Item-level sales by category & size</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-lusu-cyan shrink-0" />Top items, alcohol/food split</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-lusu-cyan shrink-0" />Draft vs packaged, catering, wings</li>
          </ul>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-lusu-navy/30 rounded-xl p-12 text-center hover:border-lusu-cyan transition-colors cursor-pointer bg-white"
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <Upload size={48} className="mx-auto text-lusu-navy/40 mb-4" />
        <p className="text-lg font-medium text-lusu-navy">
          Drag and drop .xlsx files here
        </p>
        <p className="text-sm text-gray-500 mt-1">Drop both files together for a complete month — or upload one at a time</p>
        <input
          id="fileInput"
          type="file"
          multiple
          accept=".xlsx"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* File statuses */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-lusu-navy">Files</h2>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {f.status === 'detected' && (
                <CheckCircle size={18} className="text-green-500 shrink-0" />
              )}
              {f.status === 'error' && (
                <XCircle size={18} className="text-red-500 shrink-0" />
              )}
              {f.status === 'parsing' && (
                <Loader2 size={18} className="text-lusu-cyan animate-spin shrink-0" />
              )}
              {f.status === 'done' && (
                <CheckCircle size={18} className="text-lusu-cyan shrink-0" />
              )}
              <span className={f.status === 'error' ? 'text-red-600' : ''}>
                {f.label}
              </span>
            </div>
          ))}

          <button
            onClick={handleProcess}
            disabled={!hasDetectedFiles || processing}
            className="mt-4 px-6 py-2.5 bg-lusu-cyan text-white font-medium rounded-lg hover:bg-lusu-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {processing && <Loader2 size={16} className="animate-spin" />}
            {processing ? 'Processing...' : 'Process files'}
          </button>
        </div>
      )}

      {/* Upload history */}
      {uploads.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-lusu-navy mb-4">Uploaded months</h2>
          <div className="space-y-2">
            {uploads.map(u => {
              const monthName = new Date(u.year, u.month - 1).toLocaleString(
                'default', { month: 'long' }
              )
              const venueLabel = u.venue === 'study' ? 'The Study' : 'The Outpost'
              return (
                <Link
                  key={u.id}
                  href={`/dashboard/${u.venue}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet
                      size={20}
                      className={
                        u.venue === 'study'
                          ? 'text-study-gold'
                          : 'text-outpost-black'
                      }
                    />
                    <div>
                      <span className="font-medium">
                        {venueLabel} — {monthName} {u.year}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {u.operatingDayCount} days
                        {u.fileTypes.length < 2 && ' (partial)'}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm text-lusu-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                    View dashboard →
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
