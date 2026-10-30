// Pixel Clawd from DockCrab (Clawdy): a 24x18 crab on a 30x28 grid, one costume per tier.
// The body keeps the brand clay; the tier's colour lives in the costume's accent.
// Drawing copied unchanged from the stock savvy-progress panel; only the CSS is scoped.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

export const CRAB_BOX = 30
export const CRAB_H = 28

const CLAY = '#D97757'
const INK = '#1F1E1D'

// `cls` puts a pixel in a named group: `bd` (the default) is the body and its
// costume, `la`/`lb` the leg pairs, anything else a prop with its own motion.
type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

const stamp = (f: Fill, x: number, y: number, rows: string[], map: Record<string, string>, cls?: string): void =>
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => map[ch] && f(x + dx, y + dy, 1, 1, map[ch] ?? '', cls)))

// `armCls` lets a raised claw travel with the prop it holds.
const crabBody = (f: Fill, armFront = 0, armCls?: string): void => {
  f(7, 10, 16, 12, CLAY)
  f(3, 14, 4, 4, CLAY)
  f(23, 14 + armFront, 4, 4, CLAY, armCls)
  f(9, 12, 2, 2, INK)
  f(19, 12, 2, 2, INK)
  f(7, 22, 2, 4, CLAY, 'la')
  f(17, 22, 2, 4, CLAY, 'la')
  f(11, 22, 2, 4, CLAY, 'lb')
  f(21, 22, 2, 4, CLAY, 'lb')
}

// Pure CSS, run by the compositor: no redraws. Periods divide one second, so the
// once-a-second redraw of a running row restarts them in phase. Every crab walks;
// each costume adds its prop's own motion on top.
const CRAB_CSS = `<style>
.p-crabs .run .la{animation:crabs-st .5s steps(1) infinite}
.p-crabs .run .lb{animation:crabs-st .5s steps(1) infinite -.25s}
.p-crabs .run .bd{animation:crabs-bob .5s steps(1) infinite -.125s}
.p-crabs .run g{transform-box:fill-box}
@keyframes crabs-st{50%{transform:translateY(-1px)}}
@keyframes crabs-bob{50%{transform:translateY(1px)}}
.p-crabs .c-expert.run{animation:crabs-float 1s ease-in-out infinite}
.p-crabs .c-expert.run .la,.p-crabs .c-expert.run .lb,.p-crabs .c-expert.run .bd{animation:none}
.p-crabs .c-expert.run .ant{animation:crabs-blink 1s steps(1) infinite}
.p-crabs .c-expert.run .star{animation:crabs-blink .5s steps(1) infinite -.25s}
@keyframes crabs-float{50%{transform:translateY(-2px)}}
@keyframes crabs-blink{50%{opacity:.15}}
.p-crabs .c-heavy.run .it{animation:crabs-scan 1s steps(1) infinite}
.p-crabs .c-heavy.run .gl{animation:crabs-blink 1s steps(1) infinite -.5s}
@keyframes crabs-scan{25%{transform:translate(-1px,1px)}50%{transform:translate(-2px,2px)}75%{transform:translate(-1px,1px)}}
.p-crabs .c-careful.run .it{transform-origin:100% 100%;animation:crabs-twist .5s ease-in-out infinite}
@keyframes crabs-twist{50%{transform:rotate(-35deg)}}
.p-crabs .c-medium.run .pan{transform-origin:0 50%;animation:crabs-tilt 1s ease-in-out infinite}
.p-crabs .c-medium.run .egg{animation:crabs-flip 1s ease-in-out infinite}
@keyframes crabs-tilt{20%,40%{transform:rotate(-12deg)}}
@keyframes crabs-flip{30%{transform:translateY(-5px) scaleY(-1)}60%{transform:translateY(0)}}
.p-crabs .c-light.run .la{animation-duration:.25s}
.p-crabs .c-light.run .lb{animation-duration:.25s;animation-delay:-.125s}
.p-crabs .c-light.run .flag{transform-origin:0 50%;animation:crabs-wave .25s steps(1) infinite}
@keyframes crabs-wave{50%{transform:skewY(-12deg) scaleX(.85)}}
.p-crabs .c-explore.run .it{transform-origin:50% 100%;animation:crabs-fence .5s ease-in-out infinite}
@keyframes crabs-fence{50%{transform:rotate(25deg)}}
@media (prefers-reduced-motion: reduce){.p-crabs .run,.p-crabs .run g{animation:none!important}}
</style>`

