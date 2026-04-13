import { Zap } from 'lucide-react'

interface EventDayBadgeProps {
  date: string
  grossRevenue: number
  adjustedDelta?: number
}

export default function EventDayBadge({
  date,
  grossRevenue,
  adjustedDelta,
}: EventDayBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-outpost-red/10 text-outpost-red border border-outpost-red/20"
      title={`Event day: $${grossRevenue.toLocaleString()}${
        adjustedDelta
          ? ` (${adjustedDelta > 0 ? '+' : ''}$${adjustedDelta.toLocaleString()} vs regular avg)`
          : ''
      }`}
    >
      <Zap size={10} />
      Event
    </span>
  )
}
