import React, { useState, useEffect, useMemo } from 'react'
import type { Session, Category } from '../../shared/types'
import { computeHeatmapData } from '../hooks/useAnalytics'
import type { HeatmapDay } from '../hooks/useAnalytics'
import SkylineScene from '../components/Skyline/SkylineScene'

type TimeRange = '1year' | 'alltime'

function formatHoveredDay(day: HeatmapDay): string {
  const [year, month, dayNum] = day.date.split('-').map(Number)
  const d = new Date(year, month - 1, dayNum)
  const monthName = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][d.getMonth()]
  const mins = day.totalMinutes
  const sessions = day.sessionCount
  return `${monthName} ${d.getDate()} · ${mins} min · ${sessions} session${sessions !== 1 ? 's' : ''}`
}

function getWeeksSinceFirst(sessions: Session[]): number {
  if (sessions.length === 0) return 52
  const firstMs = Math.min(...sessions.map((s) => s.started_at))
  const now = Date.now()
  const diffWeeks = Math.ceil((now - firstMs) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(52, diffWeeks)
}

export default function SkylineView() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accentColor, setAccentColor] = useState('#6366f1')
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('1year')
  const [autoRotate, setAutoRotate] = useState(false)
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([
      window.api.sessions.getAll(),
      window.api.categories.getAll(),
      window.api.settings.getAll(),
    ]).then(([sessionsRes, categoriesRes, settingsRes]) => {
      if (cancelled) return
      setSessions(sessionsRes.data ?? [])
      setCategories(categoriesRes.data ?? [])
      const accent = settingsRes.data?.accent_color
      setAccentColor(typeof accent === 'string' ? accent : '#6366f1')
      setIsLoading(false)
    }).catch((e) => {
      if (!cancelled) {
        console.error('[SkylineView] failed to load data:', e)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const weeks = useMemo(() => {
    if (timeRange === '1year') return 52
    return getWeeksSinceFirst(sessions)
  }, [timeRange, sessions])

  const heatmapData: HeatmapDay[] = useMemo(
    () => computeHeatmapData(sessions, weeks),
    [sessions, weeks]
  )

  const hasAnySessions = sessions.length > 0

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]" style={{ minHeight: 0 }}>
      {/* Header bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[#1a1a1a] flex-shrink-0">
        {/* Title */}
        <span className="text-[#f5f5f5] font-semibold text-sm flex items-center gap-2">
          <span style={{ color: accentColor }}>◈</span>
          Skyline
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Hovered day tooltip */}
        {hoveredDay && hoveredDay.totalMinutes > 0 && (
          <span className="text-[#888888] text-xs font-mono">
            {formatHoveredDay(hoveredDay)}
          </span>
        )}

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-[#111111] rounded-lg p-1">
          {(['1year', 'alltime'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={[
                'px-3 py-1 text-xs rounded-md transition-colors',
                timeRange === r
                  ? 'bg-[#1a1a1a] text-[#f5f5f5]'
                  : 'text-[#555555] hover:text-[#888888]',
              ].join(' ')}
            >
              {r === '1year' ? '1 Year' : 'All Time'}
            </button>
          ))}
        </div>

        {/* Auto-rotate toggle */}
        <button
          onClick={() => setAutoRotate((v) => !v)}
          className={[
            'px-3 py-1.5 text-xs rounded-lg border transition-colors',
            autoRotate
              ? 'border-[#333333] text-[#f5f5f5] bg-[#1a1a1a]'
              : 'border-[#1a1a1a] text-[#555555] hover:text-[#888888]',
          ].join(' ')}
        >
          {autoRotate ? '⏸ Auto-rotate' : '▶ Auto-rotate'}
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div
              className="w-full h-full"
              style={{
                background:
                  'linear-gradient(90deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
            <style>{`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>
          </div>
        )}

        {!isLoading && !hasAnySessions && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-3">✦</div>
              <p className="text-[#555555] text-sm">Start studying to build your skyline ✦</p>
            </div>
          </div>
        )}

        {!isLoading && hasAnySessions && (
          <SkylineScene
            data={heatmapData}
            categories={categories}
            accentColor={accentColor}
            sessions={sessions}
            autoRotate={autoRotate}
            onHover={setHoveredDay}
          />
        )}
      </div>

      {/* Bottom hint */}
      <div className="flex-shrink-0 px-5 py-2 text-center">
        <span className="text-[10px]" style={{ color: '#555555' }}>
          Drag to orbit · Scroll to zoom · Right-drag to pan
        </span>
      </div>
    </div>
  )
}
