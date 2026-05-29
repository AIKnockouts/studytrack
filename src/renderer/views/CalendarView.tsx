import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Session, Category } from '../../shared/types'
import WeekGrid from '../components/Calendar/WeekGrid'
import MonthMinimap from '../components/Calendar/MonthMinimap'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function startOfWeek(d: Date): Date {
  const result = new Date(d)
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - result.getDay())
  return result
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)

  const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  const startStr = `${MONTH_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}`

  if (weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear()) {
    return `${startStr} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
  }

  if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
    return `${startStr}, ${weekStart.getFullYear()} – ${MONTH_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
  }

  return `${startStr} – ${MONTH_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

type ViewMode = 'week' | 'day'

export default function CalendarView() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date())
  )
  const [sessions, setSessions] = useState<Session[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const didScrollRef = useRef(false)

  // ─── Fetch sessions for current week ───────────────────────────────────────

  const fetchSessions = useCallback(async (weekStart: Date) => {
    setIsLoading(true)
    try {
      const startDate = toDateKey(addDays(weekStart, -1))
      const endDate = toDateKey(addDays(weekStart, 7))

      const [sessionsRes, categoriesRes] = await Promise.all([
        window.api.sessions.getAll({ start_date: startDate, end_date: endDate }),
        window.api.categories.getAll(),
      ])

      setSessions(sessionsRes.data ?? [])
      setCategories(categoriesRes.data ?? [])
    } catch {
      // api unavailable — skip
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchSessions(currentWeekStart)
  }, [currentWeekStart, fetchSessions])

  // ─── Scroll to 8am on mount ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && !didScrollRef.current && scrollContainerRef.current) {
      // 8am = 2 hours after day start (6am), each hour = 64px
      // Header row is ~60px, so offset to show some context above 8am
      const HOUR_HEIGHT = 64
      const DAY_START_HOUR = 6
      const scrollTo8am = (8 - DAY_START_HOUR) * HOUR_HEIGHT - 32 // 32px padding above
      scrollContainerRef.current.scrollTop = Math.max(0, scrollTo8am)
      didScrollRef.current = true
    }
  }, [isLoading])

  // ─── Navigation ────────────────────────────────────────────────────────────

  function goToPrev() {
    if (viewMode === 'week') {
      setCurrentWeekStart((prev) => addDays(prev, -7))
    } else {
      setSelectedDay((prev) => {
        const next = addDays(prev, -1)
        setCurrentWeekStart(startOfWeek(next))
        return next
      })
    }
  }

  function goToNext() {
    if (viewMode === 'week') {
      setCurrentWeekStart((prev) => addDays(prev, 7))
    } else {
      setSelectedDay((prev) => {
        const next = addDays(prev, 1)
        setCurrentWeekStart(startOfWeek(next))
        return next
      })
    }
  }

  function goToToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setCurrentWeekStart(startOfWeek(today))
    setSelectedDay(today)
    didScrollRef.current = false
  }

  function handleWeekClick(weekStart: Date) {
    setCurrentWeekStart(weekStart)
    if (viewMode === 'day') {
      setSelectedDay(weekStart)
    }
  }

  // For day view, filter sessions to just the selected day
  const gridSessions =
    viewMode === 'day'
      ? sessions.filter(
          (s) => toDateKey(new Date(s.started_at)) === toDateKey(selectedDay)
        )
      : sessions

  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-color')
    .trim() || '#6366f1'

  const headerLabel =
    viewMode === 'week'
      ? formatWeekRange(currentWeekStart)
      : (() => {
          const MONTH_NAMES = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
          ]
          const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          return `${DAY_NAMES[selectedDay.getDay()]}, ${MONTH_NAMES[selectedDay.getMonth()]} ${selectedDay.getDate()}, ${selectedDay.getFullYear()}`
        })()

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] gap-4">
        {/* Left: nav buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPrev}
            className="px-2.5 py-1.5 text-sm text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            ‹ Prev
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] rounded-lg border border-[#222222] transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="px-2.5 py-1.5 text-sm text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            Next ›
          </button>
        </div>

        {/* Center: date range label */}
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-[#f5f5f5]">{headerLabel}</span>
        </div>

        {/* Right: view toggle + minimap */}
        <div className="flex items-center gap-3">
          {/* Week/Day toggle */}
          <div className="flex gap-0.5 p-1 bg-[#111111] border border-[#222222] rounded-lg">
            {(['week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode)
                  if (mode === 'day' && toDateKey(selectedDay) < toDateKey(currentWeekStart)) {
                    setSelectedDay(currentWeekStart)
                  }
                }}
                className={[
                  'px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors',
                  viewMode === mode
                    ? 'text-white'
                    : 'text-[#888888] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]',
                ].join(' ')}
                style={viewMode === mode ? { backgroundColor: accentColor } : {}}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body: Grid + Minimap ──────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Main scrollable grid */}
        <div ref={scrollContainerRef} className="flex-1 min-w-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-[#444444] text-sm">Loading…</span>
            </div>
          ) : viewMode === 'week' ? (
            <WeekGrid
              weekStart={currentWeekStart}
              sessions={sessions}
              categories={categories}
            />
          ) : (
            // Day view: single column using WeekGrid with 1 day
            <DaySingleView
              day={selectedDay}
              sessions={gridSessions}
              categories={categories}
            />
          )}
        </div>

        {/* Minimap sidebar */}
        <div className="flex-shrink-0 border-l border-[#1a1a1a] p-3">
          <MonthMinimap
            currentWeekStart={currentWeekStart}
            sessions={sessions}
            onWeekClick={handleWeekClick}
          />
        </div>
      </div>
    </div>
  )
}

// ─── DaySingleView ─────────────────────────────────────────────────────────────
// Renders a single-day view using WeekGrid restricted to one day.

interface DaySingleViewProps {
  day: Date
  sessions: Session[]
  categories: Category[]
}

function DaySingleView({ day, sessions, categories }: DaySingleViewProps) {
  // For day view we show the full 7-day grid for the week containing the selected day,
  // but sessions are already filtered to just this day before being passed in.
  return (
    <WeekGrid
      weekStart={startOfWeek(day)}
      sessions={sessions}
      categories={categories}
    />
  )
}
