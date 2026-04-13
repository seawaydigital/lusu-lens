'use client'

import { useState, useEffect } from 'react'
import { Info, AlertTriangle, X } from 'lucide-react'
import type { DataQualityFlag } from '@/types'

interface DataQualityBannerProps {
  flags: DataQualityFlag[]
  uploadId: string
}

export default function DataQualityBanner({ flags, uploadId }: DataQualityBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = new Set<string>()
    for (const flag of flags) {
      const key = `lusu_lens_dismissed_${uploadId}_${flag.type}`
      if (localStorage.getItem(key) === 'true') {
        stored.add(flag.type)
      }
    }
    setDismissed(stored)
  }, [flags, uploadId])

  function handleDismiss(flagType: string) {
    const key = `lusu_lens_dismissed_${uploadId}_${flagType}`
    localStorage.setItem(key, 'true')
    setDismissed(prev => new Set(Array.from(prev).concat(flagType)))
  }

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
          {flag.severity === 'warning' ? (
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          ) : (
            <Info size={16} className="shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{flag.message}</span>
          <button
            onClick={() => handleDismiss(flag.type)}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
