import { DEFAULT_STYLE } from '../src/render/style'
import { loadState, saveState, type PersistedState } from '../src/storage'

const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

const defaults = {
  params: {
    type: 'rectangular',
    algorithm: 'backtracker',
    seed: 12345,
    cols: 15,
    rows: 20,
    rings: 8,
    centerCells: 1,
    braid: 0,
    twistiness: 0.5,
    shape: 'heart',
    farEnds: true,
  } as PersistedState['params'],
  style: DEFAULT_STYLE,
  page: { paper: 'a4', orientation: 'portrait' } as PersistedState['page'],
}

let failures = 0
const check = (name: string, ok: boolean) => {
  if (!ok) failures++
  console.log(ok ? 'ok  ' : 'FAIL', name)
}
const KEY = 'kid-maze:v1'

// Empty storage -> defaults
let s = loadState(defaults)
check('empty storage gives defaults', s.params.cols === 15 && s.presets.length === 0 && s.presetsOpen)

// Round trip
const { seed: _seed, ...paramsNoSeed } = defaults.params
const saved: PersistedState = {
  params: { ...defaults.params, type: 'hexagonal', seed: 99, cols: 7 },
  style: { ...DEFAULT_STYLE, wallColor: '#123456' },
  page: { paper: 'a3', orientation: 'landscape' },
  showSolution: true,
  presets: [
    {
      id: 'a',
      name: 'My preset',
      config: { params: { ...paramsNoSeed, type: 'circular' }, style: DEFAULT_STYLE, page: defaults.page },
    },
  ],
  presetsOpen: false,
}
saveState(saved)
s = loadState(defaults)
check('round trip params', s.params.type === 'hexagonal' && s.params.seed === 99 && s.params.cols === 7)
check('round trip style/page', s.style.wallColor === '#123456' && s.page.paper === 'a3')
check('round trip flags', s.showSolution === true && s.presetsOpen === false)
check('round trip presets', s.presets.length === 1 && s.presets[0].config.params.type === 'circular')

// Corrupted JSON
mem.set(KEY, '{not json')
check('corrupt JSON gives defaults', loadState(defaults).params.cols === 15)

// Wrong types and non-objects
mem.set(KEY, JSON.stringify({ params: { cols: 'lots', type: 5 }, style: 7, page: null, presets: 'x' }))
s = loadState(defaults)
check('wrong types ignored', s.params.cols === 15 && s.params.type === 'rectangular' && s.style.wallColor === DEFAULT_STYLE.wallColor)
check('bad presets ignored', Array.isArray(s.presets) && s.presets.length === 0)

// Older save missing newer fields, plus an unknown field
mem.set(KEY, JSON.stringify({ params: { cols: 9, removedField: 1 }, style: { wallColor: '#abcdef' } }))
s = loadState(defaults)
check('missing fields filled from defaults', s.params.cols === 9 && s.params.rows === 20 && s.style.checkerColor === DEFAULT_STYLE.checkerColor)
check('unknown fields dropped', !('removedField' in s.params))

// Preset entries missing config/id are handled
mem.set(KEY, JSON.stringify({ presets: [{ id: 'x', name: 'Bare' }, { name: 'no id' }, 5] }))
s = loadState(defaults)
check('partial preset repaired, invalid dropped', s.presets.length === 1 && s.presets[0].config.params.cols === 15)

console.log(failures ? `${failures} FAILED` : 'all passed')
process.exit(failures ? 1 : 0)
