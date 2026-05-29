import React from 'react'
import { Text } from '@react-three/drei'

interface SkylineLabelsProps {
  weeks: number
}

const MONTH_ABBREVS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMonthPositions(weeks: number): { label: string; weekIndex: number }[] {
  const positions: { label: string; weekIndex: number }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the start Sunday
  const dayOfWeek = today.getDay()
  const mostRecentSunday = new Date(today)
  mostRecentSunday.setDate(today.getDate() - dayOfWeek)

  const start = new Date(mostRecentSunday)
  start.setDate(start.getDate() - weeks * 7)

  let lastMonth = -1

  for (let w = 0; w < weeks; w++) {
    const d = new Date(start)
    d.setDate(start.getDate() + w * 7)
    const month = d.getMonth()
    if (month !== lastMonth) {
      positions.push({ label: MONTH_ABBREVS[month], weekIndex: w })
      lastMonth = month
    }
  }

  return positions
}

export default function SkylineLabels({ weeks }: SkylineLabelsProps) {
  const year = new Date().getFullYear()
  const monthPositions = getMonthPositions(weeks)

  return (
    <group>
      {/* Title floating above the scene */}
      <Text
        position={[weeks * 1.2 * 0.5 - 0.6, 12, -2]}
        fontSize={0.8}
        color="#888888"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {`StudyTrack ${year}`}
      </Text>

      {/* Month labels along X axis */}
      {monthPositions.map(({ label, weekIndex }) => (
        <Text
          key={`month-${label}-${weekIndex}`}
          position={[weekIndex * 1.2, 0.3, -1.5]}
          fontSize={0.45}
          color="#888888"
          anchorX="left"
          anchorY="middle"
          font={undefined}
        >
          {label}
        </Text>
      ))}

      {/* Day of week labels along Z axis */}
      {DAY_LABELS.map((label, i) => (
        <Text
          key={`day-${label}`}
          position={[-2, 0.3, i * 1.2]}
          fontSize={0.4}
          color="#888888"
          anchorX="right"
          anchorY="middle"
          font={undefined}
        >
          {label}
        </Text>
      ))}
    </group>
  )
}
