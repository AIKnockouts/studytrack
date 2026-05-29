import React, { useEffect, useState, useRef } from 'react'
import type { Session, Category } from '../../../shared/types'
import DayColumn from './DayColumn'

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DAY_START_HOUR = 6
const DAY_END_HOUR = 24
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR // 18
const HOUR_HEIGHT = 64 // px per hour
const CONTAINER_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT // 1152px
const TIME_GUTTER_WIDTH = 60 // px

function toDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

interface WeekGridProps {
  weekStart: Date
  sessions: Session[]
  categories: Category[]
}

export default function WeekGrid({ weekStart, sessions, categories }: WeekGridProps) {
  const [now, setNow] = useState(new Date())
  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-color')
    .trim() || '#6366f1'

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = toDateKey(today)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Current time line position
  const nowMinuteOfDay = now.getHours() * 60 + now.getMinutes()
  const dayStartMinutes = DAY_START_HOUR * 60
  const totalDayMinutes = TOTAL_HOURS * 60
  const nowTop = ((nowMinuteOfDay - dayStartMinutes) / totalDayMinutes) * CONTAINER_HEIGHT
  const showNowLine =
    nowMinuteOfDay >= dayStartMinutes && nowMinuteOfDay <= DAY_END_HOUR * 60

  // Check if current week contains today
  const weekDayKeys = days.map(toDateKey)
  const currentWeekHasToday = weekDayKeys.includes(todayKey)

  // Hour labels
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i)

  function formatHourLabel(h: number): string {
    if (h === 0 || h === 24) return '12am'
    if (h === 12) return '12pm'
    if (h < 12) return `${h}am`
    return `${h - 12}pm`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Day header row */}
      <div className="flex flex-shrink-0 border-b border-[#1a1a1a]">
        {/* Gutter spacer */}
        <div style={{ width: TIME_GUTTER_WIDTH, minWidth: TIME_GUTTER_WIDTH }} />
        {/* Day headers */}
        {days.map((day, i) => {
          const isToday = toDateKey(day) === todayKey
          return (
            <div
              key={i}
              className="flex-1 min-w-0 flex flex-col items-center py-2"
              style={{ backgroundColor: isToday ? '#0f0f0f' : '#0a0a0a' }}
            >
              <span className="text-[11px] text-[#888888] uppercase tracking-wider">
                {DAY_ABBREVS[day.getDay()]}
              </span>
              <span
                className={[
                  'text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full',
                  isToday ? 'text-white' : 'text-[#f5f5f5]',
                ].join(' ')}
                style={isToday ? { backgroundColor: accentColor } : {}}
              >
                {day.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid body */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: `${CONTAINER_HEIGHT}px` }}>
          {/* Time gutter */}
          <div
            className="flex-shrink-0 relative"
            style={{ width: TIME_GUTTER_WIDTH, minWidth: TIME_GUTTER_WIDTH }}
          >
            {hours.map((h) => {
              const top = ((h - DAY_START_HOUR) / TOTAL_HOURS) * CONTAINER_HEIGHT
              return (
                <div
                  key={h}
                  className="absolute right-2"
                  style={{ top: top - 8 }}
                >
                  <span className="text-[10px] text-[#444444] select-none">
                    {formatHourLabel(h)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Grid columns */}
          <div className="flex flex-1 min-w-0 relative">
            {/* Hour divider lines (overlay) */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {hours.map((h) => {
                const top = ((h - DAY_START_HOUR) / TOTAL_HOURS) * CONTAINER_HEIGHT
                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-[#1a1a1a]"
                    style={{ top }}
                  />
                )
              })}
              {/* Half-hour lines */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i).map((h) => {
                const top =
                  ((h - DAY_START_HOUR + 0.5) / TOTAL_HOURS) * CONTAINER_HEIGHT
                return (
                  <div
                    key={`half-${h}`}
                    className="absolute left-0 right-0 border-t border-[#111111]"
                    style={{ top }}
                  />
                )
              })}

              {/* Current time indicator */}
              {showNowLine && currentWeekHasToday && (
                <div
                  className="absolute left-0 right-0 flex items-center z-20"
                  style={{ top: nowTop }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div
                    className="flex-1 h-px"
                    style={{ backgroundColor: accentColor }}
                  />
                </div>
              )}
            </div>

            {/* Vertical column separators + day columns */}
            {days.map((day, i) => (
              <div key={i} className="flex-1 min-w-0 border-l border-[#1a1a1a] relative">
                <DayColumn
                  date={day}
                  sessions={sessions}
                  categories={categories}
                  dayStartHour={DAY_START_HOUR}
                  dayEndHour={DAY_END_HOUR}
                  containerHeight={CONTAINER_HEIGHT}
                  isToday={toDateKey(day) === todayKey}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
