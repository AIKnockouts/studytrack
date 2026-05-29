import React, { useState } from 'react'
import HeatmapCell from './HeatmapCell'
import DayDetailPanel from './DayDetailPanel'
import type { Category } from '../../../shared/types'

export interface HeatmapDay {
  date: string         // YYYY-MM-DD
  totalMinutes: number
  sessionCount: number
  intensity: 0 | 1 | 2 | 3 | 4
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  day: HeatmapDay | null
}

interface HeatmapGridProps {
  data: HeatmapDay[]
  accentColor?: string
  onDayClick?: (d: HeatmapDay) => void
  timeRange?: string
  onTimeRangeChange?: (r: string) => void
  categories?: Category[]
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_ABBREVS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TIME_RANGES = ['3 months', '6 months', '1 year', 'All time']

function formatDateFull(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
  const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()]
  return `${dayName}, ${monthName} ${d.getDate()}, ${d.getFullYear()}`
}

function formatTooltipDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const monthName = MONTH_ABBREVS[d.getMonth()]
  return `${monthName} ${d.getDate()}, ${d.getFullYear()}`
}

function getTodayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const HeatmapGrid: React.FC<HeatmapGridProps> = ({
  data,
  accentColor = '#6366f1',
  onDayClick,
  timeRange,
  onTimeRangeChange,
  categories = [],
}) => {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, day: null })
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null)

  const today = getTodayString()
  const weeks = Math.ceil(data.length / 7)

  // Build 2D grid: grid[col][row]
  const grid: (HeatmapDay | undefined)[][] = []
  for (let col = 0; col < weeks; col++) {
    grid[col] = []
    for (let row = 0; row < 7; row++) {
      grid[col][row] = data[col * 7 + row]
    }
  }

  // Compute month labels per column
  const monthLabels: string[] = Array(weeks).fill('')
  let lastSeenMonth = -1
  for (let col = 0; col < weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const day = grid[col][row]
      if (day) {
        const month = new Date(day.date + 'T00:00:00').getMonth()
        if (month !== lastSeenMonth) {
          monthLabels[col] = MONTH_ABBREVS[month]
          lastSeenMonth = month
        }
        break
      }
    }
  }

  const handleCellClick = (day: HeatmapDay) => {
    setSelectedDay(day)
    onDayClick?.(day)
  }

  const handleMouseEnter = (day: HeatmapDay, e: React.MouseEvent) => {
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, day })
  }

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  const handleClosePanel = () => {
    setSelectedDay(null)
  }

  return (
    <div className="relative select-none">
      {/* Time range buttons */}
      {onTimeRangeChange && (
        <div className="flex gap-1 mb-3">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onTimeRangeChange(r)}
              className={[
                'px-3 py-1 text-xs rounded-md transition-colors',
                timeRange === r
                  ? 'text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ].join(' ')}
              style={timeRange === r ? { backgroundColor: accentColor } : {}}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-[2px] mr-1 pt-5">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="w-[13px] h-[13px] flex items-center justify-center text-[9px] text-gray-400 dark:text-gray-500"
            >
              {/* Show M, W, F only to avoid crowding */}
              {i === 1 || i === 3 || i === 5 ? label : ''}
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {/* Month labels row */}
          <div className="flex gap-[2px] mb-1 h-4">
            {grid.map((_, col) => (
              <div
                key={col}
                className="w-[13px] text-[9px] text-gray-400 dark:text-gray-500 overflow-visible whitespace-nowrap"
              >
                {monthLabels[col]}
              </div>
            ))}
          </div>

          {/* Grid columns */}
          <div className="flex gap-[2px]">
            {grid.map((col, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-[2px]">
                {col.map((day, rowIdx) =>
                  day ? (
                    <HeatmapCell
                      key={day.date}
                      day={day}
                      isToday={day.date === today}
                      accentColor={accentColor}
                      onClick={handleCellClick}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    />
                  ) : (
                    <div key={`empty-${colIdx}-${rowIdx}`} className="w-[13px] h-[13px]" />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.day && (
        <div
          className="fixed z-50 bg-gray-800 text-white text-xs rounded p-2 pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          {tooltip.day.intensity === 0
            ? `No sessions on ${formatTooltipDate(tooltip.day.date)}`
            : `${formatTooltipDate(tooltip.day.date)} · ${tooltip.day.totalMinutes} min · ${tooltip.day.sessionCount} session${tooltip.day.sessionCount !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Day detail panel */}
      <DayDetailPanel
        day={selectedDay}
        categories={categories}
        onClose={handleClosePanel}
      />
    </div>
  )
}

export default HeatmapGrid
