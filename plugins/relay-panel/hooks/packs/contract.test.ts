// Every pack in the registry must honour the Pack contract. New packs are covered automatically.
import { expect, test } from 'claude-code/testing'
import { DEFAULT_PACK, PACKS, allPackCss, packById, packIds, resolvePack } from './index'
import { ROLES, type Role, TIERS, type Tier } from './types'

const ACCENT = '#378ADD'

test('registry: ids, lookup, fallback and css', () => {
  expect(packIds().length).toBe(PACKS.length)
  expect(new Set(packIds()).size).toBe(PACKS.length)
  expect(packIds().includes(DEFAULT_PACK)).toBe(true)
  for (const p of PACKS) expect(packById(p.id)).toBe(p)
  expect(packById('nope')).toBe(undefined)
  expect(resolvePack('nope').id).toBe(DEFAULT_PACK)
  expect(resolvePack(undefined).id).toBe(DEFAULT_PACK)
  expect(resolvePack(42).id).toBe(DEFAULT_PACK)
  for (const p of PACKS) {
    expect(resolvePack(p.id)).toBe(p)
    expect(allPackCss()).toContain(p.css)
  }
})

for (const pack of PACKS) {
  const variant = pack.variants[0]
  const open = `<g class="p-${pack.id}">`

  test(`${pack.id}: metadata`, () => {
    expect(pack.name.length > 0).toBe(true)
    expect(pack.w > 0 && pack.h > 0).toBe(true)
    expect(pack.variants.length > 0).toBe(true)
    for (const r of pack.roles) expect(ROLES.includes(r)).toBe(true)
  })

  test(`${pack.id}: every role and tier draws a scoped group`, () => {
    for (const role of ROLES)
      for (const tier of TIERS) {
        const svg = pack.draw(0, 0, { role, tier }, { variant, accent: ACCENT })
        expect(svg.startsWith(open)).toBe(true)
        expect(svg.endsWith('</g>')).toBe(true)
        expect(svg.length > open.length + 4).toBe(true)
      }
  })

  test(`${pack.id}: unknown role, tier and variant do not throw`, () => {
    const svg = pack.draw(0, 0, { role: 'nope' as Role, tier: 'nope' as Tier }, { variant: 'plaid', accent: ACCENT })
    expect(svg.startsWith(open)).toBe(true)
  })

  test(`${pack.id}: variantOf is stable and returns a variant`, () => {
    for (const key of ['', 'a', 'agent-1', 'task:42', 'x'.repeat(200)]) {
      expect(pack.variantOf(key)).toBe(pack.variantOf(key))
      expect(pack.variants.includes(pack.variantOf(key))).toBe(true)
    }
  })

  test(`${pack.id}: css is scoped under .p-${pack.id}`, () => {
    expect(pack.css.startsWith('<style>') && pack.css.endsWith('</style>')).toBe(true)
    const lines = pack.css
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && l !== '<style>' && l !== '</style>' && !l.startsWith('@keyframes') && !l.startsWith('@media'))
    expect(lines.length > 0).toBe(true)
    for (const l of lines) expect(l.startsWith(`.p-${pack.id}`)).toBe(true)
    const frames = [...pack.css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1])
    for (const f of frames) expect(f.startsWith(`${pack.id}-`)).toBe(true)
    // every animation refers to one of the pack's own keyframes
    const used = [...pack.css.matchAll(/animation:\s*([\w-]+)/g)].map(m => m[1]).filter(n => n !== 'none')
    for (const n of used) expect(frames.includes(n)).toBe(true)
  })

  test(`${pack.id}: mirror and scale change the transform, dim lowers opacity`, () => {
    const who = { role: 'builder' as Role, tier: 'medium' as Tier }
    const transform = (s: string) => s.match(/transform="([^"]+)"/)?.[1]
    const opacity = (s: string) => Number(s.match(/opacity="([\d.]+)"/)?.[1] ?? 1)
    const plain = pack.draw(10, 4, who, { variant, accent: ACCENT })
    const mirrored = pack.draw(10, 4, who, { variant, accent: ACCENT, mirror: true })
    const scaled = pack.draw(10, 4, who, { variant, accent: ACCENT, scale: 2 })
    const dim = pack.draw(10, 4, who, { variant, accent: ACCENT, dim: true })
    expect(transform(plain) === undefined).toBe(false)
    expect(transform(mirrored) === transform(plain)).toBe(false)
    expect(transform(scaled) === transform(plain)).toBe(false)
    expect(opacity(dim) < opacity(plain)).toBe(true)
  })
}
