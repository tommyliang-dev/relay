import { expect, test } from 'claude-code/testing'
import { compact } from './compact'
import { PACKS } from './index'
import { ROLES } from './types'

// The panel's tier colours (register.tsx TIER_COLOR): the tier reaches a sprite only as its accent.
const ACCENTS = ['#7F77DD', '#D85A30', '#BA7517', '#378ADD', '#1D9E75', '#888780']
const RUN = /(?:<rect x="-?\d+" y="-?\d+" width="\d+" height="\d+" fill="[^"]+"\/>)+/g
const PATHS = /(?:<path d="[^"]*" fill="[^"]+"\/>)+/g
const OPAQUE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

// #abc and #AABBCC are the same colour.
const norm = (f: string) => {
  const c = f.toLowerCase()
  return OPAQUE.test(c) && c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c
}

// What each pixel shows, painted in document order: an opaque fill replaces what is under it,
// any other fill is stacked on top (it blends, so order and count matter).
type Canvas = Map<string, string[]>
const put = (cv: Canvas, x: number, y: number, f: string) => {
  const k = `${x},${y}`
  cv.set(k, OPAQUE.test(f) ? [norm(f)] : [...(cv.get(k) ?? []), f])
}

const paintRects = (run: string): Canvas => {
  const cv: Canvas = new Map()
  for (const m of run.matchAll(/<rect x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"\/>/g))
    for (let y = +m[2]; y < +m[2] + +m[4]; y++) for (let x = +m[1]; x < +m[1] + +m[3]; x++) put(cv, x, y, m[5])
  return cv
}

// Rasterises the M/m/H/h/V/v paths `compact` writes: each subpath is a closed loop of axis-aligned
// sides, and a pixel is in when the nonzero winding number at its centre is not zero.
const paintPaths = (run: string): Canvas => {
  const cv: Canvas = new Map()
  for (const m of run.matchAll(/<path d="([^"]*)" fill="([^"]+)"\/>/g)) {
    const loops: [number, number][][] = []
    let x = 0
    let y = 0
    for (const [, cmd, a, b] of m[1].matchAll(/([MmHhVv])(-?\d+)(?:[ ]?(-?\d+))?/g)) {
      if (cmd === 'M' || cmd === 'm') {
        x = cmd === 'M' ? +a : x + +a
        y = cmd === 'M' ? +b : y + +b
        loops.push([[x, y]])
        continue
      }
      if (cmd === 'H') x = +a
      else if (cmd === 'h') x += +a
      else if (cmd === 'V') y = +a
      else y += +a
      loops[loops.length - 1].push([x, y])
    }
    const edges = loops.flatMap(l => l.map((p, i) => [p, l[(i + 1) % l.length]] as const))
    const xs = loops.flat().map(p => p[0])
    const ys = loops.flat().map(p => p[1])
    for (let py = Math.min(...ys); py < Math.max(...ys); py++)
      for (let px = Math.min(...xs); px < Math.max(...xs); px++) {
        let wind = 0
        for (const [[x0, y0], [x1, y1]] of edges) {
          if (x0 !== x1 || x0 <= px + 0.5) continue
          if (y0 <= py + 0.5 && y1 > py + 0.5) wind++
          else if (y1 <= py + 0.5 && y0 > py + 0.5) wind--
        }
        if (wind !== 0) put(cv, px, py, m[2])
      }
  }
  return cv
}

const sorted = (cv: Canvas) => [...cv].sort(([a], [b]) => (a < b ? -1 : 1))

// Same markup outside the rect runs, and every run paints the same pixels as the paths it became.
const expectSamePicture = (raw: string, out: string) => {
  expect(out.replace(PATHS, '|')).toBe(raw.replace(RUN, '|'))
  const before = raw.match(RUN) ?? []
  const after = out.match(PATHS) ?? []
  expect(after.length).toBe(before.length)
  before.forEach((run, i) => expect(sorted(paintPaths(after[i]))).toEqual(sorted(paintRects(run))))
}

const rect = (x: number, y: number, w: number, h: number, f: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`

test('compact: stacked runs of one fill become one path', () => {
  const raw = `<g class="a">${rect(1, 0, 2, 1, '#111111')}${rect(1, 1, 2, 1, '#111111')}${rect(4, 0, 1, 1, '#222')}</g>`
  const out = compact(raw)
  expect(out.match(/<path /g)?.length).toBe(2)
  expect(out).toContain('fill="#111"')
  expectSamePicture(raw, out)
})

test('compact: a later rect over another fill still shows on top', () => {
  const raw = rect(0, 0, 3, 3, '#111') + rect(1, 1, 1, 1, '#222') + rect(0, 0, 1, 1, '#111')
  expectSamePicture(raw, compact(raw))
})

test('compact: translucent fills keep their order and overlaps', () => {
  const glow = 'rgba(1,2,3,.5)'
  const raw = rect(0, 0, 2, 2, '#111') + rect(1, 1, 2, 2, glow) + rect(2, 2, 2, 2, glow) + rect(0, 0, 1, 1, '#222')
  expectSamePicture(raw, compact(raw))
})

test('compact: leaves fractional rects, rects with other attributes and other markup alone', () => {
  const s = '<rect x="0" y="0" width="1.5" height="1" fill="#111"/><rect class="tile" x="0" y="0" width="9" height="9" rx="8"/><text x="1">hi</text>'
  expect(compact(s)).toBe(s)
})

test('compact: the same sprite in changing text is compacted the same way', () => {
  const sprite = `<g class="bd">${rect(0, 0, 2, 1, '#111')}${rect(0, 1, 2, 1, '#111')}</g>`
  const a = compact(`<text>1s</text>${sprite}`)
  const b = compact(`<text>2s</text>${sprite}`)
  expect(a.replace('1s', '2s')).toBe(b)
})

for (const pack of PACKS) {
  test(`${pack.id}: compacted markup paints the same pixels and is smaller`, () => {
    // Each role in every tier colour, paired with seeds 0..5 so the random looks are covered too.
    for (const role of ROLES)
      ACCENTS.forEach((accent, seed) => {
        const raw = pack.draw(0, 0, { role, tier: 'medium' }, { seed, accent, isWalking: true })
        const out = compact(raw)
        expect(out.length < raw.length).toBe(true)
        expect(out).not.toContain('<rect')
        expectSamePicture(raw, out)
      })
  })
}
