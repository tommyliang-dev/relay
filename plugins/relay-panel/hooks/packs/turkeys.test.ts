import { expect, test } from 'claude-code/testing'
import { BREEDS, BREED_LABELS, TURKEY_H, TURKEY_W, breedOf, turkeys } from './turkeys'
import { type DrawOptions, ROLES, type Role, TIERS, type Tier } from './types'

const ACCENT = '#378ADD'

const turkey = (x: number, y: number, role: string, o: DrawOptions) => turkeys.draw(x, y, { role: role as Role, tier: 'medium' }, o)

const rects = (svg: string) =>
  [...svg.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number))

// The rects inside one group class, up to its closing tag (leaf groups hold no nested groups).
const group = (svg: string, cls: string) => svg.match(new RegExp(`<g class="${cls}">(.*?)</g>`))?.[1] ?? ''

test('turkeys: pack metadata', () => {
  expect(turkeys.id).toBe('turkeys')
  expect(turkeys.name).toBe('Thanksgiving turkeys')
  expect(turkeys.w).toBe(TURKEY_W)
  expect(turkeys.h).toBe(TURKEY_H)
  expect(TURKEY_W).toBe(32)
  expect(TURKEY_H).toBe(28)
  expect(turkeys.roles).toBe(ROLES)
  expect(turkeys.variants).toBe(BREEDS)
  expect(turkeys.variantOf).toBe(breedOf)
})

test('turkeys: six heritage breeds with labels', () => {
  expect(turkeys.variants.length).toBe(6)
  for (const b of ['bronze', 'narragansett', 'bourbon-red', 'white-holland', 'royal-palm', 'slate']) {
    expect(turkeys.variants.includes(b)).toBe(true)
    expect(BREED_LABELS[b].length > 0).toBe(true)
  }
})

test('turkeys: breedOf is stable, in range and spreads across breeds', () => {
  expect(breedOf('')).toBe(BREEDS[0])
  const ids = Array.from({ length: 20 }, (_, i) => `agent-${i}-a${(i * 7919).toString(16)}`)
  for (const id of ids) {
    expect(breedOf(id)).toBe(breedOf(id))
    expect(BREEDS.includes(breedOf(id))).toBe(true)
  }
  expect(new Set(ids.map(breedOf)).size >= 4).toBe(true)
})

test('turkeys: every role and breed draws inside the grid with the accent ribbon', () => {
  for (const role of ROLES)
    for (const variant of BREEDS) {
      const svg = turkey(0, 0, role, { variant, accent: ACCENT })
      expect(svg.startsWith('<g class="p-turkeys">')).toBe(true)
      expect(svg.endsWith('</g>')).toBe(true)
      expect(svg).toContain(`class="turkey t-${role}"`)
      expect(svg).toContain(`fill="${ACCENT}"`)
      const all = rects(svg)
      expect(all.length > 0).toBe(true)
      for (const [x, y, w, h] of all) {
        expect(x >= 0 && x + w <= TURKEY_W).toBe(true)
        expect(y >= 0 && y + h <= TURKEY_H).toBe(true)
      }
    }
})

test('turkeys: the ribbon sits in the same place on every costume', () => {
  // Accent rects live in the bobbing body group; the neck band spans x20-24 at y 10-11 (after DY).
  const bands = (role: string) =>
    rects(turkey(0, 0, role, { variant: 'bronze', accent: '#ABCDEF' }))
      .filter(([x, y, w]) => y === 10 && x === 20 && w === 5)
  for (const role of ROLES) expect(bands(role).length >= 1).toBe(true)
  // The band is drawn in the accent, so a different accent changes only those pixels.
  const a = turkey(0, 0, 'other', { variant: 'slate', accent: '#111111' })
  const b = turkey(0, 0, 'other', { variant: 'slate', accent: '#EEEEEE' })
  expect(a === b).toBe(false)
  expect(a.replaceAll('#111111', '#EEEEEE')).toBe(b)
})

test('turkeys: tier does not change the drawing', () => {
  const o = { variant: 'narragansett', accent: ACCENT }
  for (const tier of TIERS) expect(turkeys.draw(0, 0, { role: 'developer', tier }, o)).toBe(turkeys.draw(0, 0, { role: 'developer', tier: 'expert' }, o))
})

test('turkeys: unknown role, tier and variant fall back without throwing', () => {
  const svg = turkeys.draw(0, 0, { role: 'nope' as Role, tier: 'nope' as Tier }, { variant: 'plaid', accent: ACCENT })
  expect(svg).toBe(turkey(0, 0, 'other', { variant: BREEDS[0], accent: ACCENT }))
})

