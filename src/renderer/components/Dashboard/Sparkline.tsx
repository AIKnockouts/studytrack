import React from 'react'

interface SparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  color,
  width = 80,
  height = 28,
}) => {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} />
  }

  const nonEmpty = data.filter((v) => v > 0)
  if (nonEmpty.length === 0) {
    return <svg width={width} height={height} />
  }

  const minVal = 0
  const maxVal = Math.max(...data)

  // Pad inner to avoid clipping at edges
  const padX = 2
  const padY = 2
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const points = data.map((v, i) => {
    const x = padX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
    const y = maxVal === minVal
      ? padY + innerH / 2
      : padY + innerH - ((v - minVal) / (maxVal - minVal)) * innerH
    return { x, y }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Area fill path: start at bottom-left, trace polyline, close at bottom-right
  const firstPt = points[0]
  const lastPt = points[points.length - 1]
  const areaPath = [
    `M ${firstPt.x},${padY + innerH}`,
    ...points.map((p) => `L ${p.x},${p.y}`),
    `L ${lastPt.x},${padY + innerH}`,
    'Z',
  ].join(' ')

  return (
    <svg width={width} height={height} overflow="visible">
      {/* Area fill */}
      <path
        d={areaPath}
        fill={color}
        fillOpacity={0.15}
        stroke="none"
      />
      {/* Line */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default Sparkline
