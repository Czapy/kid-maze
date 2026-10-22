import type { Point, ShapeId } from './types'

/**
 * Silhouette masks for "shaped" mazes. Each returns true if the (u,v) point
 * in the unit square [0,1]x[0,1] lies inside the shape.
 */
type Mask = (u: number, v: number) => boolean

function pointInPolygon(x: number, y: number, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function starPolygon(): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.22
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push({ x: 0.5 + Math.cos(a) * r, y: 0.53 + Math.sin(a) * r })
  }
  return pts
}

const STAR = starPolygon()

const ARROW: Point[] = [
  { x: 0.5, y: 0.0 },
  { x: 1.0, y: 0.45 },
  { x: 0.7, y: 0.45 },
  { x: 0.7, y: 1.0 },
  { x: 0.3, y: 1.0 },
  { x: 0.3, y: 0.45 },
  { x: 0.0, y: 0.45 },
]

const MASKS: Record<ShapeId, Mask> = {
  circle: (u, v) => (u - 0.5) ** 2 + (v - 0.5) ** 2 <= 0.25,
  heart: (u, v) => {
    // Classic implicit heart curve, remapped into the unit square.
    const x = (u - 0.5) * 2.7
    const y = (0.45 - v) * 2.7
    return (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0
  },
  star: (u, v) => pointInPolygon(u, v, STAR),
  cross: (u, v) => (u > 0.33 && u < 0.67) || (v > 0.33 && v < 0.67),
  arrow: (u, v) => pointInPolygon(u, v, ARROW),
}

export function shapeMask(id: ShapeId): Mask {
  return MASKS[id]
}
