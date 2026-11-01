// Turkeys: pixel turkeys in profile (modelled on clawd.ts), drawn as SVG rects. Every role shares
// the same round body, blue head, gold beak, red snood and wattle, fanned tail and two legs.
// Cast: the role picks the heritage breed and the prop: conductor bronze (top hat, baton),
//   builder bourbon red (hard hat), fixer slate (bandana, mallet), tester white holland (test
//   tube), scout narragansett (explorer hat, flashlight), plain royal palm. The seed is ignored.
// Accent: one piece of each costume (hat band or stripe, bandana, tube rim, flashlight ring).
// Box: 36x28 grid units.
// Animation: CSS only; legs step, the body bobs, and each prop adds its own motion.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

const TURKEY_W = 36
const TURKEY_H = 28

const SKIN = '#AEC0D6'
const SKIN_O = '#56687F'
const RED = '#D23A2E'
const GOLD = '#E2B04F'
const INK = '#1F1E1D'
const PINK = '#C08476'
const DARK_LEG = '#8E6A5E'

// o outline, s shadow, b base, h highlight; tail: t base, T band, u tip; w wing bar; L legs;
// saddle: optional dark band across the back.
type Breed = { o: string; s: string; b: string; h: string; t: string; T: string; u: string; w: string; L: string; saddle?: string }

const BREEDS: Record<string, Breed> = {
  bronze: { o: '#2C1A0E', s: '#5A3519', b: '#7E4E26', h: '#A8713A', t: '#7A4B22', T: '#2A1A10', u: '#E8D8BC', w: '#E8D8BC', L: DARK_LEG },
  narragansett: { o: '#232328', s: '#45474E', b: '#676A72', h: '#8E9198', t: '#B89C70', T: '#232328', u: '#F1ECE2', w: '#F1ECE2', L: DARK_LEG },
  'bourbon-red': { o: '#4A190C', s: '#86301C', b: '#B04428', h: '#CF6B4A', t: '#F4EFE6', T: '#B04428', u: '#FBF8F2', w: '#F4EFE6', L: PINK },
  'white-holland': { o: '#9A958D', s: '#DAD6CE', b: '#F3F1EC', h: '#FFFFFF', t: '#F3F1EC', T: '#D4CFC5', u: '#FFFFFF', w: '#DAD6CE', L: PINK },
  'royal-palm': { o: '#8E8A84', s: '#D6D3CD', b: '#F2F0EB', h: '#FFFFFF', t: '#F2F0EB', T: '#24242A', u: '#FFFFFF', w: '#24242A', L: PINK, saddle: '#24242A' },
  slate: { o: '#333B47', s: '#5A6678', b: '#7D8A9E', h: '#A0ACBD', t: '#7D8A9E', T: '#3E4858', u: '#CFD6DF', w: '#CFD6DF', L: PINK },
}

// The role picks the breed. One table, easy to change; an unknown role is plain.
const BREED_OF: Record<string, string> = {
  conductor: 'bronze',
  builder: 'bourbon-red',
  fixer: 'slate',
  tester: 'white-holland',
  scout: 'narragansett',
  plain: 'royal-palm',
}

// `cls` puts a pixel in a named group: `bd` (default) is the body and costume,
// `la`/`lb` the leg pairs, anything else a prop with its own motion.
type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

const stamp = (f: Fill, x: number, y: number, rows: string[], map: Record<string, string>, cls?: string): void =>
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => map[ch] && f(x + dx, y + dy, 1, 1, map[ch] ?? '', cls)))

// Same shape for every bird; only the palette differs. Outlines go down first.
const FAN: [number, number, number][] = [[2, 10, 6], [4, 6, 11], [6, 4, 13], [8, 6, 11], [10, 9, 8]] // x, y, height of each 2-wide feather

const body = (f: Fill, p: Breed): void => {
  FAN.forEach(([x, y, h]) => f(x - 1, y - 1, 4, h + 2, p.o))
  f(8, 12, 16, 10, p.o); f(10, 10, 12, 2, p.o); f(20, 4, 6, 5, SKIN_O); f(19, 8, 5, 6, SKIN_O)
  FAN.forEach(([x, y, h]) => { f(x, y, 2, h, p.t); f(x, y, 2, 2, p.u); f(x, y + 3, 2, 2, p.T) })
  f(9, 13, 14, 8, p.b); f(11, 11, 10, 2, p.b); f(10, 21, 12, 1, p.s); f(11, 12, 6, 1, p.h)
  if (p.saddle) f(12, 12, 8, 2, p.saddle)
  f(12, 15, 7, 4, p.s); f(13, 16, 5, 1, p.w); f(13, 18, 5, 1, p.h)
  f(21, 8, 3, 6, SKIN); f(22, 5, 4, 4, SKIN)
  f(26, 7, 2, 2, GOLD); f(26, 9, 1, 3, RED); f(24, 9, 2, 1, RED); f(24, 6, 1, 1, INK)
  f(11, 22, 2, 5, p.L, 'la'); f(10, 26, 4, 1, p.L, 'la')
  f(17, 22, 2, 5, p.L, 'lb'); f(16, 26, 4, 1, p.L, 'lb')
}

