import { expect, test } from 'claude-code/testing'
import { CAT_H, CAT_W, COAT_NAMES, cats } from './cats'
import { type DrawOptions, ROLES, type Role } from './types'

const ACCENT = '#378ADD'

const cat = (x: number, y: number, role: string, o: DrawOptions) => cats.draw(x, y, { role: role as Role, tier: 'medium' }, o)

const rects = (svg: string) =>
  [...svg.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number))

// The rects inside one group class, up to its closing tag (leg groups hold no nested groups).
const group = (svg: string, cls: string) => svg.match(new RegExp(`<g class="${cls}">(.*?)</g>`))?.[1] ?? ''

test('cats: pack metadata', () => {
  expect(cats.id).toBe('cats')
  expect(cats.name).toBe('British Shorthair cats')
  expect(cats.w).toBe(32)
  expect(cats.h).toBe(28)
  expect(cats.roles.length).toBe(7)
  expect(cats.variants).toBe(COAT_NAMES)
})

test('cats: variantOf is stable, in range and spreads across coats', () => {
  expect(cats.variants.length).toBe(8)
  expect(cats.variantOf('')).toBe('blue')
  const ids = Array.from({ length: 20 }, (_, i) => `agent-${i}-a${(i * 7919).toString(16)}`)
  for (const id of ids) {
    expect(cats.variantOf(id)).toBe(cats.variantOf(id))
    expect(cats.variants.includes(cats.variantOf(id))).toBe(true)
  }
  expect(new Set(ids.map(cats.variantOf)).size >= 5).toBe(true)
})

test('cats: every role and coat renders inside the grid', () => {
  for (const role of ROLES)
    for (const variant of cats.variants) {
      const svg = cat(0, 0, role, { variant, accent: ACCENT })
      expect(svg.startsWith('<g class="p-cats">')).toBe(true)
      expect(svg).toContain(`class="c-${role}"`)
      expect(svg).toContain(ACCENT)
      const all = rects(svg)
      expect(all.length > 0).toBe(true)
      for (const [x, y, w, h] of all) {
        expect(x >= 0 && x + w <= CAT_W).toBe(true)
        expect(y >= 0 && y + h <= CAT_H).toBe(true)
      }
    }
})

test('cats: tier does not change the drawing', () => {
  const o = { variant: 'lilac', accent: ACCENT }
  expect(cats.draw(0, 0, { role: 'developer', tier: 'fable' }, o)).toBe(cats.draw(0, 0, { role: 'developer', tier: 'light' }, o))
})

test('cats: runs merge into wide rects', () => {
  expect(rects(cat(0, 0, 'other', { variant: 'blue', accent: ACCENT })).some(([, , w]) => w > 1)).toBe(true)
})

test('cats: a held prop lifts the near front paw off the ground', () => {
  // The near front leg is drawn in `lb` at x >= 19; only the far back leg (x 10-13) shares it.
  const nearFront = (role: string) => rects(group(cat(0, 0, role, { variant: 'blue', accent: ACCENT }), 'lb')).some(([x]) => x >= 19)
  for (const role of ROLES.filter(c => c !== 'other')) expect(nearFront(role)).toBe(false)
  expect(nearFront('other')).toBe(true)
})

test('cats: placement, mirror, dim, walking and fallbacks', () => {
  const plain = cat(10, 4, 'developer', { variant: 'cream', accent: ACCENT })
  expect(plain).toContain('transform="translate(10,4) scale(1)"')
  expect(plain).toContain('opacity="1"')
  const mirrored = cat(10, 4, 'developer', { variant: 'cream', accent: ACCENT, mirror: true, scale: 2 })
  expect(mirrored).toContain(`transform="translate(${10 + CAT_W * 2},4) scale(-2,2)"`)
  expect(mirrored === plain).toBe(false)
  expect(cat(0, 0, 'planner', { variant: 'cream-van', accent: ACCENT, dim: true })).toContain('opacity="0.45"')
  expect(cat(0, 0, 'planner', { variant: 'cream-van', accent: ACCENT, isWalking: true })).toContain('class="c-planner run"')
  expect(cat(0, 0, 'nope', { variant: 'plaid', accent: ACCENT })).toBe(cat(0, 0, 'other', { variant: 'blue', accent: ACCENT }))
})

test('cats: cached markup is identical and CSS is one scoped style block', () => {
  const a = cat(0, 0, 'architect', { variant: 'lilac', accent: '#7F77DD' })
  const b = cat(0, 0, 'architect', { variant: 'lilac', accent: '#7F77DD' })
  expect(a).toBe(b)
  expect(cats.css.startsWith('<style>') && cats.css.endsWith('</style>')).toBe(true)
  expect(cats.css).toContain('.p-cats .c-planner.run .c3')
  expect(cats.css).toContain('animation:cats-tick')
  expect(cats.css).toContain('prefers-reduced-motion')
  expect(cats.css).toContain('.p-cats .run,.p-cats .run g{animation:none!important}')
})
