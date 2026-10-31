import { expect, test } from 'claude-code/testing'
import { VARIANTS, XMAS_H, XMAS_W, christmas } from './christmas'
import { type DrawOptions, ROLES, type Role, TIERS, type Tier } from './types'

const ACCENT = '#378ADD'

const figure = (x: number, y: number, role: string, o: DrawOptions) => christmas.draw(x, y, { role: role as Role, tier: 'medium' }, o)

const rects = (svg: string) =>
  [...svg.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number))

// The rects inside one group class, up to its closing tag (leaf groups hold no nested groups).
const group = (svg: string, cls: string) => svg.match(new RegExp(`<g class="${cls}">(.*?)</g>`))?.[1] ?? ''

test('christmas: pack metadata', () => {
  expect(christmas.id).toBe('christmas')
  expect(christmas.name).toBe('Christmas')
  expect(christmas.w).toBe(32)
  expect(christmas.h).toBe(28)
  expect(christmas.roles.length).toBe(6)
  for (const r of christmas.roles) expect(ROLES.includes(r)).toBe(true)
  expect(christmas.variants).toBe(VARIANTS)
  expect(christmas.variants.length).toBe(6)
  expect([...christmas.variants]).toEqual(['brown', 'dark-brown', 'tan', 'grey', 'white', 'rudolph'])
})

test('christmas: variantOf is stable, in range and spreads across variants', () => {
  expect(christmas.variantOf('')).toBe('brown')
  for (const key of ['', 'a', 'agent-1', 'task:42', 'x'.repeat(200)]) {
    expect(christmas.variantOf(key)).toBe(christmas.variantOf(key))
    expect(christmas.variants.includes(christmas.variantOf(key))).toBe(true)
  }
  const ids = Array.from({ length: 24 }, (_, i) => `agent-${i}-a${(i * 7919).toString(16)}`)
  expect(new Set(ids.map(christmas.variantOf)).size >= 4).toBe(true)
})

test('christmas: every role, tier and variant draws a scoped group inside the grid', () => {
  for (const role of ROLES)
    for (const variant of christmas.variants)
      for (const tier of TIERS) {
        const svg = christmas.draw(0, 0, { role, tier }, { variant, accent: ACCENT })
        expect(svg.startsWith('<g class="p-christmas">')).toBe(true)
        expect(svg.endsWith('</g>')).toBe(true)
        expect(svg).toContain(`class="c-${role} v-${variant}"`)
        const all = rects(svg)
        expect(all.length > 20).toBe(true)
        for (const [x, y, w, h] of all) {
          expect(x >= 0 && x + w <= XMAS_W).toBe(true)
          expect(y >= 0 && y + h <= XMAS_H).toBe(true)
        }
      }
})

test('christmas: the accent tints every character and the tier changes nothing else', () => {
  for (const role of ROLES)
    for (const variant of christmas.variants) {
      const a = christmas.draw(0, 0, { role, tier: 'expert' }, { variant, accent: ACCENT })
      expect(a).toBe(christmas.draw(0, 0, { role, tier: 'light' }, { variant, accent: ACCENT }))
      expect(a).toContain(ACCENT)
      const other = christmas.draw(0, 0, { role, tier: 'light' }, { variant, accent: '#BA7517' })
      expect(other).toContain('#BA7517')
      expect(other.includes(ACCENT)).toBe(false)
    }
})

test('christmas: each role is its own character', () => {
  const bodies = new Set(ROLES.map(role => group(figure(0, 0, role, { variant: 'brown', accent: ACCENT }), 'bd')))
  expect(bodies.size).toBe(ROLES.length)
  // Santa and Mrs Claus ignore the variant; the gingerbread, nutcracker, elf and reindeer wear it
  const same = (role: string) =>
    figure(0, 0, role, { variant: 'brown', accent: ACCENT }) === figure(0, 0, role, { variant: 'white', accent: ACCENT }).replace('v-white', 'v-brown')
  for (const role of ['conductor', 'tester']) expect(same(role)).toBe(true)
  for (const role of ['builder', 'fixer', 'scout', 'plain']) expect(same(role)).toBe(false)
})

test('christmas: every character walks on two leg groups', () => {
  for (const role of ROLES) {
    const svg = figure(0, 0, role, { variant: 'grey', accent: ACCENT })
    expect(rects(group(svg, 'la')).length > 0).toBe(true)
    expect(rects(group(svg, 'lb')).length > 0).toBe(true)
  }
})

