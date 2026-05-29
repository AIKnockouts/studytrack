import React from 'react'
import type { Session } from '../../../shared/types'

const DAY_ABBREVS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function toDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function startOfWeek(d: Date): Date {
  const result = new Date(d)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - result.getDay())
  return result
}

interface MonthMinimapProps {
  currentWeekStart: Date
  sessions: Session[]
  onWeekClick: (weekStart: Date) => void
}

export default function MonthMinimap({
  currentWeekStart,
  sessions,
  onWeekClick,
}: MonthMinimapProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = toDateKey(today)
  const currentWeekStartKey = toDateKey(currentWeekStart)

  // Build session date set for dot indicators
  const sessionDaySet = new Set<string>()
  for (const s of sessions) {
    sessionDaySet.add(toDateKey(new Date(s.started_at)))
  }

  // Figure out which month to show — use the month of the middle of the current week
  const midWeek = addDays(currentWeekStart, 3)
  const displayYear = midWeek.getFullYear()
  const displayMonth = midWeek.getMonth()

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  // First day of the month
  const firstOfMonth = new Date(displayYear, displayMonth, 1)
  // Start grid from Sunday of the week containing the 1st
  const gridStart = startOfWeek(firstOfMonth)

  // Generate 6 weeks (42 days) to always fill the grid
  const gridDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  // Group into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < 6; i++) {
    weeks.push(gridDays.slice(i * 7, i * 7 + 7))
  }

  // Accent color from CSS variable
  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-color')
    .trim() || '#6366f1'

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-lg p-3 w-[196px] flex-shrink-0">
      {/* Month header */}
      <div className="text-[11px] font-semibold text-[#f5f5f5] mb-2 text-center">
        {MONTH_NAMES[displayMonth]} {displayYear}
      </div>

      {/* Day abbreviation headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_ABBREVS.map((d, i) => (
          <div key={i} className="text-[9px] text-[#444444] text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const weekStartKey = toDateKey(week[0])
        const isCurrentWeek = weekStartKey === currentWeekStartKey

        // Only render week rows that contain at least one day in the display month
        const hasMonthDay = week.some(
          (d) => d.getMonth() === displayMonth
        )
        if (!hasMonthDay) return null

        return (
          <div
            key={wi}
            className="grid grid-cols-7 cursor-pointer rounded"
            onClick={() => onWeekClick(week[0])}
            style={isCurrentWeek ? { backgroundColor: '#1a1a1a' } : {}}
          >
            {week.map((day, di) => {
              const dayKey = toDateKey(day)
              const isToday = dayKey === todayKey
              const inMonth = day.getMonth() === displayMonth
              const hasSession = sessionDaySet.has(dayKey)

              return (
                <div key={di} className="flex flex-col items-center py-0.5">
                  <span
                    className={[
                      'text-[10px] w-5 h-5 flex items-center justify-center rounded-full',
                      isToday
                        ? 'text-white font-semibold'
                        : inMonth
                        ? 'text-[#888888]'
                        : 'text-[#333333]',
                    ].join(' ')}
                    style={isToday ? { backgroundColor: accentColor } : {}}
                  >
                    {day.getDate()}
                  </span>
                  {/* Session dot */}
                  <div
                    className="w-1 h-1 rounded-full mt-0.5"
                    style={{
                      backgroundColor: hasSession && inMonth ? accentColor : 'transparent',
                    }}
                  />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
