import { useState, useEffect } from 'react'
import type { Session, Category } from '../../shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimeRange = 'week' | 'month' | 'year' | 'all'

export interface HeatmapDay {
  date: string
  totalMinutes: number
  sessionCount: number
  intensity: 0 | 1 | 2 | 3 | 4
}

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

export interface PerSubjectStat {
  category: Category
  totalMinutes: number
  totalMinutesAllTime: number
  percentOfTotal: number
  sparklineData: number[]
}

// ─── Core Helpers ─────────────────────────────────────────────────────────────

/**
 * Converts a Unix millisecond timestamp to a "YYYY-MM-DD" string in LOCAL time.
 * Uses the en-CA locale which natively returns YYYY-MM-DD format.
 */
export function toDateKey(ms: number): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date(ms))
}

/**
 * Returns the epoch-ms of midnight (local time) N days ago.
 */
function midnightNDaysAgo(n: number): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.getTime()
}

/**
 * Returns the epoch-ms start of a TimeRange, or null for 'all'.
 */
export function getTimeRangeStart(range: TimeRange): number | null {
  switch (range) {
    case 'week':  return midnightNDaysAgo(7)
    case 'month': return midnightNDaysAgo(30)
    case 'year':  return midnightNDaysAgo(365)
    case 'all':   return null
  }
}

/**
 * Filters sessions to those that started within the given TimeRange.
 */
export function filterByTimeRange(sessions: Session[], range: TimeRange): Session[] {
  const start = getTimeRangeStart(range)
  if (start === null) return sessions
  return sessions.filter((s) => s.started_at >= start)
}

// ─── Streak Calculations ──────────────────────────────────────────────────────

/**
 * Computes the current study streak.
 * A "study day" is any calendar day (local time) with at least 1 session.
 * If today has a session, count today and look backward while each previous day
 * also has a session.  If today is empty but yesterday is not, start from
 * yesterday.  Otherwise return 0.
 */
export function computeCurrentStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0

  // Build a Set of all date keys that have at least one session.
  const daySet = new Set<string>()
  for (const s of sessions) {
    daySet.add(toDateKey(s.started_at))
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayKey = toDateKey(today.getTime())
  const yesterdayDate = new Date(today)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayKey = toDateKey(yesterdayDate.getTime())

  let startDate: Date

  if (daySet.has(todayKey)) {
    startDate = today
  } else if (daySet.has(yesterdayKey)) {
    startDate = yesterdayDate
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

/**
 * Computes the longest-ever streak across all sessions.
 * Collects unique date keys, sorts ascending, and finds the longest consecutive run.
 */
export function computeLongestStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0

  const daySet = new Set<string>()
  for (const s of sessions) {
    daySet.add(toDateKey(s.started_at))
  }

  const days = Array.from(daySet).sort()
  if (days.length === 0) return 0

  let longest = 1
  let current = 1

  for (let i = 1; i < days.length; i++) {
    // Check if this date is exactly 1 calendar day after the previous.
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

// ─── Aggregation Helpers ──────────────────────────────────────────────────────

/**
 * Sums duration_minutes across sessions, optionally filtered by time range.
 */
export function computeTotalMinutes(sessions: Session[], range?: TimeRange): number {
  const filtered = range ? filterByTimeRange(sessions, range) : sessions
  return filtered.reduce((sum, s) => sum + s.duration_minutes, 0)
}

/**
 * Returns an array of 'days' elements (oldest first, today last).
 * Each element is the total minutes studied on that calendar day,
 * filtered to the given categoryId (null = all categories).
 */
export function computeSparkline(
  sessions: Session[],
  categoryId: string | null,
  days: number
): number[] {
  const relevant = categoryId
    ? sessions.filter((s) => s.category_id === categoryId)
    : sessions

  // Build a map from dateKey → total minutes.
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
    const key = toDateKey(d.getTime())
    result.push(map.get(key) ?? 0)
  }

  return result
}

/**
 * Builds heatmap data covering 'weeks' full weeks, starting from the most recent
 * Sunday that is 'weeks' full weeks ago.
 *
 * Intensity is computed relative to all non-zero days in the dataset using
 * the p25/p50/p75 thresholds.
 */
export function computeHeatmapData(sessions: Session[], weeks: number): HeatmapDay[] {
  // Build map of dateKey → { totalMinutes, sessionCount }
  const map = new Map<string, { totalMinutes: number; sessionCount: number }>()
  for (const s of sessions) {
    const key = toDateKey(s.started_at)
    const entry = map.get(key) ?? { totalMinutes: 0, sessionCount: 0 }
    entry.totalMinutes += s.duration_minutes
    entry.sessionCount += 1
    map.set(key, entry)
  }

  // Compute percentile thresholds from all non-zero values in the dataset.
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

  // Find the most recent Sunday that is exactly 'weeks' full weeks ago.
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Compute the most recent Sunday on or before today.
  const dayOfWeek = today.getDay() // 0 = Sunday
  const mostRecentSunday = new Date(today)
  mostRecentSunday.setDate(today.getDate() - dayOfWeek)

  // Start is 'weeks' weeks before that Sunday.
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

/**
 * Builds stacked-bar data for the last 'days' calendar days (ascending).
 * Each entry has the date plus one key per category with its total minutes.
 */
export function computeStackedBarData(
  sessions: Session[],
  categories: Category[],
  days: number
): StackedBarEntry[] {
  // Build map: dateKey → categoryId → minutes
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

/**
 * Builds donut chart data for sessions within the given time range.
 * Only includes categories with > 0 minutes, sorted descending.
 */
export function computeDonutData(
  sessions: Session[],
  categories: Category[],
  range: TimeRange
): DonutEntry[] {
  const filtered = filterByTimeRange(sessions, range)
  const totalMinutes = filtered.reduce((sum, s) => sum + s.duration_minutes, 0)

  // Group by category_id
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

/**
 * Builds per-subject stats for all non-archived categories.
 */
export function computePerSubjectStats(
  sessions: Session[],
  categories: Category[],
  range: TimeRange
): PerSubjectStat[] {
  const filteredSessions = filterByTimeRange(sessions, range)
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

// ─── React Hook ───────────────────────────────────────────────────────────────

export function useAnalytics(timeRange: TimeRange = 'all') {
  const [sessions, setSessions] = useState<Session[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)

    Promise.all([
      window.api.sessions.getAll(),
      window.api.categories.getAll(),
    ]).then(([sessionsRes, categoriesRes]) => {
      if (cancelled) return
      setSessions(sessionsRes.data ?? [])
      setCategories(categoriesRes.data ?? [])
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [timeRange])

  const rangeFiltered = filterByTimeRange(sessions, timeRange)

  return {
    currentStreak: computeCurrentStreak(sessions),
    longestStreak: computeLongestStreak(sessions),
    totalMinutes: computeTotalMinutes(sessions, timeRange),
    totalSessions: rangeFiltered.length,
    perSubjectStats: computePerSubjectStats(sessions, categories, timeRange),
    stackedBarData: computeStackedBarData(sessions, categories, 14),
    donutData: computeDonutData(sessions, categories, timeRange),
    heatmapData: computeHeatmapData(sessions, 52),
    isLoading,
  }
}
