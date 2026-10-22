import { ALGORITHMS, MAZE_TYPES, SHAPES, generateMaze, solve } from '../src/maze'
import { MAX_HISTORY, pushHistory, randomParams } from '../src/maze/randomize'
import { createRng } from '../src/maze/rng'

let failures = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failures++
  console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : detail)
}

// Slider limits from Controls.tsx (kept in sync by hand; this test would catch drift).
const LIMITS = {
  rectangular: { cols: [3, 60], rows: [3, 60] },
  circular: { cols: [3, 60], rows: [3, 60] },
  hexagonal: { cols: [3, 40], rows: [3, 40] },
  triangular: { cols: [2, 30], rows: [3, 40] },
  shape: { cols: [10, 70], rows: [10, 70] },
  diamond: { cols: [5, 61], rows: [5, 61] },
} as const

const N = 600
const seenTypes = new Set<string>()
const seenAlgorithms = new Set<string>()
const seenShapes = new Set<string>()
let badLimits = ''
let badRanges = ''
let badMaze = ''

for (let i = 0; i < N; i++) {
  const p = randomParams(createRng(i + 1))
  seenTypes.add(p.type)
  seenAlgorithms.add(p.algorithm)
  seenShapes.add(p.shape)

  const lim = LIMITS[p.type]
  if (p.cols < lim.cols[0] || p.cols > lim.cols[1]) badLimits += ` cols(${p.type}:${p.cols})`
  if (p.type !== 'diamond' && (p.rows < lim.rows[0] || p.rows > lim.rows[1])) {
    badLimits += ` rows(${p.type}:${p.rows})`
  }
  if (p.type === 'diamond' && p.cols % 2 === 0) badLimits += ` diamond-even(${p.cols})`
  if (p.rings < 3 || p.rings > 25) badRanges += ` rings(${p.rings})`
  if (p.centerCells < 1 || p.centerCells > 12) badRanges += ` center(${p.centerCells})`
  if (p.braid < 0 || p.braid > 1 || p.twistiness < 0 || p.twistiness > 1) badRanges += ' fraction'
  if (!Number.isInteger(p.seed) || p.seed < 0) badRanges += ` seed(${p.seed})`

  try {
    const maze = generateMaze(p)
    if (!solve(maze, maze.start, maze.end).length) badMaze += ` unsolvable#${i}`
    if (maze.start === maze.end) badMaze += ` start==end#${i}`
  } catch (e) {
    badMaze += ` threw#${i}(${p.type}): ${(e as Error).message}`
  }
}

check(`${N} random params are within slider limits`, !badLimits, badLimits)
check('other values are within range', !badRanges, badRanges)
check(`${N} random params all generate solvable mazes`, !badMaze, badMaze)
check('every maze type gets picked', seenTypes.size === MAZE_TYPES.length, [...seenTypes].join())
check('every algorithm gets picked', seenAlgorithms.size === ALGORITHMS.length, [...seenAlgorithms].join())
check('every shape gets picked', seenShapes.size === SHAPES.length, [...seenShapes].join())

// Determinism and variety
const a = randomParams(createRng(7))
const b = randomParams(createRng(7))
check('same rng seed gives same params', JSON.stringify(a) === JSON.stringify(b))
const distinct = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(randomParams(createRng(i)))))
check('different rng seeds vary', distinct.size > 40, String(distinct.size))

// Only generation parameters come out (nothing style related)
const keys = Object.keys(a).sort().join(',')
check(
  'result has exactly the generation parameter keys',
  keys === 'algorithm,braid,centerCells,cols,farEnds,rings,rows,seed,shape,twistiness,type',
  keys,
)

// History cap
check('MAX_HISTORY is 100', MAX_HISTORY === 100)
let h: number[] = []
for (let i = 0; i < 150; i++) h = pushHistory(h, i)
check('history capped at 100', h.length === 100)
check('history keeps the newest, drops the oldest', h[0] === 50 && h[99] === 149, `${h[0]}..${h[99]}`)
const before = [1, 2, 3]
const after = pushHistory(before, 4)
check('pushHistory does not mutate input', before.length === 3 && after.length === 4)
check('pushHistory below cap keeps everything', JSON.stringify(after) === '[1,2,3,4]')
check('custom cap respected', JSON.stringify(pushHistory([1, 2, 3], 4, 3)) === '[2,3,4]')

console.log(failures ? `${failures} FAILED` : 'all passed')
process.exit(failures ? 1 : 0)
