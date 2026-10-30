import { expect, test } from 'claude-code/testing'
import { COSTUME_NAMES, CRAB_BOX, CRAB_H, costumeOf, crabs } from './crabs'
import { ROLES, type Role, TIERS, type Tier } from './types'

const ACCENT = '#378ADD'

const crab = (role: string, tier: string, accent = ACCENT) =>
  crabs.draw(0, 0, { role: role as Role, tier: tier as Tier }, { variant: 'clay', accent })

// The drawing without its outer wrapper and costume class, to compare looks.
const pixels = (svg: string) => svg.replace(/class="c-[\w-]+( run)?"/, '')

test('crabs: pack metadata', () => {
  expect(crabs.id).toBe('crabs')
  expect(crabs.name).toBe('Pixel crabs')
  expect(crabs.w).toBe(30)
  expect(crabs.w).toBe(CRAB_BOX)
  expect(crabs.h).toBe(28)
  expect(crabs.h).toBe(CRAB_H)
  expect(crabs.roles).toBe(ROLES)
  expect(crabs.variants.length).toBe(1)
  expect(crabs.variants[0]).toBe('clay')
  for (const key of ['', 'a', 'agent-7', 'x'.repeat(100)]) expect(crabs.variantOf(key)).toBe('clay')
})

test('crabs: every tier costume draws something distinct', () => {
  const seen = new Set<string>()
  for (const tier of TIERS) {
    const svg = crab('developer', tier)
    expect(svg).toContain(`class="c-${tier}"`)
    expect(svg).toContain('<rect')
    seen.add(pixels(svg))
  }
  seen.add(pixels(crab('explore', 'medium')))
  expect(seen.size).toBe(TIERS.length + 1)
  expect(COSTUME_NAMES.length).toBe(7)
})

test('crabs: explore role wins over tier', () => {
  for (const tier of TIERS) {
    expect(costumeOf({ role: 'explore', tier })).toBe('explore')
    expect(crab('explore', tier)).toContain('class="c-explore"')
  }
  for (const role of ROLES.filter(r => r !== 'explore')) expect(costumeOf({ role, tier: 'heavy' })).toBe('heavy')
})

test('crabs: the expert tier wears the astronaut, and its former name fable does too', () => {
  expect(costumeOf({ role: 'developer', tier: 'expert' })).toBe('expert')
  expect(costumeOf({ role: 'developer', tier: 'fable' as Tier })).toBe('expert')
  expect(crab('developer', 'fable')).toBe(crab('developer', 'expert'))
  expect(crab('developer', 'expert')).toContain('class="c-expert"')
})

test('crabs: unknown tier draws the plain crab', () => {
  expect(costumeOf({ role: 'developer', tier: 'nope' as Tier })).toBe('other')
  expect(costumeOf({ role: 'developer', tier: 'toString' as Tier })).toBe('other')
  const svg = crab('developer', 'nope')
  expect(svg).toContain('class="c-other"')
  expect(pixels(svg)).toBe(pixels(crab('developer', 'other')))
})

test('crabs: the accent colours every tier costume', () => {
  for (const tier of ['expert', 'heavy', 'careful', 'medium', 'light']) {
    expect(crab('developer', tier, '#123456')).toContain('fill="#123456"')
    expect(crab('developer', tier, '#ABCDEF')).toContain('fill="#ABCDEF"')
  }
  expect(crab('developer', 'other', '#123456')).not.toContain('#123456')
})

test('crabs: walking, dim, scale and mirror', () => {
  const who = { role: 'developer' as Role, tier: 'medium' as Tier }
  expect(crabs.draw(0, 0, who, { variant: 'clay', accent: ACCENT, isWalking: true })).toContain('class="c-medium run"')
  expect(crabs.draw(0, 0, who, { variant: 'clay', accent: ACCENT, dim: true })).toContain('opacity="0.45"')
  expect(crabs.draw(5, 2, who, { variant: 'clay', accent: ACCENT })).toContain('transform="translate(5,2) scale(1)"')
  expect(crabs.draw(5, 2, who, { variant: 'clay', accent: ACCENT, scale: 2, mirror: true })).toContain('transform="translate(65,2) scale(-2,2)"')
})

test('crabs: css is scoped', () => {
  expect(crabs.css.startsWith('<style>') && crabs.css.endsWith('</style>')).toBe(true)
  const rules = crabs.css
    .replace(/<\/?style>/g, '')
    .replace(/@keyframes[^{]+\{([^{}]*\{[^}]*\})*\}/g, '')
    .replace(/@media[^{]+\{/g, '')
  for (const sel of [...rules.matchAll(/([^{}]+)\{[^}]*\}/g)].map(m => m[1].trim()).filter(Boolean))
    for (const part of sel.split(',')) expect(part.trim().startsWith('.p-crabs ')).toBe(true)
  for (const [, name] of crabs.css.matchAll(/@keyframes\s+([\w-]+)/g)) expect(name.startsWith('crabs-')).toBe(true)
  expect(crabs.css).toContain('prefers-reduced-motion')
  expect(crabs.css).toContain('.p-crabs .run g{animation:none!important}')
})
