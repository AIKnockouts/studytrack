import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface DonutEntry {
  categoryId: string
  categoryName: string
  color: string
  minutes: number
  percent: number
}

interface DonutChartProps {
  data: DonutEntry[]
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface CustomLabelProps {
  cx: number
  cy: number
  totalMinutes: number
}

const CenterLabel: React.FC<CustomLabelProps> = ({ cx, cy, totalMinutes }) => {
  const timeStr = formatTime(totalMinutes)
  return (
    <>
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-gray-900 dark:fill-gray-100"
        style={{ fontSize: 18, fontWeight: 700, fill: 'currentColor' }}
      >
        {timeStr}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 10, fill: 'rgb(156,163,175)' }}
      >
        total
      </text>
    </>
  )
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: DonutEntry }>
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0].payload
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-xl border border-gray-700">
      <p className="font-semibold mb-1">{entry.categoryName}</p>
      <p>{formatTime(entry.minutes)} · {Math.round(entry.percent)}%</p>
    </div>
  )
}

const renderLegend = (props: { payload?: Array<{ value: string; color: string; payload: DonutEntry }> }) => {
  const { payload } = props
  if (!payload) return null
  return (
    <ul className="flex flex-col gap-1 mt-2 max-h-36 overflow-y-auto pr-1">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="truncate text-gray-700 dark:text-gray-300">{entry.value}</span>
          </span>
          <span className="shrink-0 text-gray-500 dark:text-gray-400">
            {formatTime(entry.payload.minutes)}
          </span>
        </li>
      ))}
    </ul>
  )
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">
        No sessions yet.
      </div>
    )
  }

  const totalMinutes = data.reduce((sum, d) => sum + d.minutes, 0)

  // cx/cy for center label — we render it as a custom label on the Pie
  const CX = 90
  const CY = 90

  return (
    <div className="flex flex-col items-center w-full">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="minutes"
            nameKey="categoryName"
            cx={CX}
            cy={CY}
            innerRadius={52}
            outerRadius={82}
            paddingAngle={data.length > 1 ? 2 : 0}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.categoryId} fill={entry.color} />
            ))}
            {/* Center label rendered via custom label function */}
          </Pie>
          {/* Render center label as an SVG text overlay via a fake Pie with no data */}
          <text
            x={CX}
            y={CY - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 18, fontWeight: 700, fill: 'rgb(17,24,39)' }}
          >
            {formatTime(totalMinutes)}
          </text>
          <text
            x={CX}
            y={CY + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 10, fill: 'rgb(156,163,175)' }}
          >
            total
          </text>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            content={renderLegend as unknown as React.ReactElement}
            layout="vertical"
            align="right"
            verticalAlign="middle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DonutChart
