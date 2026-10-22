import type { Maze, MazeEdge, MazeNode, Point, WallShape } from './types'

/** A polygonal cell before graph construction. */
export interface PolyCell {
  /** Vertices in order (either winding). */
  verts: Point[]
}

const PRECISION = 1000

const key = (p: Point) => `${Math.round(p.x * PRECISION)},${Math.round(p.y * PRECISION)}`

/** Order-independent key for a segment. */
function segKey(a: Point, b: Point): string {
  const ka = key(a)
  const kb = key(b)
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}

function centroid(verts: Point[]): Point {
  let x = 0
  let y = 0
  for (const v of verts) {
    x += v.x
    y += v.y
  }
  return { x: x / verts.length, y: y / verts.length }
}

/**
 * Builds a maze graph from polygon cells. Two cells are neighbors if they
 * share a full edge (matching vertex pair). Edges that belong to only one
 * cell form the outer border.
 */
export function buildFromPolygons(cells: PolyCell[]): Maze {
  const nodes: MazeNode[] = cells.map((c, id) => ({
    id,
    center: centroid(c.verts),
    outline: c.verts,
    edges: [],
  }))

  const segs = new Map<string, { cells: number[]; a: Point; b: Point }>()
  cells.forEach((c, id) => {
    for (let i = 0; i < c.verts.length; i++) {
      const a = c.verts[i]
      const b = c.verts[(i + 1) % c.verts.length]
      const k = segKey(a, b)
      const entry = segs.get(k)
      if (entry) entry.cells.push(id)
      else segs.set(k, { cells: [id], a, b })
    }
  })

  const edges: MazeEdge[] = []
  const border: WallShape[] = []
  for (const s of segs.values()) {
    const wall: WallShape = { kind: 'line', a: s.a, b: s.b }
    if (s.cells.length === 2) {
      const id = edges.length
      const [a, b] = s.cells
      edges.push({ id, a, b, wall })
      nodes[a].edges.push(b)
      nodes[b].edges.push(a)
    } else {
      border.push(wall)
    }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const c of cells) {
    for (const v of c.verts) {
      minX = Math.min(minX, v.x)
      minY = Math.min(minY, v.y)
      maxX = Math.max(maxX, v.x)
      maxY = Math.max(maxY, v.y)
    }
  }

  return {
    nodes,
    edges,
    open: new Set(),
    border,
    width: maxX - minX,
    height: maxY - minY,
    start: 0,
    end: nodes.length - 1,
    startGap: null,
    endGap: null,
    bounds: null,
    isCircular: false,
  }
}

/** Translate all geometry so that the top-left of the bounding box is (0,0). */
export function normalize(maze: Maze): Maze {
  let minX = Infinity
  let minY = Infinity
  const visit = (p: Point) => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
  }
  for (const n of maze.nodes) n.outline.forEach(visit)
  const dx = -minX
  const dy = -minY
  const shift = (p: Point) => ({ x: p.x + dx, y: p.y + dy })
  for (const n of maze.nodes) {
    n.center = shift(n.center)
    n.outline = n.outline.map(shift)
  }
  const shiftWall = (w: WallShape): WallShape =>
    w.kind === 'line'
      ? { kind: 'line', a: shift(w.a), b: shift(w.b) }
      : { ...w, center: shift(w.center) }
  for (const e of maze.edges) e.wall = shiftWall(e.wall)
  maze.border = maze.border.map(shiftWall)
  return maze
}

/** Midpoint of a wall segment (used to place entrance/exit markers). */
export function wallMid(w: WallShape): Point {
  if (w.kind === 'line') return { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 }
  const mid = (w.startAngle + w.endAngle) / 2
  return { x: w.center.x + Math.cos(mid) * w.radius, y: w.center.y + Math.sin(mid) * w.radius }
}
