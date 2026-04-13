import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  subValue?: string
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
  }
  flag?: string
  accentColor?: string
}

export default function KpiCard({
  label,
  value,
  subValue,
  trend,
  flag,
  accentColor = 'border-lusu-cyan',
}: KpiCardProps) {
  const TrendIcon = trend
    ? trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
        ? TrendingDown
        : Minus
    : null

  const trendColor = trend
    ? trend.direction === 'up'
      ? 'text-green-600'
      : trend.direction === 'down'
        ? 'text-red-600'
        : 'text-gray-500'
    : ''

  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${accentColor}`}>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subValue && (
        <p className="text-sm text-gray-600 mt-1">{subValue}</p>
      )}
      {trend && TrendIcon && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${trendColor}`}>
          <TrendIcon size={14} />
          <span>{trend.value}</span>
        </div>
      )}
      {flag && (
        <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded">
          {flag}
        </p>
      )}
    </div>
  )
}
