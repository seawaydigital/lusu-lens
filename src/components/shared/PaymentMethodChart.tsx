'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { DailySummary } from '@/types'

interface PaymentMethodChartProps {
  summaries: DailySummary[]
}

const PAYMENT_COLORS: Record<string, string> = {
  'Cash': '#4ECDC4',
  'Debit - Interac': '#1B3A6B',
  'Credit - Visa': '#00B4E6',
  'Credit - Mastercard': '#C4A952',
  'Other': '#9CA3AF',
}

export default function PaymentMethodChart({ summaries }: PaymentMethodChartProps) {
  const sorted = [...summaries].sort(
    (a, b) => a.date.localeCompare(b.date)
  )

  const data = sorted.map(s => {
    const entry: Record<string, any> = {
      date: new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }

    for (const t of s.transactions) {
      const isMinor = ['Credit - Amex', 'House Account', 'Gift Card'].some(
        m => t.type.includes(m)
      )
      const key = isMinor ? 'Other' : t.type
      entry[key] = (entry[key] || 0) + t.amount
    }
    return entry
  })

  const paymentTypes = ['Cash', 'Debit - Interac', 'Credit - Visa', 'Credit - Mastercard', 'Other']
  const activeTypes = paymentTypes.filter(pt =>
    data.some(d => d[pt] && d[pt] > 0)
  )

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Payment Method Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            formatter={(value) => typeof value === 'number' ? `$${value.toLocaleString()}` : ''}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {activeTypes.map(pt => (
            <Bar
              key={pt}
              dataKey={pt}
              stackId="payment"
              fill={PAYMENT_COLORS[pt] || '#9CA3AF'}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
