import React, { useState, useEffect, useCallback } from 'react'
import type { Session, Category } from '../../shared/types'
import StatCard from '../components/Dashboard/StatCard'
import SubjectTable from '../components/Dashboard/SubjectTable'
import type { PerSubjectStat } from '../components/Dashboard/SubjectTable'
import StackedBarChart from '../components/Dashboard/StackedBarChart'
import DonutChart from '../components/Dashboard/DonutChart'
import HeatmapGrid, { HeatmapDay } from '../components/Heatmap/HeatmapGrid'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimeRange = 'week' | 'month' | 'year' | 'all'

export interface DonutEntry {
  categoryId: string
  categoryName: string
  color: string
  minutes: number
  percent: number
}

export interface StackedBarEntry {
  date: string
  [catId: string]: number | string
}

// ─── Inline Analytics Helpers ─────────────────────────────────────────────────

function toDateKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date(ms))
}

function midnightNDaysAgo(n: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.getTime()
}

function filterByRange(sessions: Session[], range: string): Session[] {
  let cutoff: number | null = null
  if (range === 'week')  cutoff = midnightNDaysAgo(7)
  else if (range === 'month') cutoff = midnightNDaysAgo(30)
  else if (range === 'year')  cutoff = midnightNDaysAgo(365)
  // 'all' → no filter
  if (cutoff === null) return sessions
  return sessions.filter((s) => s.started_at >= cutoff!)
}

function computeCurrentStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0

  const daySet = new Set<string>()
  for (const s of sessions) daySet.add(toDateKey(s.started_at))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = toDateKey(today.getTime())

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toDateKey(yesterday.getTime())

  let startDate: Date
  if (daySet.has(todayKey)) {
    startDate = today
  } else if (daySet.has(yesterdayKey)) {
    startDate = yesterday
  } else {
    return 0
  }

  let count = 1
  const cursor = new Date(startDate)
  while (true) {
    cursor.setDate(cursor.getDate() - 1)
    const key = toDateKey(cursor.getTime())
    if (daySet.has(key)) {
      count++
    } else {
      break
    }
  }
  return count
}

function computeLongestStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0

  const daySet = new Set<string>()
  for (const s of sessions) daySet.add(toDateKey(s.started_at))

  const days = Array.from(daySet).sort()
  if (days.length === 0) return 0

  let longest = 1
  let current = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T00:00:00')
    const curr = new Date(days[i] + 'T00:00:00')
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
    if (diffDays === 1) {
      current++
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }
  return longest
}

function computeTotalMinutes(sessions: Session[], range: string): number {
  return filterByRange(sessions, range).reduce((sum, s) => sum + s.duration_minutes, 0)
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function computeHeatmapData(sessions: Session[], weeks: number): HeatmapDay[] {
  const map = new Map<string, { totalMinutes: number; sessionCount: number }>()
  for (const s of sessions) {
    const key = toDateKey(s.started_at)
    const entry = map.get(key) ?? { totalMinutes: 0, sessionCount: 0 }
    entry.totalMinutes += s.duration_minutes
    entry.sessionCount += 1
    map.set(key, entry)
  }

  const nonZeroMinutes = Array.from(map.values())
    .map((v) => v.totalMinutes)
    .filter((m) => m > 0)
    .sort((a, b) => a - b)

  function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0
    const idx = (p / 100) * (arr.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    if (lo === hi) return arr[lo]
    return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo)
  }

  const p25 = percentile(nonZeroMinutes, 25)
  const p50 = percentile(nonZeroMinutes, 50)
  const p75 = percentile(nonZeroMinutes, 75)
  const singleNonZeroDay = nonZeroMinutes.length === 1

  function intensityFor(minutes: number): 0 | 1 | 2 | 3 | 4 {
    if (minutes === 0) return 0
    if (singleNonZeroDay) return 1
    if (minutes >= p75) return 4
    if (minutes >= p50) return 3
    if (minutes >= p25) return 2
    return 1
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()
  const mostRecentSunday = new Date(today)
  mostRecentSunday.setDate(today.getDate() - dayOfWeek)
  const start = new Date(mostRecentSunday)
  start.setDate(start.getDate() - weeks * 7)

  const result: HeatmapDay[] = []
  const totalDays = weeks * 7
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = toDateKey(d.getTime())
    const entry = map.get(key) ?? { totalMinutes: 0, sessionCount: 0 }
    result.push({
      date: key,
      totalMinutes: entry.totalMinutes,
      sessionCount: entry.sessionCount,
      intensity: intensityFor(entry.totalMinutes),
    })
  }
  return result
}

