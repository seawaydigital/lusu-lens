'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { UploadRecord } from '@/types'

interface MonthSelectorProps {
  uploads: UploadRecord[]
  venue?: 'study' | 'outpost' | 'all'
}

export default function MonthSelector({ uploads, venue = 'all' }: MonthSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filtered = venue === 'all'
    ? uploads
    : uploads.filter(u => u.venue === venue)

  const months = Array.from(
    new Map(
      filtered.map(u => [`${u.year}-${u.month}`, u])
    ).values()
  ).sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))

  const selectedKey = searchParams.get('month') || (months[0] ? `${months[0].year}-${months[0].month}` : '')

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  if (months.length === 0) return null

  return (
    <select
      value={selectedKey}
      onChange={e => handleChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-lusu-cyan focus:border-lusu-cyan"
    >
      {months.map(u => {
        const monthName = new Date(u.year, u.month - 1).toLocaleString(
          'default', { month: 'long' }
        )
        return (
          <option key={`${u.year}-${u.month}`} value={`${u.year}-${u.month}`}>
            {monthName} {u.year}
          </option>
        )
      })}
    </select>
  )
}