const COSTUMES: Record<string, (f: Fill, t: string) => void> = {
  // Expert: astronaut in a glass dome; floats instead of walking, the antenna and the star blink.
  expert: (f, t) => {
    crabBody(f)
    f(6, 7, 18, 1, '#E6E8EE'); f(5, 8, 1, 14, '#E6E8EE'); f(24, 8, 1, 14, '#E6E8EE'); f(6, 22, 18, 1, '#C9CCD2')
    f(6, 8, 18, 14, 'rgba(169,214,245,.32)'); f(8, 9, 2, 1, '#fff'); f(8, 10, 1, 2, '#fff')
    f(14, 4, 2, 3, '#C9CCD2'); f(14, 2, 2, 2, t, 'ant'); f(13, 18, 4, 2, t)
    f(27, 3, 1, 3, '#F5C542', 'star'); f(26, 4, 3, 1, '#F5C542', 'star')
  },
  // Heavy: detective with a deerstalker; the magnifier sweeps and glints.
  heavy: (f, t) => {
    crabBody(f, -4, 'it')
    stamp(f, 6, 3, ['......bbbbbb......', '....bbcbbcbbbb....', '...bbbbbbbbbbbb...', '..bcbbcbbcbbcbbb..', '.bbbbbbbbbbbbbbbb.', 'dddddddddddddddddd'], { b: '#7A4A26', c: '#A0703F', d: '#5A3519' })
    f(6, 9, 18, 1, t)
    stamp(f, 23, 1, ['.kkk.', 'k...k', 'k...k', 'k...k', '.kkk.'], { k: '#3A3A3C' }, 'it')
    f(24, 2, 3, 3, 'rgba(169,214,245,.7)', 'it'); f(25, 6, 1, 4, '#7A4A26', 'it'); f(24, 2, 1, 1, '#fff', 'gl')
  },
  // Careful: engineer in a hard hat; the wrench turns a bolt.
  careful: (f, t) => {
    crabBody(f)
    stamp(f, 6, 4, ['.....yyyyyyyy.....', '...yyyyyhhyyyyy...', '..yyyyyyhhyyyyyy..', '..yyyyyyhhyyyyyy..', '.yyyyyyyhhyyyyyyy.', 'dddddddddddddddddd'], { y: '#F5C542', h: '#FBE08A', d: '#C99A1E' })
    f(13, 5, 4, 2, t)
    stamp(f, 0, 10, ['.s.s', 'sss.', '.s..', '.s..'], { s: '#8E929A' }, 'it')
  },
  // Medium: chef, the toque traced from DockCrab's Sprites.chefHat; tosses the omelette.
  medium: (f, t) => {
    crabBody(f, -4, 'pan')
    stamp(f, 6, 0, ['........lll.......', '.......lllll......', '.wwwwgwwwwwwgwwwww', 'wwwwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwww', 'wwwwwgwwwwwggwwwww', '.wwwwgwwwwwggwwwww', '.dddbbbbbbbbbbbbb.', '.dddbbbbbbbbbbbbb.', '.dddbbbbbbbbbbbbb.'], { w: '#F4F3EE', l: '#F7F6F2', g: '#D2D1C8', b: t, d: '#B45F43' })
    f(22, 8, 7, 2, '#4A4A48', 'pan'); f(26, 10, 1, 1, '#4A4A48', 'pan'); f(24, 7, 3, 1, '#F5B731', 'egg')
  },
  // Light: racer in a helmet; runs at double pace, the checkered flag flutters.
  light: (f, t) => {
    crabBody(f, -4)
    stamp(f, 6, 5, ['....rrrrrrrrrr....', '..rrrrrrwwrrrrrr..', '.rrrrrrrwwrrrrrrr.', '.rrrrrrrwwrrrrrrr.', '.rrrrrrrwwrrrrrrr.', '.kkkkkkkkkkkkkkkkr'], { r: t, w: '#F8F6F1', k: INK })
    f(25, 1, 1, 9, '#8E929A')
    stamp(f, 26, 1, ['wkwk', 'kwkw', 'wkwk'], { w: '#F8F6F1', k: INK }, 'flag')
  },
  // Explore: pirate scouting the code; the cutlass fences.
  explore: f => {
    crabBody(f)
    stamp(f, 5, 3, ['.kk..............kk.', '.kkk....kkkk....kkk.', '..kkkkkkkwwkkkkkkk..', '..kkkkkkkkkkkkkkkk..', '.gggggggggggggggggg.'], { k: '#55514C', w: '#F8F6F1', g: '#F5C542' })
    f(7, 11, 11, 1, INK); f(18, 11, 4, 3, INK)
    f(27, 6, 1, 9, '#C9CCD2', 'it'); f(26, 15, 3, 1, '#7A4A26', 'it')
  },
  other: f => crabBody(f),
}

export const COSTUME_NAMES: readonly string[] = Object.keys(COSTUMES)

// Crabs dress by tier; an explore task wears the pirate whatever its tier.
// `fable` is the expert tier's former name (alias) and wears the astronaut too.
export const costumeOf = (who: { role: Role; tier: Tier }): string => {
  if (who.role === 'explore') return 'explore'
  const tier: string = who.tier === ('fable' as string) ? 'expert' : who.tier
  return Object.prototype.hasOwnProperty.call(COSTUMES, tier) ? tier : 'other'
}

// Body and props nest inside `bd` so a prop rides the bob and adds its own motion;
// legs stay outside it and step on their own.
const build = (costume: string, accent: string): string => {
  const groups = new Map<string, string[]>([['bd', []]])
  const f: Fill = (cx, cy, w, h, c, cls = 'bd') => {
    if (!groups.has(cls)) groups.set(cls, [])
    groups.get(cls)?.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  ;(COSTUMES[costume] ?? ((g: Fill) => crabBody(g)))(f, accent)
  const group = (cls: string) => `<g class="${cls}">${(groups.get(cls) ?? []).join('')}</g>`
  const props = [...groups.keys()].filter(k => k !== 'bd' && k !== 'la' && k !== 'lb')
  const body = `<g class="bd">${(groups.get('bd') ?? []).join('')}${props.map(group).join('')}</g>`
  return `${body}${group('la')}${group('lb')}`
}

// The rects are the same for every redraw of a row, so build them once per look.
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

// `mirror` flips the crab inside its own box (x .. x + CRAB_BOX * scale) so it faces left.
const draw = (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions): string => {
  const name = costumeOf(who)
  const scale = o.scale ?? 1
  const place = o.mirror ? `translate(${x + CRAB_BOX * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  return `<g class="p-crabs"><g transform="${place}" opacity="${o.dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="c-${name}${o.isWalking ? ' run' : ''}">${inner(name, o.accent)}</g></g></g>`
}

export const crabs: Pack = {
  id: 'crabs',
  name: 'Pixel crabs',
  w: CRAB_BOX,
  h: CRAB_H,
  css: CRAB_CSS,
  roles: ROLES,
  variants: ['clay'],
  variantOf: () => 'clay',
  draw,
}
