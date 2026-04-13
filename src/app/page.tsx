'use client'

import { useState, useCallback, useEffect } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, ArrowRight, BookOpen, Package } from 'lucide-react'
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
  const [dragOver, setDragOver] = useState(false)

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
        const typeLabel  = detected.type === 'products' ? 'Product Sales' : 'Summary'

        return {
          file,
          status: 'detected' as const,
          label: `${venueLabel} — ${typeLabel} · ${monthName} ${monthYear.year}`,
          detected: { ...detected, ...monthYear, file },
        }
      })
      return [...prev, ...statuses]
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
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

            const giftCards = records.filter(r => r.category.toLowerCase() === 'gift cards')
            if (giftCards.length > 0) {
              const total = giftCards.reduce((sum, r) => sum + r.gross, 0)
              flags.push({
                type: 'gift_card_present',
                message: `$${total.toFixed(2)} in gift card sales detected.`,
                severity: 'info',
              })
            }

            const divergent = records.filter(r => Math.abs(r.gross - r.net) > 1.0)
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
    <div className="max-w-2xl mx-auto space-y-8 py-4">

      {/* Hero */}
      <div className="text-center space-y-1.5 pt-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Import POS Data
        </h1>
        <p className="text-sm text-gray-500">
          Drop your monthly Excel exports below — the app handles the rest locally, nothing is uploaded to a server.
        </p>
      </div>

      {/* File type explainer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-lusu-navy">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-md bg-lusu-navy/10 flex items-center justify-center shrink-0">
              <BookOpen size={14} className="text-lusu-navy" strokeWidth={2} />
            </div>
            <p className="font-semibold text-gray-800 text-sm">Monthly Summary</p>
          </div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-2.5">Required for revenue metrics</p>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              Daily gross &amp; net sales, transactions
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              Tips, discounts, payment methods
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              Event day analysis, weekly trends
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] border-t-2 border-t-lusu-cyan">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-md bg-lusu-cyan/10 flex items-center justify-center shrink-0">
              <Package size={14} className="text-lusu-cyan" strokeWidth={2} />
            </div>
            <p className="font-semibold text-gray-800 text-sm">Product Sales</p>
          </div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-2.5">Required for product breakdown</p>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              Item-level sales by category &amp; size
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              Top items, alcohol/food split
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              Draft vs packaged, catering, wings
            </li>
          </ul>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-2 border-lusu-cyan bg-lusu-cyan/[0.03] ring-4 ring-lusu-cyan/10'
            : 'border-2 border-dashed border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          dragOver ? 'bg-lusu-cyan/10' : 'bg-gray-100'
        }`}>
          <Upload size={22} className={dragOver ? 'text-lusu-cyan' : 'text-gray-400'} strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {dragOver ? 'Release to add files' : 'Drag and drop .xlsx files here'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Drop both files at once for a complete month, or upload one at a time
          </p>
        </div>
        <p className="text-xs text-lusu-cyan font-medium">or click to browse</p>
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
        <div className="bg-white rounded-xl shadow-card ring-1 ring-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              Files queued
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                {f.status === 'detected' && (
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                )}
                {f.status === 'error' && (
                  <XCircle size={16} className="text-red-400 shrink-0" />
                )}
                {f.status === 'parsing' && (
                  <Loader2 size={16} className="text-lusu-cyan animate-spin shrink-0" />
                )}
                {f.status === 'done' && (
                  <CheckCircle size={16} className="text-lusu-cyan shrink-0" />
                )}
                <span className={f.status === 'error' ? 'text-red-500' : 'text-gray-600'}>
                  {f.label}
                </span>
                {f.status === 'done' && (
                  <span className="ml-auto text-[11px] text-emerald-500 font-medium">Done</span>
                )}
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={handleProcess}
              disabled={!hasDetectedFiles || processing}
              className="flex items-center gap-2 px-5 py-2 bg-lusu-navy text-white text-sm font-semibold rounded-lg hover:bg-lusu-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {processing
                ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                : <>Import files <ArrowRight size={14} /></>
              }
            </button>
          </div>
        </div>
      )}

      {/* Upload history */}
      {uploads.length > 0 && (
        <div className="bg-white rounded-xl shadow-card ring-1 ring-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              Uploaded months
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {uploads.map(u => {
              const monthName = new Date(u.year, u.month - 1).toLocaleString(
                'default', { month: 'long' }
              )
              const venueLabel = u.venue === 'study' ? 'The Study' : 'The Outpost'
              const accentColor = u.venue === 'study' ? 'text-study-gold' : 'text-lusu-navy'
              return (
                <Link
                  key={u.id}
                  href={`/dashboard/${u.venue}`}
                  className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <FileSpreadsheet size={18} className={`shrink-0 ${accentColor}`} strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 block leading-snug">
                      {venueLabel}
                    </span>
                    <span className="text-xs text-gray-400">
                      {monthName} {u.year} · {u.operatingDayCount} days
                      {u.fileTypes.length < 2 && ' · partial data'}
                    </span>
                  </div>
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-gray-300 group-hover:text-lusu-cyan group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
