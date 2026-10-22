import type { Maze } from './types'

function openAdjacency(maze: Maze): Array<number[]> {
  const adj: number[][] = maze.nodes.map(() => [])
  for (const id of maze.open) {
    const e = maze.edges[id]
    adj[e.a].push(e.b)
    adj[e.b].push(e.a)
  }
  return adj
}

/** Breadth-first distances from `from` over open passages (-1 = unreachable). */
export function distances(maze: Maze, from: number): Int32Array {
  const adj = openAdjacency(maze)
  const dist = new Int32Array(maze.nodes.length).fill(-1)
  dist[from] = 0
  const queue = [from]
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head]
    for (const v of adj[u]) {
      if (dist[v] === -1) {
        dist[v] = dist[u] + 1
        queue.push(v)
      }
    }
  }
  return dist
}

function farthest(dist: Int32Array): number {
  let best = 0
  for (let i = 1; i < dist.length; i++) if (dist[i] > dist[best]) best = i
  return best
}

/** Approximates the maze's diameter endpoints with two BFS sweeps. */
export function findFarthestPair(maze: Maze): [number, number] {
  const a = farthest(distances(maze, 0))
  const b = farthest(distances(maze, a))
  return [a, b]
}

/** Shortest path (node ids) from `from` to `to`, or [] if unreachable. */
export function solve(maze: Maze, from: number, to: number): number[] {
  const adj = openAdjacency(maze)
  const prev = new Int32Array(maze.nodes.length).fill(-2)
  prev[from] = -1
  const queue = [from]
  for (let head = 0; head < queue.length && prev[to] === -2; head++) {
    const u = queue[head]
    for (const v of adj[u]) {
      if (prev[v] === -2) {
        prev[v] = u
        queue.push(v)
      }
    }
  }
  if (prev[to] === -2) return []
  const path: number[] = []
  for (let u = to; u !== -1; u = prev[u]) path.push(u)
  return path.reverse()
}
