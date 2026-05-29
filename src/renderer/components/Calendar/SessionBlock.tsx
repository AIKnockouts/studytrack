import React from 'react'
import type { Session, Category } from '../../../shared/types'

interface SessionBlockProps {
  session: Session
  category: Category | undefined
  dayStartMinutes: number
  totalDayMinutes: number
  containerHeight: number
}

export default function SessionBlock({
  session,
  category,
  dayStartMinutes,
  totalDayMinutes,
  containerHeight,
}: SessionBlockProps) {
  const startDate = new Date(session.started_at)
  const startMinuteOfDay = startDate.getHours() * 60 + startDate.getMinutes()

  const top = ((startMinuteOfDay - dayStartMinutes) / totalDayMinutes) * containerHeight
  const height = Math.max((session.duration_minutes / totalDayMinutes) * containerHeight, 20)

  const color = category?.color ?? '#6366f1'
  const bgColor = color + '33' // 20% opacity

  const label = [category?.emoji, category?.name].filter(Boolean).join(' ') || 'Unknown'

  return (
    <div
      className="absolute rounded-sm overflow-hidden cursor-pointer hover:brightness-125 transition-[filter]"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: '4px',
        right: '4px',
        backgroundColor: bgColor,
        borderLeft: `3px solid ${color}`,
      }}
      title={`${label} — ${Math.round(session.duration_minutes)}min`}
    >
      <div className="px-1 py-0.5 leading-tight overflow-hidden h-full flex flex-col justify-start">
        <span className="text-[11px] font-medium text-[#f5f5f5] truncate block">
          {label}
        </span>
        {height >= 30 && (
          <span className="text-[10px] text-[#888888] truncate block">
            {Math.round(session.duration_minutes)}min
          </span>
        )}
      </div>
    </div>
  )
}
