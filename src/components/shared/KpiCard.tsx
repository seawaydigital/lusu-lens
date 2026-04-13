import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react'

// Maps the `accentColor` prop (a border class) to a top-border class.
// We only support the 4 venue/global accent values used in the app.
const TOP_BORDER: Record<string, string> = {
  'border-study-gold':   'border-t-study-gold',
  'border-outpost-black':'border-t-outpost-black',
  'border-lusu-cyan':    'border-t-lusu-cyan',
  'border-lusu-navy':    'border-t-lusu-navy',
}

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
      ? 'text-emerald-600'
      : trend.direction === 'down'
        ? 'text-red-500'
        : 'text-gray-400'
    : ''

  const topBorder = TOP_BORDER[accentColor] ?? 'border-t-lusu-cyan'

  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-card ring-1 ring-black/[0.06] hover:shadow-card-hover transition-all duration-150 border-t-2 ${topBorder}`}
    >
      {/* Label row */}
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-gray-400 flex items-center gap-1.5">
        {label}
        {hint && (
          <span className="group relative cursor-help shrink-0">
            <HelpCircle
              size={12}
              className="text-gray-300 hover:text-gray-400 transition-colors"
            />
            <span className="invisible group-hover:visible absolute z-50 bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2.5 leading-relaxed shadow-xl normal-case tracking-normal font-normal whitespace-normal pointer-events-none">
              {hint}
            </span>
          </span>
        )}
      </p>

      {/* Primary value */}
      <p className="text-[28px] font-bold text-gray-900 mt-2 leading-none tracking-tight tabular-nums">
        {value}
      </p>

      {/* Sub-value */}
      {subValue && (
        <p className="text-xs text-gray-400 font-medium mt-1.5">{subValue}</p>
      )}

      {/* Trend */}
      {trend && TrendIcon && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
          <TrendIcon size={13} />
          <span>{trend.value}</span>
        </div>
      )}

      {/* Flag */}
      {flag && (
        <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded-md">
          {flag}
        </p>
      )}
    </div>
  )
}
