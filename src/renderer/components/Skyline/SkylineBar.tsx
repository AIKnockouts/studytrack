import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { HeatmapDay } from '../../hooks/useAnalytics'

interface SkylineBarProps {
  x: number
  z: number
  height: number
  color: string
  day: HeatmapDay
  maxHeight: number
  onHover: (day: HeatmapDay | null) => void
}

export default function SkylineBar({ x, z, height, color, day, onHover }: SkylineBarProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  // Animated height state: starts at 0, springs to target
  const currentHeightRef = useRef(0)
  const targetHeightRef = useRef(height)

  // Stagger delay based on column (week index = x)
  const delayRef = useRef(x * 0.02)
  const elapsedRef = useRef(0)
  const animStartedRef = useRef(false)

  // Update target if height changes
  useEffect(() => {
    targetHeightRef.current = height
  }, [height])

  const isZero = height <= 0.001
  const actualHeight = isZero ? 0.05 : height
  const barColor = isZero ? '#1a1a1a' : color

  useFrame((_, delta) => {
    if (!meshRef.current) return

    elapsedRef.current += delta

    // Wait for stagger delay
    if (elapsedRef.current < delayRef.current) return

    if (!animStartedRef.current) {
      animStartedRef.current = true
    }

    const timeAfterDelay = elapsedRef.current - delayRef.current
    const progress = Math.min(timeAfterDelay / 1.0, 1) // 1s duration

    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3)
    currentHeightRef.current = eased * actualHeight

    const h = Math.max(currentHeightRef.current, 0.001)
    meshRef.current.scale.y = h / actualHeight
    meshRef.current.position.y = h / 2

    // Hover scale in XZ
    const targetScale = hovered ? 1.05 : 1.0
    meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.15
    meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * 0.15
  })

  return (
    <mesh
      ref={meshRef}
      position={[x * 1.2, 0, z * 1.2]}
      onPointerEnter={(e) => {
        e.stopPropagation()
        setHovered(true)
        onHover(day)
      }}
      onPointerLeave={(e) => {
        e.stopPropagation()
        setHovered(false)
        onHover(null)
      }}
    >
      <boxGeometry args={[0.9, actualHeight, 0.9]} />
      <meshStandardMaterial color={barColor} />
    </mesh>
  )
}
