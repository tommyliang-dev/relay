import { expect, test } from 'claude-code/testing'
import { BREEDS, DOG_H, DOG_W, breedOf, dogs } from './dogs'
import { type DrawOptions, ROLES, type Role } from './types'

const ACCENT = '#378ADD'

const dog = (x: number, y: number, role: string, o: DrawOptions) => dogs.draw(x, y, { role: role as Role, tier: 'medium' }, o)

const rects = (svg: string) =>
  [...svg.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number))

test('dogs: pack metadata', () => {
  expect(dogs.id).toBe('dogs')
  expect(dogs.name).toBe('Pixel dogs')
  expect(dogs.w).toBe(DOG_W)
  expect(dogs.h).toBe(DOG_H)
  expect(dogs.roles).toBe(ROLES)
  expect(dogs.variants).toBe(BREEDS)
  expect(dogs.variantOf).toBe(breedOf)
})

test('dogs: six breeds', () => {
  expect(dogs.variants.length).toBe(6)
  for (const b of ['corgi', 'husky', 'samoyed', 'bichon', 'maltese', 'shiba']) expect(dogs.variants.includes(b)).toBe(true)
})

test('dogs: breedOf is stable, in range and spreads across breeds', () => {
  expect(breedOf('')).toBe(BREEDS[0])
  const ids = Array.from({ length: 20 }, (_, i) => `agent-${i}-a${(i * 7919).toString(16)}`)
  for (const id of ids) {
    expect(breedOf(id)).toBe(breedOf(id))
    expect(BREEDS.includes(breedOf(id))).toBe(true)
  }
  expect(new Set(ids.map(breedOf)).size >= 4).toBe(true)
})

test('dogs: every role and breed draws inside the grid with the accent collar', () => {
  for (const role of ROLES)
    for (const variant of BREEDS) {
      const svg = dog(0, 0, role, { variant, accent: ACCENT })
      expect(svg.startsWith('<g class="p-dogs">')).toBe(true)
      expect(svg).toContain(`class="dog d-${role}"`)
      expect(svg).toContain(`fill="${ACCENT}"`)
      const all = rects(svg)
      expect(all.length > 0).toBe(true)
      for (const [x, y, w, h] of all) {
        expect(x >= 0 && x + w <= DOG_W).toBe(true)
        expect(y >= 0 && y + h <= DOG_H).toBe(true)
      }
    }
})

test('dogs: tier does not change the drawing', () => {
  const o = { variant: 'husky', accent: ACCENT }
  expect(dogs.draw(0, 0, { role: 'developer', tier: 'expert' }, o)).toBe(dogs.draw(0, 0, { role: 'developer', tier: 'light' }, o))
})

test('dogs: placement, mirror, dim, walking and fallbacks', () => {
  const plain = dog(10, 4, 'developer', { variant: 'shiba', accent: ACCENT })
  expect(plain).toContain('transform="translate(10,4) scale(1)"')
  expect(plain).toContain('opacity="1"')
  const mirrored = dog(10, 4, 'developer', { variant: 'shiba', accent: ACCENT, mirror: true, scale: 2 })
  expect(mirrored).toContain(`transform="translate(${10 + DOG_W * 2},4) scale(-2,2)"`)
  expect(dog(0, 0, 'planner', { variant: 'corgi', accent: ACCENT, dim: true })).toContain('opacity="0.45"')
  expect(dog(0, 0, 'planner', { variant: 'corgi', accent: ACCENT, isWalking: true })).toContain('class="dog d-planner run"')
  expect(dog(0, 0, 'nope', { variant: 'plaid', accent: ACCENT })).toBe(dog(0, 0, 'other', { variant: BREEDS[0], accent: ACCENT }))
})

test('dogs: CSS is one scoped style block with dogs-* keyframes', () => {
  expect(dogs.css.startsWith('<style>') && dogs.css.endsWith('</style>')).toBe(true)
  expect(dogs.css).toContain('.p-dogs .d-planner.run .c3')
  expect(dogs.css).toContain('animation:dogs-tick')
  expect(dogs.css).toContain('.p-dogs .dog.run .tl')
  expect(dogs.css).toContain('@keyframes dogs-wag')
  expect(dogs.css).toContain('.p-dogs .run,.p-dogs .run g{animation:none!important}')
  expect(/animation:(?!dogs-|none)/.test(dogs.css)).toBe(false)
})
