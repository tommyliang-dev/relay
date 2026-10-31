import { expect, test } from 'claude-code/testing'
import { compact } from './compact'
import { PACKS } from './index'
import { ROLES, TIERS } from './types'

const ACCENT = '#378ADD'

// Paints rects and the paths `compact` writes onto a cell map, in document order.
const paint = (svg: string): Map<string, string> => {
  const cells = new Map<string, string>()
  const fill = (x: number, y: number, w: number, h: number, f: string) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) cells.set(`${i},${j}`, f)
  }
  for (const m of svg.matchAll(/<rect x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"\/>/g)) fill(+m[1], +m[2], +m[3], +m[4], m[5])
  for (const m of svg.matchAll(/<path d="([^"]+)" fill="([^"]+)"\/>/g)) {
    for (const s of m[1].matchAll(/M(-?\d+) (-?\d+)h(\d+)v(\d+)h-\d+/g)) fill(+s[1], +s[2], +s[3], +s[4], m[2])
  }
  return cells
}

test('compact: merges stacked runs and groups by fill', () => {
  const rect = (x: number, y: number, w: number, f: string) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${f}"/>`
  const out = compact(`<g class="a">${rect(1, 0, 2, '#111')}${rect(1, 1, 2, '#111')}${rect(4, 0, 1, '#222')}</g>`)
  expect(out).toBe('<g class="a"><path d="M1 0h2v2h-2" fill="#111"/><path d="M4 0h1v1h-1" fill="#222"/></g>')
})

test('compact: a rect over another fill keeps its paint order', () => {
  const over = '<rect x="0" y="0" width="2" height="1" fill="#111"/><rect x="1" y="0" width="1" height="1" fill="#222"/>'
  expect(compact(over)).toBe('<path d="M0 0h2v1h-2" fill="#111"/><path d="M1 0h1v1h-1" fill="#222"/>')
})

test('compact: leaves fractional rects alone', () => {
  const frac = '<rect x="0" y="0" width="1.5" height="1" fill="#111"/>'
  expect(compact(frac)).toBe(frac)
})

test('compact: leaves other markup, and rects with extra attributes, alone', () => {
  const s = '<rect class="tile" x="0" y="0" width="9" height="9" rx="8"/><text x="1">hi</text>'
  expect(compact(s)).toBe(s)
})

for (const pack of PACKS) {
  test(`${pack.id}: compacted markup paints the same pixels and is smaller`, () => {
    for (const variant of pack.variants) {
      for (const role of ROLES) {
        for (const tier of TIERS) {
          const raw = pack.draw(0, 0, { role, tier }, { variant, accent: ACCENT, isWalking: true })
          const out = compact(raw)
          expect([...paint(out)].sort()).toEqual([...paint(raw)].sort())
          expect(out.length < raw.length).toBe(true)
          expect(out).not.toContain('<rect')
        }
      }
    }
  })
}

// The pane draws nothing past 100,000 characters. The gallery is one crew from every pack, plus
// each pack's CSS; leave room for the cards' own text and tiles.
test('gallery: every pack\'s crew fits well inside the 100,000-character pane limit', () => {
  const crew = [['conductor', 'other'], ['builder', 'medium'], ['fixer', 'heavy'], ['tester', 'light'], ['scout', 'careful'], ['plain', 'other']] as const
  let total = 0
  for (const p of PACKS) {
    total += p.css.length
    for (const [role, tier] of crew) total += compact(p.draw(0, 0, { role, tier }, { variant: p.variantOf(role), accent: ACCENT, isWalking: true })).length
  }
  expect(total < 95_000).toBe(true)
})