test('christmas: the tester ticks three boxes in turn', () => {
  const svg = figure(0, 0, 'tester', { variant: 'grey', accent: ACCENT })
  for (const c of ['c1', 'c2', 'c3']) expect(rects(group(svg, c)).length).toBe(1)
  for (const [c, at] of [['c1', 25], ['c2', 50], ['c3', 75]] as const) {
    expect(christmas.css).toContain(`.p-christmas .c-tester.run .${c}{animation:christmas-t${c[1]} 1s steps(1) infinite}`)
    expect(christmas.css).toContain(`@keyframes christmas-t${c[1]}{0%{opacity:0}${at}%{opacity:1}}`)
  }
})

test('christmas: the reindeer has antlers, a bell and a nose group; only rudolph glows', () => {
  for (const variant of christmas.variants) {
    const svg = figure(0, 0, 'plain', { variant, accent: ACCENT })
    expect(rects(group(svg, 'ns')).length > 0).toBe(true)
    expect(rects(group(svg, 'bl')).length > 0).toBe(true)
    expect(rects(group(svg, 'tl')).length > 0).toBe(true)
    expect(svg).toContain('#E8DCBE') // pale bone antlers on every coat
  }
  expect(group(figure(0, 0, 'plain', { variant: 'rudolph', accent: ACCENT }), 'ns')).toContain('#FF2F2A')
  expect(group(figure(0, 0, 'plain', { variant: 'brown', accent: ACCENT }), 'ns').includes('#FF2F2A')).toBe(false)
  expect(christmas.css).toContain('.p-christmas .v-rudolph.run .ns{animation:christmas-glow')
})

test('christmas: placement, mirror, dim, walking and fallbacks', () => {
  const plain = figure(10, 4, 'builder', { variant: 'tan', accent: ACCENT })
  expect(plain).toContain('transform="translate(10,4) scale(1)"')
  expect(plain).toContain('opacity="1"')
  const mirrored = figure(10, 4, 'builder', { variant: 'tan', accent: ACCENT, mirror: true, scale: 2 })
  expect(mirrored).toContain(`transform="translate(${10 + XMAS_W * 2},4) scale(-2,2)"`)
  expect(mirrored === plain).toBe(false)
  expect(figure(0, 0, 'tester', { variant: 'grey', accent: ACCENT, dim: true })).toContain('opacity="0.45"')
  expect(figure(0, 0, 'tester', { variant: 'grey', accent: ACCENT, isWalking: true })).toContain('class="c-tester v-grey run"')
  expect(figure(0, 0, 'nope', { variant: 'plaid', accent: ACCENT })).toBe(figure(0, 0, 'plain', { variant: 'brown', accent: ACCENT }))
  const odd = christmas.draw(0, 0, { role: 'nope' as Role, tier: 'nope' as Tier }, { variant: 'plaid', accent: ACCENT })
  expect(odd.startsWith('<g class="p-christmas">')).toBe(true)
})

test('christmas: cached markup is identical and runs merge into wide rects', () => {
  const a = figure(0, 0, 'fixer', { variant: 'tan', accent: '#7F77DD' })
  const b = figure(0, 0, 'fixer', { variant: 'tan', accent: '#7F77DD' })
  expect(a).toBe(b)
  expect(rects(figure(0, 0, 'conductor', { variant: 'brown', accent: ACCENT })).some(([, , w]) => w > 6)).toBe(true)
})

test('christmas: css is one style block scoped under .p-christmas with christmas- keyframes', () => {
  expect(christmas.css.startsWith('<style>') && christmas.css.endsWith('</style>')).toBe(true)
  const lines = christmas.css
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== '<style>' && l !== '</style>' && !l.startsWith('@keyframes') && !l.startsWith('@media'))
  expect(lines.length > 0).toBe(true)
  for (const l of lines) expect(l.startsWith('.p-christmas ')).toBe(true)
  const frames = [...christmas.css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1])
  expect(frames.length > 0).toBe(true)
  for (const f of frames) expect(f.startsWith('christmas-')).toBe(true)
  const used = [...christmas.css.matchAll(/animation:\s*([\w-]+)/g)].map(m => m[1]).filter(n => n !== 'none')
  for (const n of used) expect(frames.includes(n)).toBe(true)
  // props swap between drawn poses, the lantern flickers, the bell rings; nothing rotates or scales
  for (const sel of ['.run .it', '.run .iu', '.c-tester.run .c3', '.c-scout.run .fl', '.run .bl'])
    expect(christmas.css).toContain(`.p-christmas ${sel}{`)
  expect(christmas.css).not.toMatch(/rotate|scale\(/)
  expect(christmas.css).toContain('prefers-reduced-motion')
  expect(christmas.css).toContain('.p-christmas .run,.p-christmas .run g{animation:none!important}')
})
