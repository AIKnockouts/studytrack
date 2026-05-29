import React, { useEffect, useState } from 'react'
import type { Session, Category } from '../../../shared/types'
import type { HeatmapDay } from './HeatmapGrid'

interface DayDetailPanelProps {
  day: HeatmapDay | null
  categories: Category[]
  onClose: () => void
}

function formatDateFull(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
  const monthName = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][d.getMonth()]
  return `${dayName}, ${monthName} ${d.getDate()}, ${d.getFullYear()}`
}

function formatTime12h(ms: number): string {
  const d = new Date(ms)
  let hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  const mm = String(minutes).padStart(2, '0')
  return `${hours}:${mm} ${ampm}`
}

const DayDetailPanel: React.FC<DayDetailPanelProps> = ({ day, categories, onClose }) => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!day) {
      setSessions([])
      return
    }

    let cancelled = false
    setLoading(true)
    setSessions([])

    window.api.sessions.getByDate(day.date).then((res) => {
      if (cancelled) return
      setSessions(res.data ?? [])
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [day?.date])

  const isOpen = day !== null

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black transition-opacity duration-200',
          isOpen ? 'opacity-30 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className={[
          'fixed top-0 right-0 z-50 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl',
          'flex flex-col transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            {day && (
              <>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDateFull(day.date)}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Total: {day.totalMinutes} min
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">
              No sessions found for this day.
            </p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((session) => {
                const category = categories.find((c) => c.id === session.category_id)
                const isCompleted = session.session_type === 'completed'

                return (
                  <li
                    key={session.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {formatTime12h(session.started_at)}
                      </span>
                      <span
                        className={[
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          isCompleted
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
                        ].join(' ')}
                      >
                        {isCompleted ? 'Completed' : 'Partial'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {category && (
                        <span className="flex items-center gap-1">
                          {category.emoji && <span>{category.emoji}</span>}
                          <span
                            className="font-medium"
                            style={{ color: category.color }}
                          >
                            {category.name}
                          </span>
                        </span>
                      )}
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>{session.duration_minutes} min</span>
                    </div>

                    {session.note && (
                      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 italic">
                        {session.note}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

export default DayDetailPanel
