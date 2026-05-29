import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Category } from '../../../shared/types'

interface StackedBarChartProps {
  data: Array<{ date: string } & Record<string, number | string>>
  categories: Category[]
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[d.getMonth()]} ${d.getDate()}`
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null

  const nonZero = payload.filter((p) => p.value > 0)
  if (nonZero.length === 0) return null

  const total = nonZero.reduce((sum, p) => sum + p.value, 0)

  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl border border-gray-700 min-w-[130px]">
      <p className="font-semibold mb-2 text-gray-300">{label}</p>
      {nonZero.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium">{formatMinutes(entry.value)}</span>
        </div>
      ))}
      {nonZero.length > 1 && (
        <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-gray-700">
          <span className="text-gray-400">Total</span>
          <span className="font-semibold">{formatMinutes(total)}</span>
        </div>
      )}
    </div>
  )
}

const StackedBarChart: React.FC<StackedBarChartProps> = ({ data, categories }) => {
  // Only render categories that have at least one non-zero entry in the data
  const activeCategories = categories.filter((cat) =>
    data.some((entry) => (entry[cat.id] as number) > 0)
  )

  if (data.length === 0 || activeCategories.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">
        No sessions in this period.
      </div>
    )
  }

  const formattedData = data.map((entry) => ({
    ...entry,
    _label: formatShortDate(entry.date),
  }))

  // Show every nth label to avoid crowding
  const tickEvery = data.length <= 7 ? 1 : data.length <= 14 ? 2 : 3

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={formattedData}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        barSize={data.length <= 7 ? 20 : 14}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" vertical={false} />
        <XAxis
          dataKey="_label"
          tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }}
          tickLine={false}
          axisLine={false}
          interval={tickEvery - 1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v >= 60 ? `${Math.floor(v / 60)}h` : `${v}m`)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(156,163,175,0.08)' }} />
        {activeCategories.map((cat) => (
          <Bar
            key={cat.id}
            dataKey={cat.id}
            name={cat.name}
            stackId="a"
            fill={cat.color}
            radius={[0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default StackedBarChart