function computeDonutData(
  sessions: Session[],
  categories: Category[],
  range: string
): DonutEntry[] {
  const filtered = filterByRange(sessions, range)
  const totalMinutes = filtered.reduce((sum, s) => sum + s.duration_minutes, 0)

  const minutesByCat = new Map<string, number>()
  for (const s of filtered) {
    minutesByCat.set(s.category_id, (minutesByCat.get(s.category_id) ?? 0) + s.duration_minutes)
  }

  const catMap = new Map(categories.map((c) => [c.id, c]))
  const entries: DonutEntry[] = []

  for (const [catId, minutes] of minutesByCat.entries()) {
    if (minutes <= 0) continue
    const cat = catMap.get(catId)
    if (!cat) continue
    entries.push({
      categoryId: catId,
      categoryName: cat.name,
      color: cat.color,
      minutes,
      percent: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
    })
  }

  entries.sort((a, b) => b.minutes - a.minutes)
  return entries
}

function computeStackedBarData(
  sessions: Session[],
  categories: Category[],
  days: number
): StackedBarEntry[] {
  const map = new Map<string, Map<string, number>>()
  for (const s of sessions) {
    const key = toDateKey(s.started_at)
    if (!map.has(key)) map.set(key, new Map())
    const catMap = map.get(key)!
    catMap.set(s.category_id, (catMap.get(s.category_id) ?? 0) + s.duration_minutes)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: StackedBarEntry[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = toDateKey(d.getTime())
    const catMap = map.get(key)
    const entry: StackedBarEntry = { date: key }
    for (const cat of categories) {
      entry[cat.id] = catMap?.get(cat.id) ?? 0
    }
    result.push(entry)
  }

  return result
}

function computeSparkline(
  sessions: Session[],
  catId: string | null,
  days: number
): number[] {
  const relevant = catId
    ? sessions.filter((s) => s.category_id === catId)
    : sessions

  const map = new Map<string, number>()
  for (const s of relevant) {
    const key = toDateKey(s.started_at)
    map.set(key, (map.get(key) ?? 0) + s.duration_minutes)
  }

  const result: number[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    result.push(map.get(toDateKey(d.getTime())) ?? 0)
  }
  return result
}

function computePerSubjectStats(
  sessions: Session[],
  categories: Category[],
  range: string
): PerSubjectStat[] {
  const filteredSessions = filterByRange(sessions, range)
  const totalRangeMinutes = filteredSessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const activeCategories = categories.filter((c) => c.archived_at === null)

  const stats: PerSubjectStat[] = activeCategories.map((cat) => {
    const inRange = filteredSessions
      .filter((s) => s.category_id === cat.id)
      .reduce((sum, s) => sum + s.duration_minutes, 0)
    const allTime = sessions
      .filter((s) => s.category_id === cat.id)
      .reduce((sum, s) => sum + s.duration_minutes, 0)

    return {
      category: cat,
      totalMinutes: inRange,
      totalMinutesAllTime: allTime,
      percentOfTotal: totalRangeMinutes > 0 ? (inRange / totalRangeMinutes) * 100 : 0,
      sparklineData: computeSparkline(sessions, cat.id, 30),
    }
  })

  stats.sort((a, b) => b.totalMinutes - a.totalMinutes)
  return stats
}

// ─── Heatmap weeks helper ─────────────────────────────────────────────────────

function heatmapRangeToWeeks(heatmapRange: string, sessions: Session[]): number {
  if (heatmapRange === '3 months') return 13
  if (heatmapRange === '6 months') return 26
  if (heatmapRange === '1 year') return 52

  // All time
  if (sessions.length === 0) return 52
  const earliest = Math.min(...sessions.map((s) => s.started_at))
  const now = Date.now()
  const daysSinceFirst = Math.ceil((now - earliest) / 86_400_000)
  return Math.max(52, Math.ceil(daysSinceFirst / 7))
}

// ─── Skeleton Component ───────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse shadow-sm">
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3" />
    <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-28" />
  </div>
)

