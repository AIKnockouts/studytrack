import React from 'react'
import type { Session, Category } from '../../../shared/types'
import SessionBlock from './SessionBlock'

function toDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(d)
}

interface DayColumnProps {
  date: Date
  sessions: Session[]
  categories: Category[]
  dayStartHour: number
  dayEndHour: number
  containerHeight: number
  isToday: boolean
}

export default function DayColumn({
  date,
  sessions,
  categories,
  dayStartHour,
  dayEndHour,
  containerHeight,
  isToday,
}: DayColumnProps) {
  const dateKey = toDateKey(date)
  const daySessions = sessions.filter(
    (s) => toDateKey(new Date(s.started_at)) === dateKey
  )

  const dayStartMinutes = dayStartHour * 60
  const totalDayMinutes = (dayEndHour - dayStartHour) * 60

  const catMap = new Map(categories.map((c) => [c.id, c]))

  return (
    <div
      className="relative flex-1 min-w-0"
      style={{
        height: `${containerHeight}px`,
        backgroundColor: isToday ? '#0f0f0f' : '#0a0a0a',
      }}
    >
      {daySessions.map((session) => (
        <SessionBlock
          key={session.id}
          session={session}
          category={catMap.get(session.category_id)}
          dayStartMinutes={dayStartMinutes}
          totalDayMinutes={totalDayMinutes}
          containerHeight={containerHeight}
        />
      ))}
    </div>
  )
}
