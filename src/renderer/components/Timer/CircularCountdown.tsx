import React from 'react'
import { TimerState, SessionPhase } from '../../../shared/types'

interface CircularCountdownProps {
  elapsed: number
  totalSeconds: number
  state: TimerState
  phase: SessionPhase
  accentColor?: string
}

const PHASE_COLORS: Record<SessionPhase, string> = {
  work: '#6366f1',
  short_break: '#10b981',
  long_break: '#0ea5e9',
}

function formatTime(seconds: number): string {
  const remaining = Math.max(0, seconds)
  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0')
  const ss = (remaining % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

function formatAriaLabel(seconds: number): string {
  const remaining = Math.max(0, seconds)
  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  if (mm === 0) return `${ss} seconds remaining`
  if (ss === 0) return `${mm} minutes remaining`
  return `${mm} minutes and ${ss} seconds remaining`
}

const CircularCountdown: React.FC<CircularCountdownProps> = ({
  elapsed,
  totalSeconds,
  state,
  phase,
  accentColor,
}) => {
  const r = 45
  const cx = 50
  const cy = 50
  const circumference = 2 * Math.PI * r

  const remaining = Math.max(0, totalSeconds - elapsed)
  const fraction = totalSeconds > 0 ? remaining / totalSeconds : 1
  const strokeDasharray = circumference * fraction

  const color = accentColor && phase === 'work' ? accentColor : PHASE_COLORS[phase]
  const isPaused = state === 'paused'

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      style={{ opacity: isPaused ? 0.6 : 1 }}
      aria-label={formatAriaLabel(remaining)}
      role="timer"
    >
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-gray-200 dark:text-gray-700"
      />
      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${strokeDasharray} ${circumference}`}
        strokeDashoffset="0"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      {/* Time text */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="16"
        fontWeight="600"
        fill="currentColor"
        className="text-gray-800 dark:text-gray-100"
        style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}
      >
        {formatTime(remaining)}
      </text>
    </svg>
  )
}

export default CircularCountdown
