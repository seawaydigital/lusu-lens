'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import type { UploadRecord } from '@/types'

interface MonthSelectorProps {
  uploads: UploadRecord[]
  venue?: 'study' | 'outpost' | 'all'
}

export default function MonthSelector({ uploads, venue = 'all' }: MonthSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = venue === 'all'
    ? uploads
    : uploads.filter(u => u.venue === venue)

  const months = Array.from(
    new Map(filtered.map(u => [`${u.year}-${u.month}`, u])).values()
  ).sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))

  const defaultKey = months[0] ? `${months[0].year}-${months[0].month}` : ''
  const monthsParam = searchParams.get('months')
  const selectedKeys: string[] = monthsParam
    ? monthsParam.split(',').filter(k => months.some(m => `${m.year}-${m.month}` === k))
    : defaultKey ? [defaultKey] : []

  function push(keys: string[]) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('months', keys.join(','))
    router.push(`${pathname}?${params.toString()}`)
  }

  function toggle(key: string) {
    if (selectedKeys.includes(key)) {
      if (selectedKeys.length === 1) return // keep at least one selected
      push(selectedKeys.filter(k => k !== key))
    } else {
      push([...selectedKeys, key])
    }
  }

  function toggleAll() {
    const allKeys = months.map(m => `${m.year}-${m.month}`)
    const allSelected = allKeys.every(k => selectedKeys.includes(k))
    push(allSelected ? [defaultKey] : allKeys)
  }

  function label(): string {
    if (selectedKeys.length === 0) return 'Select month'
    if (selectedKeys.length === 1) {
      const [y, m] = selectedKeys[0].split('-').map(Number)
      return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    }
    if (selectedKeys.length === months.length) return `All months (${months.length})`
    const sorted = [...selectedKeys].sort()
    const [y0, m0] = sorted[0].split('-').map(Number)
    const [y1, m1] = sorted[sorted.length - 1].split('-').map(Number)
    return `${new Date(y0, m0 - 1).toLocaleString('default', { month: 'short', year: 'numeric' })} – ${new Date(y1, m1 - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}`
  }

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  if (months.length === 0) return null

  const allSelected = months.every(m => selectedKeys.includes(`${m.year}-${m.month}`))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-lusu-cyan focus:outline-none focus:ring-2 focus:ring-lusu-cyan min-w-[180px] justify-between"
      >
        <span className="truncate">{label()}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-2 z-50 min-w-[210px]">
          {months.length > 1 && (
            <>
              <button
                onClick={toggleAll}
                className="w-full text-left px-4 py-1.5 text-sm font-medium text-lusu-cyan hover:bg-gray-50"
              >
                {allSelected ? 'Deselect all' : 'Select all months'}
              </button>
              <div className="border-t my-1.5" />
            </>
          )}
          {months.map(u => {
            const key = `${u.year}-${u.month}`
            const monthLabel = new Date(u.year, u.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
            const checked = selectedKeys.includes(key)
            return (
              <label key={key} className="flex items-center gap-3 px-4 py-1.5 hover:bg-gray-50 cursor-pointer text-sm select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(key)}
                  className="rounded accent-lusu-cyan"
                />
                <span>{monthLabel}</span>
                {u.fileTypes.length < 2 && (
                  <span className="ml-auto text-xs text-gray-400">partial</span>
                )}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
