import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  subValue?: string
  hint?: string
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
  hint,
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
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        {label}
        {hint && (
          <span className="group relative cursor-help shrink-0">
            <HelpCircle size={13} className="text-gray-300 hover:text-gray-400 transition-colors" />
            <span className="invisible group-hover:visible absolute z-50 bottom-full left-0 mb-1.5 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 leading-relaxed shadow-xl normal-case tracking-normal font-normal whitespace-normal pointer-events-none">
              {hint}
            </span>
          </span>
        )}
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
