import { Resvg } from '@resvg/resvg-js'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

for (const f of readdirSync('out').filter((n) => n.endsWith('.svg'))) {
  const svg = readFileSync(`out/${f}`, 'utf8')
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 700 }, background: 'white' }).render().asPng()
  writeFileSync(`out/${f.replace('.svg', '.png')}`, png)
  console.log('rasterized', f)
}
