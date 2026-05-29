import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { HeatmapDay } from '../../hooks/useAnalytics'
import type { Category, Session } from '../../../shared/types'

const MAX_BAR_HEIGHT = 8
const BAR_SPACING = 1.2
const BAR_SIZE = 0.9

interface Props {
  data: HeatmapDay[]
  categories: Category[]
  sessions: Session[]
  accentColor: string
  autoRotate: boolean
  onHover: (day: HeatmapDay | null) => void
}

function hexColor(hex: string): THREE.Color {
  try { return new THREE.Color(hex) } catch { return new THREE.Color('#6366f1') }
}

function getDayColor(day: HeatmapDay, sessions: Session[], categories: Category[], accent: string): string {
  if (day.totalMinutes === 0) return '#1a1a1a'
  // Find dominant category for this day
  const dayKey = day.date
  const catMinutes = new Map<string, number>()
  for (const s of sessions) {
    const key = new Intl.DateTimeFormat('en-CA').format(new Date(s.started_at))
    if (key === dayKey) catMinutes.set(s.category_id, (catMinutes.get(s.category_id) ?? 0) + s.duration_minutes)
  }
  if (catMinutes.size === 0) return accent
  let bestId = '', bestMin = 0
  catMinutes.forEach((m, id) => { if (m > bestMin) { bestMin = m; bestId = id } })
  return categories.find(c => c.id === bestId)?.color ?? accent
}

function makeTextSprite(text: string, color = '#888888'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128; canvas.height = 32
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 128, 32)
  ctx.font = 'bold 16px -apple-system, sans-serif'
  ctx.fillStyle = color
  ctx.fillText(text, 2, 22)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(2.2, 0.6, 1)
  return sprite
}

export default function SkylineScene({ data, categories, sessions, accentColor, autoRotate, onHover }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const autoRotateRef = useRef(autoRotate)

  useEffect(() => { autoRotateRef.current = autoRotate }, [autoRotate])

  useEffect(() => {
    const container = mountRef.current
    if (!container || data.length === 0) return

    // --- Setup ---
    const W = container.clientWidth
    const H = container.clientHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000)
    const weeks = Math.ceil(data.length / 7)
    const cx = (weeks * BAR_SPACING) / 2
    const cz = (7 * BAR_SPACING) / 2
    camera.position.set(cx + 15, 18, cz + 18)
    camera.lookAt(cx, 0, cz)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    container.appendChild(renderer.domElement)

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const sun = new THREE.DirectionalLight(0xffffff, 1.1)
    sun.position.set(20, 30, 15)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x8899ff, 0.25)
    fill.position.set(-15, 10, -10)
    scene.add(fill)

    // --- Floor ---
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(weeks * BAR_SPACING + 3, 0.06, 7 * BAR_SPACING + 3),
      new THREE.MeshStandardMaterial({ color: 0x0d0d0d })
    )
    floor.position.set(cx - BAR_SPACING / 2, -0.03, cz - BAR_SPACING / 2)
    scene.add(floor)

    // --- Bars ---
    const maxMinutes = Math.max(...data.map(d => d.totalMinutes), 1)
    const barMeshes: THREE.Mesh[] = []
    const barTargets: number[] = []

    data.forEach((day, i) => {
      const col = Math.floor(i / 7)
      const row = i % 7
      const targetH = day.totalMinutes > 0 ? (day.totalMinutes / maxMinutes) * MAX_BAR_HEIGHT : 0.04
      const color = getDayColor(day, sessions, categories, accentColor)

      const geo = new THREE.BoxGeometry(BAR_SIZE, 1, BAR_SIZE)
      const mat = new THREE.MeshStandardMaterial({ color: hexColor(color), roughness: 0.55, metalness: 0.1 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.scale.y = 0.001
      mesh.position.set(col * BAR_SPACING, 0, row * BAR_SPACING)
      mesh.userData = { day }
      scene.add(mesh)
      barMeshes.push(mesh)
      barTargets.push(targetH)
    })

    // --- Month labels ---
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const seenMonths = new Set<string>()
    data.forEach((day, i) => {
      if (i % 7 !== 0) return
      const monthKey = day.date.substring(0, 7)
      if (seenMonths.has(monthKey)) return
      seenMonths.add(monthKey)
      const col = Math.floor(i / 7)
      const mIdx = parseInt(day.date.substring(5, 7)) - 1
      const sprite = makeTextSprite(MONTHS[mIdx])
      sprite.position.set(col * BAR_SPACING, -0.5, -1.4)
      scene.add(sprite)
    })

    // --- Day labels ---
    const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    DAY_LABELS.forEach((d, row) => {
      const sprite = makeTextSprite(d)
      sprite.position.set(-2, -0.5, row * BAR_SPACING)
      scene.add(sprite)
    })

    // --- OrbitControls ---
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(cx, 0, cz)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.maxPolarAngle = Math.PI / 2.05
    controls.minDistance = 6
    controls.maxDistance = 90
    controls.autoRotateSpeed = 1.5
    controls.update()

    // --- Raycaster ---
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-9999, -9999)
    let hoveredMesh: THREE.Mesh | null = null

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    renderer.domElement.addEventListener('mousemove', onMouseMove)

    // --- Animation ---
    const startTime = performance.now()
    let raf: number

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const elapsed = (performance.now() - startTime) / 1000

      // Animate bars rising
      barMeshes.forEach((mesh, i) => {
        const delay = Math.floor(i / 7) * 0.018
        const t = Math.max(0, Math.min(1, (elapsed - delay) / 0.7))
        const eased = 1 - (1 - t) ** 3
        const h = Math.max(barTargets[i] * eased, 0.001)
        mesh.scale.y = h
        mesh.position.y = h / 2
      })

      // Hover detection
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(barMeshes)
      const hit = hits.length > 0 ? hits[0].object as THREE.Mesh : null
      if (hit !== hoveredMesh) {
        if (hoveredMesh) {
          const m = hoveredMesh.material as THREE.MeshStandardMaterial
          m.emissive.set(0x000000); m.emissiveIntensity = 0
        }
        hoveredMesh = hit
        if (hit) {
          const m = hit.material as THREE.MeshStandardMaterial
          m.emissive.set(0x333333); m.emissiveIntensity = 0.6
          onHover(hit.userData.day as HeatmapDay)
        } else {
          onHover(null)
        }
      }

      controls.autoRotate = autoRotateRef.current
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    // --- Resize ---
    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [data, categories, sessions, accentColor])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