test('turkeys: the fan, legs and snood are their own animated groups', () => {
  const svg = turkey(0, 0, 'other', { variant: 'bronze', accent: ACCENT })
  for (const cls of ['tl', 'bd', 'la', 'lb', 'sn']) expect(svg).toContain(`<g class="${cls}">`)
  // The fan rises above the back: its top is higher than any body pixel.
  const tailTop = Math.min(...rects(group(svg, 'tl')).map(([, y]) => y))
  const bodyTop = Math.min(...rects(svg.slice(svg.indexOf('<g class="bd">'))).map(([, y]) => y))
  expect(tailTop < 10).toBe(true)
  expect(bodyTop <= tailTop).toBe(true) // the head rises above the fan
  // legs stand on the last row
  expect(rects(group(svg, 'la')).some(([, y]) => y === TURKEY_H - 1)).toBe(true)
  expect(rects(group(svg, 'lb')).some(([, y]) => y === TURKEY_H - 1)).toBe(true)
})

test('turkeys: a held prop lifts the wing to the same anchor on every costume', () => {
  // A held costume paints bronze wing pixels (outline, shadow or bar tone) past the breast,
  // at x >= 26 below the neck; the plain bird keeps its wing folded on the flank and no prop
  // borrows those tones.
  const BRONZE_WING = new Set(['#2C1A0E', '#5A3519', '#E8D8BC'])
  const tip = (role: string) =>
    [...turkey(0, 0, role, { variant: 'bronze', accent: ACCENT }).matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1" fill="([^"]+)"/g)].some(
      m => Number(m[2]) >= 19 && Number(m[1]) + Number(m[3]) >= 27 && BRONZE_WING.has(m[4]),
    )
  for (const role of ROLES.filter(c => c !== 'other')) expect(tip(role)).toBe(true)
  expect(tip('other')).toBe(false)
})

test('turkeys: placement, mirror, dim, walking and caching', () => {
  const plain = turkey(10, 4, 'developer', { variant: 'slate', accent: ACCENT })
  expect(plain).toContain('transform="translate(10,4) scale(1)"')
  expect(plain).toContain('opacity="1"')
  const mirrored = turkey(10, 4, 'developer', { variant: 'slate', accent: ACCENT, mirror: true, scale: 2 })
  expect(mirrored).toContain(`transform="translate(${10 + TURKEY_W * 2},4) scale(-2,2)"`)
  expect(mirrored === plain).toBe(false)
  expect(turkey(0, 0, 'planner', { variant: 'royal-palm', accent: ACCENT, dim: true })).toContain('opacity="0.45"')
  expect(turkey(0, 0, 'planner', { variant: 'royal-palm', accent: ACCENT, isWalking: true })).toContain('class="turkey t-planner run"')
  expect(turkey(0, 0, 'architect', { variant: 'bourbon-red', accent: '#7F77DD' })).toBe(turkey(0, 0, 'architect', { variant: 'bourbon-red', accent: '#7F77DD' }))
  expect(rects(plain).some(([, , w]) => w > 1)).toBe(true)
})

test('turkeys: white breeds keep a grey outline', () => {
  for (const [variant, grey] of [['white-holland', '#9A958D'], ['royal-palm', '#8E8A84'], ['bourbon-red', '#9A8E82']]) {
    const svg = turkey(0, 0, 'other', { variant, accent: ACCENT })
    expect(svg).toContain(`fill="${grey}"`)
    expect(/fill="#F[0-9A-F]{5}"/.test(svg)).toBe(true)
  }
})

test('turkeys: CSS is one scoped style block with turkeys-* keyframes', () => {
  const css = turkeys.css
  expect(css.startsWith('<style>') && css.endsWith('</style>')).toBe(true)
  const lines = css
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== '<style>' && l !== '</style>' && !l.startsWith('@keyframes') && !l.startsWith('@media'))
  expect(lines.length > 0).toBe(true)
  for (const l of lines) expect(l.startsWith('.p-turkeys')).toBe(true)
  const frames = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1])
  for (const f of frames) expect(f.startsWith('turkeys-')).toBe(true)
  const used = [...css.matchAll(/animation:\s*([\w-]+)/g)].map(m => m[1]).filter(n => n !== 'none')
  for (const n of used) expect(frames.includes(n)).toBe(true)
  for (const s of ['.p-turkeys .run .tl', '@keyframes turkeys-puff', '.p-turkeys .run .sn', '@keyframes turkeys-wobble', '.p-turkeys .t-planner.run .c3', '.p-turkeys .t-orchestrator.run .it'])
    expect(css).toContain(s)
  expect(css).toContain('.p-turkeys .run,.p-turkeys .run g{animation:none!important}')
})