// ─── Time Range Labels ────────────────────────────────────────────────────────

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
]

const HEATMAP_RANGE_OPTIONS = ['3 months', '6 months', '1 year', 'All time']

function timeRangeLabel(range: TimeRange): string {
  const opt = TIME_RANGE_OPTIONS.find((o) => o.value === range)
  return opt ? opt.label : range
}

// ─── DashboardView ────────────────────────────────────────────────────────────

const DashboardView: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accentColor, setAccentColor] = useState('#6366f1')
  const [isLoading, setIsLoading] = useState(true)

  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [heatmapRange, setHeatmapRange] = useState('3 months')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const [sessionsRes, categoriesRes, accentRes] = await Promise.all([
      window.api.sessions.getAll(),
      window.api.categories.getAll(),
      window.api.settings.get('accent_color'),
    ])
    setSessions(sessionsRes.data ?? [])
    setCategories(categoriesRes.data ?? [])
    if (typeof accentRes.data === 'string') {
      setAccentColor(accentRes.data)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Derived data ───────────────────────────────────────────────────────────

  const filteredSessions = filterByRange(sessions, timeRange)
  const totalMinutes = computeTotalMinutes(sessions, timeRange)
  const currentStreak = computeCurrentStreak(sessions)
  const longestStreak = computeLongestStreak(sessions)
  const totalSessions = filteredSessions.length

  const heatmapWeeks = heatmapRangeToWeeks(heatmapRange, sessions)
  const heatmapData = computeHeatmapData(sessions, heatmapWeeks)

  const donutData = computeDonutData(sessions, categories, timeRange)
  const stackedBarData = computeStackedBarData(sessions, categories, 14)
  const perSubjectStats = computePerSubjectStats(sessions, categories, timeRange)

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto w-full px-6 py-6 flex flex-col gap-6">

        {/* Header + time range selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <div className="flex gap-1 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={[
                  'px-3 py-1.5 text-sm rounded-md font-medium transition-colors',
                  timeRange === opt.value
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                ].join(' ')}
                style={timeRange === opt.value ? { backgroundColor: accentColor } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stat Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Time"
              value={totalMinutes > 0 ? formatTime(totalMinutes) : '—'}
              subLabel={timeRangeLabel(timeRange)}
              icon={<span>⏱</span>}
            />
            <StatCard
              label="Total Sessions"
              value={String(totalSessions)}
              subLabel={timeRangeLabel(timeRange)}
              icon={<span>📚</span>}
            />
            <StatCard
              label="Current Streak"
              value={`${currentStreak} day${currentStreak !== 1 ? 's' : ''}`}
              subLabel="consecutive days"
              icon={<span>🔥</span>}
            />
            <StatCard
              label="Longest Streak"
              value={`${longestStreak} day${longestStreak !== 1 ? 's' : ''}`}
              subLabel="all time"
              icon={<span>🏆</span>}
            />
          </div>
        )}

        {/* Heatmap */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Study Activity
          </h2>
          {isLoading ? (
            <div className="h-28 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg" />
          ) : (
            <div className="overflow-x-auto">
              <HeatmapGrid
                data={heatmapData}
                accentColor={accentColor}
                timeRange={heatmapRange}
                onTimeRangeChange={setHeatmapRange}
                categories={categories}
              />
            </div>
          )}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stacked Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Daily Activity (Last 14 Days)
            </h2>
            {isLoading ? (
              <div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg" />
            ) : (
              <StackedBarChart
                data={stackedBarData}
                categories={categories}
              />
            )}
          </div>

          {/* Donut Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Time by Subject
            </h2>
            {isLoading ? (
              <div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg" />
            ) : (
              <DonutChart data={donutData} />
            )}
          </div>
        </div>

        {/* Subject Table */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Subjects
          </h2>
          {isLoading ? (
            <div className="h-40 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl" />
          ) : (
            <SubjectTable
              stats={perSubjectStats}
              timeRange={timeRangeLabel(timeRange)}
            />
          )}
        </div>

      </div>
    </div>
  )
}

export default DashboardView
