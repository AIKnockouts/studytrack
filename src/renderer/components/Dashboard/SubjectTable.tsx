import React from 'react'
import type { Category } from '../../../shared/types'
import Sparkline from './Sparkline'

export interface PerSubjectStat {
  category: Category
  totalMinutes: number
  totalMinutesAllTime: number
  percentOfTotal: number
  sparklineData: number[]
}

interface SubjectTableProps {
  stats: PerSubjectStat[]
  timeRange: string
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const SubjectTable: React.FC<SubjectTableProps> = ({ stats, timeRange }) => {
  const sorted = [...stats].sort((a, b) => b.totalMinutes - a.totalMinutes)

  if (sorted.length === 0 || sorted.every((s) => s.totalMinutes === 0 && s.totalMinutesAllTime === 0)) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center shadow-sm">
        <p className="text-gray-400 dark:text-gray-500 text-sm">No subjects yet. Start a session to see your stats.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-4 py-3">
                Subject
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-4 py-3 whitespace-nowrap">
                {timeRange}
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-4 py-3 whitespace-nowrap">
                All Time
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-4 py-3">
                %
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-4 py-3">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((stat, idx) => (
              <tr
                key={stat.category.id}
                className={[
                  'transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50',
                  idx !== sorted.length - 1 ? 'border-b border-gray-100 dark:border-gray-700/50' : '',
                ].join(' ')}
              >
                {/* Subject name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Color swatch */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stat.category.color }}
                    />
                    {/* Emoji */}
                    {stat.category.emoji && (
                      <span className="text-base leading-none">{stat.category.emoji}</span>
                    )}
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                      {stat.category.name}
                    </span>
                  </div>
                </td>

                {/* Time in range */}
                <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {stat.totalMinutes > 0 ? formatTime(stat.totalMinutes) : '—'}
                </td>

                {/* All-time total */}
                <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {stat.totalMinutesAllTime > 0 ? formatTime(stat.totalMinutesAllTime) : '—'}
                </td>

                {/* Percent */}
                <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                  {stat.percentOfTotal > 0 ? `${Math.round(stat.percentOfTotal)}%` : '—'}
                </td>

                {/* Sparkline */}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end">
                    <Sparkline
                      data={stat.sparklineData}
                      color={stat.category.color}
                      width={80}
                      height={28}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SubjectTable
