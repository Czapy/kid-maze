import { createSVGWindow } from 'svgdom'
import { registerWindow } from '@svgdotjs/svg.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { generateMaze, solve, type GenerationParams } from '../src/maze'
import { renderMaze } from '../src/render/renderMaze'
import { DEFAULT_STYLE, type SymbolSet } from '../src/render/style'

const window = createSVGWindow()
registerWindow(window, window.document)

const params: GenerationParams = {
  type: 'rectangular',
  algorithm: 'backtracker',
  seed: 3,
  cols: 7,
  rows: 7,
  rings: 6,
  centerCells: 1,
  braid: 0,
  twistiness: 0.5,
  shape: 'heart',
  farEnds: true,
}

mkdirSync('out', { recursive: true })
const sets: SymbolSet[] = ['ringDot', 'arrowFlag', 'starSquare', 'letters']
for (const symbolSet of sets) {
  const maze = generateMaze(params)
  const host = window.document.createElement('div')
  const svg = renderMaze(
    host as unknown as HTMLElement,
    maze,
    // Black ink on white: what a monochrome printer would produce.
    { ...DEFAULT_STYLE, markerStyle: 'symbols', symbolSet, wallColor: '#000000', solutionColor: '#888888' },
    { showSolution: false, solution: solve(maze, maze.start, maze.end) },
  )
  writeFileSync(`out/sym-${symbolSet}.svg`, svg.svg())
  console.log('wrote', symbolSet)
}
