import React, { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { HeatmapDay } from '../../hooks/useAnalytics'
import type { Category, Session } from '../../../shared/types'
import SkylineBar from './SkylineBar'
import SkylineLabels from './SkylineLabels'

const MAX_HEIGHT = 8

interface SkylineSceneProps {
  data: HeatmapDay[]
  categories: Category[]
  accentColor: string
  sessions: Session[]
  autoRotate: boolean
  onHover: (day: HeatmapDay | null) => void
}

function computeDayColors(
  data: HeatmapDay[],
  sessions: Session[],
  categories: Category[],
  accentColor: string
): string[] {
  // Build map: dateKey → { categoryId → totalMinutes }
  const dateMap = new Map<string, Map<string, number>>()
  for (const s of sessions) {
    const key = new Intl.DateTimeFormat('en-CA').format(new Date(s.started_at))
    if (!dateMap.has(key)) dateMap.set(key, new Map())
    const catMap = dateMap.get(key)!
    catMap.set(s.category_id, (catMap.get(s.category_id) ?? 0) + s.duration_minutes)
  }

  const catColorMap = new Map(categories.map((c) => [c.id, c.color]))

  return data.map((day) => {
    if (day.totalMinutes === 0) return '#1a1a1a'
    const catMap = dateMap.get(day.date)
    if (!catMap || catMap.size === 0) return accentColor

    // Find dominant category
    let dominantId = ''
    let maxMin = 0
    for (const [catId, mins] of catMap.entries()) {
      if (mins > maxMin) {
        maxMin = mins
        dominantId = catId
      }
    }

    return catColorMap.get(dominantId) ?? accentColor
  })
}

function SceneContent({
  data,
  categories,
  accentColor,
  sessions,
  autoRotate,
  onHover,
}: SkylineSceneProps) {
  const maxMinutes = useMemo(
    () => Math.max(...data.map((d) => d.totalMinutes), 1),
    [data]
  )

  const dayColors = useMemo(
    () => computeDayColors(data, sessions, categories, accentColor),
    [data, sessions, categories, accentColor]
  )

  const weeks = Math.floor(data.length / 7)

  // Total width of the grid for centering the floor
  const gridWidth = weeks * 1.2
  const gridDepth = 7 * 1.2

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 30, 10]} intensity={1.0} castShadow={false} />
      <directionalLight position={[-10, 20, -10]} intensity={0.3} />

      {/* Floor */}
      <mesh position={[gridWidth / 2 - 0.6, -0.1, gridDepth / 2 - 0.6]}>
        <boxGeometry args={[gridWidth + 4, 0.05, gridDepth + 4]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Bars */}
      {data.map((day, i) => {
        const weekIndex = Math.floor(i / 7)
        const dayOfWeek = i % 7
        const height =
          day.totalMinutes > 0
            ? (day.totalMinutes / maxMinutes) * MAX_HEIGHT
            : 0

        return (
          <SkylineBar
            key={day.date}
            x={weekIndex}
            z={dayOfWeek}
            height={height}
            color={dayColors[i]}
            day={day}
            maxHeight={MAX_HEIGHT}
            onHover={onHover}
          />
        )
      })}

      {/* Labels */}
      <SkylineLabels weeks={weeks} />

      {/* Orbit Controls */}
      <OrbitControls
        enableZoom
        enablePan
        enableRotate
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        target={[gridWidth / 2 - 0.6, 0, gridDepth / 2 - 0.6]}
      />
    </>
  )
}

export default function SkylineScene(props: SkylineSceneProps) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: '#000000' }}
      camera={{ position: [26, 20, 20], fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true }}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