// Pure CSS, run by the compositor. Periods divide one second so the once-a-second redraw
// of a running row restarts them in phase.
const TURKEY_CSS = `<style>
.p-turkeys .run g{transform-box:fill-box}
.p-turkeys .run .la{animation:turkeys-st .5s steps(1) infinite}
.p-turkeys .run .lb{animation:turkeys-st .5s steps(1) infinite -.25s}
.p-turkeys .run .bd{animation:turkeys-bob .5s steps(1) infinite -.125s}
@keyframes turkeys-st{50%{transform:translateY(-1px)}}
@keyframes turkeys-bob{50%{transform:translateY(1px)}}
.p-turkeys .t-conductor.run .it{transform-origin:0 100%;animation:turkeys-wave .5s ease-in-out infinite}
.p-turkeys .t-fixer.run .it{animation:turkeys-hop .5s ease-in-out infinite}
.p-turkeys .t-tester.run .it{animation:turkeys-hop 1s ease-in-out infinite}
.p-turkeys .t-tester.run .bu{animation:turkeys-bub 1s ease-in-out infinite}
.p-turkeys .t-scout.run .bm{animation:turkeys-flick 1s steps(1) infinite}
@keyframes turkeys-wave{50%{transform:rotate(-30deg)}}
@keyframes turkeys-hop{50%{transform:translateY(-2px)}}
@keyframes turkeys-bub{0%,100%{opacity:1}50%{opacity:.4;transform:translateY(-3px)}}
@keyframes turkeys-flick{50%{opacity:.7}}
@media (prefers-reduced-motion: reduce){.p-turkeys .run,.p-turkeys .run g{animation:none!important}}
</style>`

const COSTUMES: Record<string, (f: Fill, t: string, p: Breed) => void> = {
  // Conductor: top hat with an accent band; the baton waves.
  conductor: (f, t, p) => {
    body(f, p)
    f(21, 4, 6, 1, INK); f(22, 0, 4, 4, INK); f(22, 3, 4, 1, t)
    stamp(f, 26, 12, ['...k', '..k.', '.k..', 'k...'], { k: '#F4F3EE' }, 'it')
  },
  // Builder: yellow hard hat with an accent stripe.
  builder: (f, t, p) => {
    body(f, p)
    f(21, 4, 6, 1, '#C99A1E'); f(22, 2, 4, 2, '#F5C542'); f(23, 1, 2, 1, '#F5C542'); f(23, 2, 2, 1, t)
  },
  // Fixer: bandana with an accent knot and a peppermint mallet that taps up and down.
  fixer: (f, t, p) => {
    body(f, p)
    f(22, 5, 4, 1, t); f(21, 6, 1, 1, t); f(20, 7, 1, 2, t)
    stamp(f, 24, 12, ['OOOOO', 'ORWRO', 'ORWRO', 'OOOOO'], { O: '#7A0C1E', R: '#C8102E', W: '#F6F2EA' }, 'it')
    f(26, 16, 1, 6, '#8A5A2B', 'it')
  },
  // Tester: test tube (accent lip) with green liquid and a bubble, bobbing.
  tester: (f, t, p) => {
    body(f, p)
    f(22, 5, 4, 1, '#E6E8EE'); f(22, 6, 4, 1, 'rgba(169,214,245,.6)')
    const O = '#3D4752'
    f(24, 12, 6, 1, t, 'it')
    f(25, 13, 1, 8, O, 'it'); f(28, 13, 1, 8, O, 'it'); f(26, 13, 2, 3, '#D6EEF7', 'it'); f(26, 16, 2, 5, '#3FBF7F', 'it')
    f(26, 21, 2, 1, O, 'it')
    f(26, 18, 1, 1, '#B8F0D0', 'bu')
  },
  // Scout: wide explorer hat with an accent band and a flashlight whose beam flickers.
  scout: (f, t, p) => {
    body(f, p)
    f(20, 4, 8, 1, '#8A6A3A'); f(22, 2, 4, 2, '#B08A4E'); f(22, 3, 4, 1, t)
    f(22, 14, 4, 4, '#55514C'); f(26, 14, 1, 4, t); f(27, 14, 1, 4, '#F4F3EE')
    f(28, 15, 2, 2, 'rgba(255,243,176,.9)', 'bm'); f(30, 14, 3, 4, 'rgba(255,230,128,.65)', 'bm'); f(33, 13, 3, 6, 'rgba(255,213,74,.4)', 'bm')
  },
  plain: (f, _t, p) => body(f, p),
}

// Body and props nest inside `bd` so a prop rides the bob and adds its own motion;
// legs stay outside it and step on their own.
const build = (costume: string, accent: string): string => {
  const groups = new Map<string, string[]>([['bd', []]])
  const f: Fill = (cx, cy, w, h, c, cls = 'bd') => {
    if (!groups.has(cls)) groups.set(cls, [])
    groups.get(cls)?.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  COSTUMES[costume](f, accent, BREEDS[BREED_OF[costume]])
  const group = (cls: string) => `<g class="${cls}">${(groups.get(cls) ?? []).join('')}</g>`
  const props = [...groups.keys()].filter(k => k !== 'bd' && k !== 'la' && k !== 'lb')
  return `<g class="bd">${(groups.get('bd') ?? []).join('')}${props.map(group).join('')}</g>${group('la')}${group('lb')}`
}

const cache = new Map<string, string>()

const inner = (costume: string, accent: string): string => {
  const key = `${costume}|${accent}`
  let hit = cache.get(key)
  if (hit === undefined) {
    hit = build(costume, accent)
    cache.set(key, hit)
  }
  return hit
}

// `mirror` flips the bird inside its own box so it faces left. Role picks the breed.
const draw = (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions): string => {
  const name = Object.prototype.hasOwnProperty.call(COSTUMES, who.role) ? who.role : 'plain'
  const scale = o.scale ?? 1
  const place = o.mirror ? `translate(${x + TURKEY_W * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  return `<g class="p-turkeys"><g transform="${place}" opacity="${o.dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="t-${name}${o.isWalking ? ' run' : ''}">${inner(name, o.accent)}</g></g></g>`
}

export const turkeys: Pack = {
  id: 'turkeys',
  name: 'Thanksgiving turkeys',
  w: TURKEY_W,
  h: TURKEY_H,
  css: TURKEY_CSS,
  roles: ROLES,
  draw,
}
