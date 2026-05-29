import React from 'react'
import type { HeatmapDay } from './HeatmapGrid'

interface HeatmapCellProps {
  day: HeatmapDay
  isToday: boolean
  accentColor: string
  onClick: (d: HeatmapDay) => void
  onMouseEnter: (d: HeatmapDay, e: React.MouseEvent) => void
  onMouseLeave: () => void
}

const ALPHA_SUFFIXES: Record<1 | 2 | 3 | 4, string> = {
  1: '40',
  2: '73',
  3: 'A6',
  4: 'E6',
}

const HeatmapCell: React.FC<HeatmapCellProps> = ({
  day,
  isToday,
  accentColor,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const getBackgroundColor = (): string | undefined => {
    if (day.intensity === 0) return undefined
    const suffix = ALPHA_SUFFIXES[day.intensity as 1 | 2 | 3 | 4]
    return `${accentColor}${suffix}`
  }

  const bgColor = getBackgroundColor()

  return (
    <div
      className={[
        'w-[13px] h-[13px] rounded-sm cursor-pointer',
        day.intensity === 0
          ? 'bg-gray-100 dark:bg-gray-800'
          : '',
      ]
        .join(' ')
        .trim()}
      style={{
        backgroundColor: bgColor,
        ...(isToday
          ? { outline: `2px solid ${accentColor}`, outlineOffset: '1px' }
          : {}),
      }}
      onClick={() => onClick(day)}
      onMouseEnter={(e) => onMouseEnter(day, e)}
      onMouseLeave={onMouseLeave}
    />
  )
}

export default HeatmapCell
