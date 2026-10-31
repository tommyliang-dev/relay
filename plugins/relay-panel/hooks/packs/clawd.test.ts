import { expect, test } from 'claude-code/testing'
import { COSTUME_NAMES, CLAWD_BOX, CLAWD_H, costumeOf, clawd } from './clawd'
import { ROLES, type Role, TIERS, type Tier } from './types'

const ACCENT = '#378ADD'

const clawdOf = (role: string, tier: string, accent = ACCENT) =>
  clawd.draw(0, 0, { role: role as Role, tier: tier as Tier }, { variant: 'clay', accent })

// The drawing without its outer wrapper and costume class, to compare looks.
const pixels = (svg: string) => svg.replace(/class="c-[\w-]+( run)?"/, '')

test('clawd: pack metadata', () => {
  expect(clawd.id).toBe('clawd')
  expect(clawd.name).toBe('Clawd')
  expect(clawd.w).toBe(30)
  expect(clawd.w).toBe(CLAWD_BOX)
  expect(clawd.h).toBe(28)
  expect(clawd.h).toBe(CLAWD_H)
  expect(clawd.roles).toBe(ROLES)
  expect(clawd.variants.length).toBe(1)
  expect(clawd.variants[0]).toBe('clay')
  for (const key of ['', 'a', 'agent-7', 'x'.repeat(100)]) expect(clawd.variantOf(key)).toBe('clay')
})

test('clawd: every tier costume draws something distinct', () => {
  const seen = new Set<string>()
  for (const tier of TIERS) {
    const svg = clawdOf('builder', tier)
    expect(svg).toContain(`class="c-${tier === 'other' ? 'plain' : tier}"`)
    expect(svg).toContain('<rect')
    seen.add(pixels(svg))
  }
  seen.add(pixels(clawdOf('scout', 'medium')))
  expect(seen.size).toBe(TIERS.length + 1)
  expect(COSTUME_NAMES.length).toBe(7)
})

test('clawd: a scout wears the pirate whatever its tier', () => {
  for (const tier of TIERS) {
    expect(costumeOf({ role: 'scout', tier })).toBe('scout')
    expect(clawdOf('scout', tier)).toContain('class="c-scout"')
  }
  for (const role of ROLES.filter(r => r !== 'scout')) expect(costumeOf({ role, tier: 'heavy' })).toBe('heavy')
})

test('clawd: the expert tier wears the astronaut, and its former name fable does too', () => {
  expect(costumeOf({ role: 'builder', tier: 'expert' })).toBe('expert')
  expect(costumeOf({ role: 'builder', tier: 'fable' as Tier })).toBe('expert')
  expect(clawdOf('builder', 'fable')).toBe(clawdOf('builder', 'expert'))
  expect(clawdOf('builder', 'expert')).toContain('class="c-expert"')
})

test('clawd: unknown tier draws the plain crab', () => {
  expect(costumeOf({ role: 'builder', tier: 'nope' as Tier })).toBe('plain')
  expect(costumeOf({ role: 'builder', tier: 'toString' as Tier })).toBe('plain')
  const svg = clawdOf('builder', 'nope')
  expect(svg).toContain('class="c-plain"')
  expect(pixels(svg)).toBe(pixels(clawdOf('builder', 'other')))
})

test('clawd: the accent colours every tier costume', () => {
  for (const tier of ['expert', 'heavy', 'careful', 'medium', 'light']) {
    expect(clawdOf('builder', tier, '#123456')).toContain('fill="#123456"')
    expect(clawdOf('builder', tier, '#ABCDEF')).toContain('fill="#ABCDEF"')
  }
  expect(clawdOf('builder', 'other', '#123456')).not.toContain('#123456')
})

test('clawd: walking, dim, scale and mirror', () => {
  const who = { role: 'builder' as Role, tier: 'medium' as Tier }
  expect(clawd.draw(0, 0, who, { variant: 'clay', accent: ACCENT, isWalking: true })).toContain('class="c-medium run"')
  expect(clawd.draw(0, 0, who, { variant: 'clay', accent: ACCENT, dim: true })).toContain('opacity="0.45"')
  expect(clawd.draw(5, 2, who, { variant: 'clay', accent: ACCENT })).toContain('transform="translate(5,2) scale(1)"')
  expect(clawd.draw(5, 2, who, { variant: 'clay', accent: ACCENT, scale: 2, mirror: true })).toContain('transform="translate(65,2) scale(-2,2)"')
})

test('clawd: css is scoped', () => {
  expect(clawd.css.startsWith('<style>') && clawd.css.endsWith('</style>')).toBe(true)
  const rules = clawd.css
    .replace(/<\/?style>/g, '')
    .replace(/@keyframes[^{]+\{([^{}]*\{[^}]*\})*\}/g, '')
    .replace(/@media[^{]+\{/g, '')
  for (const sel of [...rules.matchAll(/([^{}]+)\{[^}]*\}/g)].map(m => m[1].trim()).filter(Boolean))
    for (const part of sel.split(',')) expect(part.trim().startsWith('.p-clawd ')).toBe(true)
  for (const [, name] of clawd.css.matchAll(/@keyframes\s+([\w-]+)/g)) expect(name.startsWith('clawd-')).toBe(true)
  expect(clawd.css).toContain('prefers-reduced-motion')
  expect(clawd.css).toContain('.p-clawd .run g{animation:none!important}')
})
