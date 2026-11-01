// One contract test for every pack in the registry. A new pack is covered as soon as it is in PACKS.
import { expect, test } from 'claude-code/testing'
import { compact } from './compact'
import { DEFAULT_PACK, PACKS, SEASONAL_IDS, everydayPacks, isSeasonalPack, packById, packIds, resolvePack, seasonalPacks } from './index'
import { isHoliday, shuffleCandidates } from './seasons'
import { ROLES, type DrawOptions, type Pack, type Role } from './types'

const ACCENT = '#378ADD'
const base: DrawOptions = { seed: 0, accent: ACCENT }

const draw = (p: Pack, role: string, o: Partial<DrawOptions> = {}) => p.draw(0, 0, { role: role as Role, tier: 'medium' }, { ...base, ...o })
const looks = (p: Pack, role: string, seeds: number[]) => new Set(seeds.map(seed => draw(p, role, { seed }).replace(/ v-[a-z-]+/g, '')))
const SEEDS = [0, 1, 2, 3, 4, 5]

test('registry: unique ids, a registered default, lookups fall back to it', () => {
  expect(new Set(packIds()).size).toBe(PACKS.length)
  expect(packIds()).toContain(DEFAULT_PACK)
  for (const p of PACKS) {
    expect(packById(p.id)).toBe(p)
    expect(resolvePack(p.id)).toBe(p)
  }
  expect(packById('nope')).toBe(undefined)
  for (const bad of ['nope', undefined, 42]) expect(resolvePack(bad).id).toBe(DEFAULT_PACK)
})

test('registry: everyday packs first, then the seasonal ones; winter is seasonal for display only', () => {
  expect(packIds()).toEqual(['clawd', 'cats', 'dogs', 'adventurers', 'winter', 'turkeys', 'christmas'])
  expect(SEASONAL_IDS).toEqual(['winter', 'turkeys', 'christmas'])
  expect(everydayPacks().map(p => p.id)).toEqual(['clawd', 'cats', 'dogs', 'adventurers'])
  expect(seasonalPacks().map(p => p.id)).toEqual(['winter', 'turkeys', 'christmas'])
  expect([...everydayPacks(), ...seasonalPacks()]).toEqual([...PACKS])
  expect(isSeasonalPack('winter') && isSeasonalPack('turkeys') && isSeasonalPack('christmas')).toBe(true)
  expect(isSeasonalPack('cats') || isSeasonalPack('nope')).toBe(false)
  // Winter is no holiday: it can still be shuffled to, while turkeys and christmas cannot.
  expect(isHoliday('winter')).toBe(false)
  expect(shuffleCandidates([], packIds())).toEqual(['clawd', 'cats', 'dogs', 'adventurers', 'winter'])
})

for (const pack of PACKS) {
  const open = `<g class="p-${pack.id}">`

  test(`${pack.id}: metadata, size and scoped css`, () => {
    expect(pack.name.length > 0).toBe(true)
    expect(pack.w > 0 && pack.h > 0).toBe(true)
    // The panel draws a sprite at full size up to 36x32.
    expect(pack.w <= 36 && pack.h <= 32).toBe(true)
    expect(pack.css).toContain(`.p-${pack.id}`)
    // A bare `.run`-style selector would restyle every other pack.
    expect(/^\s*\.(?!p-)[\w-]+\s*[{,]/m.test(pack.css)).toBe(false)
  })

  test(`${pack.id}: every role draws a scoped, clean group and the roles differ`, () => {
    const out = ROLES.map(role => draw(pack, role))
    for (const svg of out) {
      expect(svg.startsWith(open)).toBe(true)
      expect(svg).toContain('</g>')
      expect(svg).not.toContain('NaN')
      expect(svg).not.toContain('undefined')
    }
    expect(new Set(out).size).toBe(ROLES.length)
    expect(draw(pack, 'nope')).toBe(draw(pack, 'plain'))
  })

  test(`${pack.id}: options change the drawing`, () => {
    for (const role of ROLES) expect(draw(pack, role)).toBe(draw(pack, role))
    const plain = draw(pack, 'builder')
    expect(draw(pack, 'builder', { mirror: true })).not.toBe(plain)
    expect(draw(pack, 'builder', { scale: 2 })).not.toBe(plain)
    const dim = draw(pack, 'builder', { dim: true })
    expect(dim).not.toBe(plain)
    expect(dim).toContain('opacity')
    expect(plain).not.toContain(' run')
    expect(draw(pack, 'builder', { isWalking: true })).toContain(' run')
    expect(ROLES.some(role => draw(pack, role).toLowerCase().includes(ACCENT.toLowerCase()))).toBe(true)
  })

  test(`${pack.id}: the seed only changes the characters that read it`, () => {
    for (const role of ROLES) {
      const n = pack.id === 'christmas' && ['builder', 'scout', 'plain'].includes(role) ? 6 : 1
      expect(looks(pack, role, SEEDS).size).toBe(n)
    }
  })
}

test('gallery: all packs, six roles walking, stay under the 100,000-character pane limit', () => {
  let total = 0
  for (const p of PACKS) {
    const sprites = ROLES.map((role, i) => p.draw(i * (p.w + 4), 10, { role, tier: 'medium' }, { ...base, isWalking: true })).join('')
    total += compact(sprites).length + p.css.length
  }
  expect(total < 90000).toBe(true)
})
