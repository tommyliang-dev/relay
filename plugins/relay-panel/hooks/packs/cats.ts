// Cats: pixel British Shorthair cats in profile, drawn as SVG rects (dogs.ts is the sibling).
// Cast: conductor lilac-point (top hat, bow tie, baton), builder cream-van (headphones, laptop),
//   fixer cream-white (flat cap, mallet), tester white (spectacles, test tube),
//   scout cream (bandana, eye patch, flashlight), plain blue-white (collar only).
//   Every role has one fixed look; the seed is ignored.
// Accent: the collar, plus each costume's main piece (hat band, headphones, cap, tube rim, bandana).
// Box: 36x28 grid units; the cat sits two rows down so tall hats fit above it.
// Animation: CSS only; legs step, the body bobs, the tail swishes between two pixel poses.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

const CAT_W = 36
const CAT_H = 28
const DY = 2 // the cat sits two rows down so tall hats fit above it

// --- coats ---------------------------------------------------------------------------------
// o outline, s shadow, b base, h highlight, m muzzle, n nose leather, e iris, ink: a prop
// colour that reads on this coat (spectacles, eye patch). A multi-tone coat adds a second
// set of tones and a pattern that decides which pixels wear them.
type Tones = { o: string; s: string; b: string; h: string }
type Pattern = 'bicolour' | 'van' | 'point'
type Coat = Tones & { m: string; n: string; e: string; ink: string; patch?: Tones; pattern?: Pattern }

const BLUE: Tones = { o: '#46525F', s: '#6F8091', b: '#8C9DAD', h: '#A8B7C5' }
const WHITE: Tones = { o: '#9A958D', s: '#D8D4CC', b: '#F3F1EC', h: '#FFFFFF' }
const LILAC: Tones = { o: '#65545D', s: '#9C8893', b: '#B9A6AF', h: '#CDBCC4' }
const CREAM: Tones = { o: '#9A7B52', s: '#D6B47F', b: '#EBD09F', h: '#F5E2BF' }

const COATS: Record<string, Coat> = {
  white: { o: '#9A958D', s: '#D8D4CC', b: '#F3F1EC', h: '#FFFFFF', m: '#FFFFFF', n: '#E7A0A8', e: '#3D7FD9', ink: '#3A4048' },
  cream: { o: '#9A7B52', s: '#D8BB8D', b: '#EED8B2', h: '#F8EAD2', m: '#F8EAD2', n: '#E3A098', e: '#D9822B', ink: '#4A3A2A' },
  // white with a blue cap, saddle and tail
  'blue-white': { ...WHITE, m: '#FFFFFF', n: '#E7A0A8', e: '#E58A2B', ink: '#3A4048', patch: BLUE, pattern: 'bicolour' },
  // white with a cream cap and tail
  'cream-van': { ...WHITE, m: '#FFFFFF', n: '#E3A098', e: '#D9822B', ink: '#4A3A2A', patch: CREAM, pattern: 'van' },
  // white with a cream cap, saddle and tail
  'cream-white': { ...WHITE, m: '#FFFFFF', n: '#E3A098', e: '#D9822B', ink: '#4A3A2A', patch: CREAM, pattern: 'bicolour' },
  // pale cream body with lilac ears, mask, legs and tail; pointed cats have blue eyes
  'lilac-point': { o: '#A59A8C', s: '#DED5C9', b: '#F4EEE6', h: '#FFFFFF', m: '#FFFFFF', n: '#C98E9F', e: '#5A8FE0', ink: '#3A2F35', patch: LILAC, pattern: 'point' },
}

// The role picks the coat so a glance says what the cat is doing.
const ROLE_COAT: Record<string, string> = {
  conductor: 'lilac-point',
  builder: 'cream-van',
  fixer: 'cream-white',
  tester: 'white',
  scout: 'cream',
  plain: 'blue-white',
}

// Which pixels wear the second tone, in the cat's own coordinates (before DY). Bicolour:
// cap down the back of the head, a saddle and the tail; white face, chest and legs. Van:
// only the cap and the tail. Point: ears, face mask, legs and tail.
const patched = (pattern: Pattern, x: number, y: number, group: string): boolean => {
  if (group === 'tl') return true
  const isLeg = group === 'la' || group === 'lb'
  if (pattern === 'point') return isLeg || y <= 4 || (x >= 24 && y >= 7 && y <= 14)
  if (isLeg) return false
  if (pattern === 'van') return y <= 6 && x >= 15
  return (y <= 7 && x >= 15) || (x <= 22 && x >= 15 && y <= 11) || (y >= 12 && y <= 16 && x >= 6 && x <= 15)
}

// --- the cat --------------------------------------------------------------------------------
// A segment is [x, y, pixels]. Coat letters: b base, s shadow, h highlight, m muzzle, n nose,
// i inner ear, E iris, P pupil, G glint, O forced outline. Everything is filled first, then
// every filled pixel that touches empty space becomes outline.
type Seg = [x: number, y: number, s: string]
const r = (ch: string, n: number) => ch.repeat(n)

const TAIL: Seg[] = [
  // thick at the base, curving up off the rump, rounded tip
  [2, 4, 'bb'],
  [1, 5, 'bbbb'],
  [1, 6, 'bhb'],
  [1, 7, 'bhb'],
  [1, 8, 'bhbb'],
  [2, 9, 'bhbb'],
  [2, 10, 'bbbb'],
  [3, 11, 'bbbbb'],
  [4, 12, 'bbbb'],
  [5, 13, 'bb'],
]

// The swish: the same curled tail with its upper half one pixel further back. Rows 9-13,
// where it meets the rump, match the first pose, so the join never moves.
const TAIL_SWISH: Seg[] = [...TAIL.slice(0, 5).map(([x, y, px]): Seg => [x - 1, y, px]), ...TAIL.slice(5)]

const HEAD: Seg[] = [
  // ears: medium, broad at the base, round tips, set far apart; the far one in shadow
  [19, 1, 'bb'], [26, 1, 'ss'],
  [18, 2, 'bbbb'], [25, 2, 'ssss'],
  [18, 3, 'biibb'], [25, 3, 'ssss'],
  [17, 4, 'bbiibb' + 'b' + 'sssss'],
  // round, massive skull: the back and the brow both curve
  [18, 5, 'bb' + r('h', 7) + 'bb'],
  [17, 6, r('b', 13)],
  [16, 7, r('b', 15)],
  [16, 8, r('b', 9) + 'OOO' + 'bbb'],
  [16, 9, r('b', 9) + 'EPG' + 'bbb'],
  [16, 10, r('b', 9) + 'EPE' + 'bbb'],
  // short nose with a gentle dip, then the round whisker pad and a firm chin
  [16, 11, r('b', 13) + 'mm' + 'n'],
  [16, 12, r('b', 12) + 'mmmm'],
  [17, 13, r('b', 11) + 'mmm'],
  [17, 14, 'ss' + r('b', 8) + 'mm'],
  // full cheeks overhanging the chest
  [18, 15, 's' + r('b', 7) + 's'],
]

const BODY: Seg[] = [
  // compact, level back, deep broad chest, round rump
  [8, 12, r('b', 10)],
  [7, 13, 'bb' + r('h', 7) + 'bb'],
  [6, 14, r('b', 13)],
  [5, 15, r('b', 14)],
  [5, 16, r('b', 13) + 'sssss' + 'b'],
  [5, 17, r('b', 20)],
  [5, 18, r('b', 20)],
  [5, 19, r('b', 19)],
  [6, 20, 'bb' + r('s', 14) + 'b'],
  [7, 21, r('s', 15)],
]

// Short, thick legs. Each pair overlaps: the far leg in shadow sits half behind the near one.
const LEGS = {
  backFar: [[10, 22, 'sss'], [10, 23, 'sss'], [10, 24, 'sss'], [10, 25, 'ssss']] as Seg[],
  backNear: [[6, 22, 'bbbb'], [6, 23, 'bbbb'], [6, 24, 'bbbb'], [6, 25, 'bbbbb']] as Seg[],
  frontFar: [[16, 22, 'sss'], [16, 23, 'sss'], [16, 24, 'sss'], [16, 25, 'ssss']] as Seg[],
  frontNear: [[19, 22, 'bbbb'], [19, 23, 'bbbb'], [19, 24, 'bbbb'], [19, 25, 'bbbbb']] as Seg[],
}

// The collar wraps from the back of the neck, under the cheeks, to the throat.
const COLLAR: Seg[] = [
  [16, 12, 'AA'],
  [16, 13, 'AA'],
  [17, 14, 'AA'],
  [17, 15, 'AA'],
  [18, 16, r('A', 7)],
  [22, 17, 'gg'],
]

// The near front paw lifted to hold something: pad at x26-27, y17-19.
const ARM: Seg[] = [
  [23, 17, 'bbbb'],
  [23, 18, 'bbbbm'],
  [23, 19, 'bbbb'],
]

// --- costumes ------------------------------------------------------------------------------
// Layer colours: costume map first, then the fixed props below; 'ink' resolves per coat.
type Layer = { segs: Seg[]; g?: string; map?: Record<string, string> }
type Costume = { hold?: boolean; arm?: Seg[]; layers: Layer[]; anim: string }

const PROP: Record<string, string> = {
  k: '#3D4752', // dark prop body
  K: '#5C6875', // its lighter face
  w: '#E4E8EC', // light edge
  W: '#F3F0E9', // paper, baton
  y: '#E3B23C', // brass
  o: '#A8743E', // wood
}

// The tier colour ('A' in a map value) tints each costume's main piece, as well as the collar.
const COSTUMES: Record<string, Costume> = {
  // builder: headphones + laptop; the screen flickers
  builder: {
    hold: true,
    // paw reaching down onto the keyboard
    arm: [[22, 20, 'bbb'], [22, 21, 'bbbb'], [23, 22, 'bbbb'], [24, 23, 'bbbm']],
    layers: [
      {
        // band arcs over the crown between the ears, down to a round cup on the cheek
        map: { K: 'A' },
        segs: [
          [22, 1, 'ww'], [22, 2, 'kk'], [22, 3, 'kk'], [21, 4, 'kk'], [21, 5, 'kk'], [20, 6, 'kk'],
          [19, 7, 'kkk'], [18, 8, 'kKKk'], [18, 9, 'kKKk'], [18, 10, 'kKKk'], [19, 11, 'kkk'],
        ],
      },
      {
        g: 'it',
        map: { s: '#C3C9D0', b: '#8AB4F8' },
        segs: [
          [23, 24, r('s', 9)], [23, 25, r('k', 9)],
          [30, 17, 'bk'], [30, 18, 'bk'], [30, 19, 'bk'],
          [29, 20, 'bk'], [29, 21, 'bk'], [29, 22, 'bk'], [29, 23, 'bk'],
        ],
      },
      { g: 'cur', map: { b: '#EAF2FF' }, segs: [[30, 18, 'b'], [29, 21, 'b']] },
    ],
    anim: '.p-cats .c-builder.run .cur{animation:cats-blink 1s steps(1) infinite}',
  },
  // tester: spectacles + test tube; a bubble blinks in the liquid
  tester: {
    hold: true,
    layers: [
      {
        // one round lens around the visible eye, the temple arm back to the ear
        map: { k: 'ink' },
        segs: [[24, 7, 'kkkkk'], [19, 8, 'kkkkk'], [28, 8, 'k'], [24, 9, 'k'], [28, 9, 'k'], [24, 10, 'k'], [28, 10, 'k'], [24, 11, 'kkkkk']],
      },
      {
        // a glass test tube held upright in the paw: a lip in the accent colour, pale glass,
        // green liquid filling the lower two thirds, a rounded bottom
        g: 'it',
        map: { w: '#D6EEF7', v: '#3FBF7F', A: 'A' },
        segs: [
          [27, 15, 'AAAAA'],
          [28, 16, 'kwk'], [28, 17, 'kwk'], [28, 18, 'kwk'],
          [28, 19, 'kvk'], [28, 20, 'kvk'], [28, 21, 'kvk'], [28, 22, 'kvk'], [28, 23, 'kvk'],
          [28, 24, '.k.'],
        ],
      },
      { g: 'c1', map: { b: '#B8F0D0' }, segs: [[29, 21, 'b']] },
    ],
    // a bubble in the liquid blinks
    anim: '.p-cats .c-tester.run .c1{animation:cats-blink 1s steps(1) infinite}',
  },
  // fixer: flat cap + mallet; the mallet taps up and down
  fixer: {
    hold: true,
    layers: [
      {
        // ear tips poke out above the cap; the brim juts past the brow
        map: { H: 'A', h: 'A', d: '#4E4539' },
        segs: [[17, 3, r('H', 12)], [16, 4, r('h', 14)], [16, 5, r('h', 16)], [28, 6, 'dddd']],
      },
      {
        // a peppermint mallet held upright in the paw, head up: a wooden handle into a squared,
        // outlined head with red and white candy stripes
        g: 'it',
        map: { O: '#7A0C1E', R: '#C8102E', W: '#F6F2EA', o: '#8A5A2B' },
        segs: [[27, 15, 'OOOOO'], [27, 16, 'ORWRO'], [27, 17, 'OWRWO'], [27, 18, 'OOOOO'], [28, 19, 'oo'], [28, 20, 'oo'], [28, 21, 'oo'], [28, 22, 'oo'], [28, 23, 'oo'], [28, 24, 'oo']],
      },
    ],
    anim: '.p-cats .c-fixer.run .it{animation:cats-st .5s steps(1) infinite}',
  },
  // conductor: top hat between the ears + bow tie + baton; the baton beats between two poses
  conductor: {
    hold: true,
    layers: [
      {
        map: { r: 'A' },
        segs: [[21, -2, 'wwwww'], [21, -1, 'kKkkk'], [21, 0, 'kKkkk'], [21, 1, 'kKkkk'], [21, 2, 'rrrrr'], [21, 3, 'kKkkk'], [19, 4, 'w' + r('k', 7) + 'w']],
      },
      { map: { r: '#C04257', R: '#8E2332' }, segs: [[21, 16, 'rr.rr'], [21, 17, 'rrRrr'], [21, 18, 'rr.rr']] },
      // the baton swaps between raised and level; the grip pixel stays in the paw
      { segs: [[28, 17, 'k'], [28, 18, 'k']] },
      { g: 'pa', segs: [[29, 16, 'kW'], [30, 15, 'kW'], [31, 14, 'y']] },
      { g: 'pb', segs: [[29, 17, 'WWy'], [29, 18, 'kkk']] },
    ],
    anim: '',
  },
  // scout: bandana + eye patch + flashlight; the beam flickers
  scout: {
    hold: true,
    layers: [
      {
        // tied across the brow under the ears, the knot trailing behind
        map: { r: 'A', W: '#F6F2EA' },
        segs: [[17, 4, r('r', 12)], [16, 5, 'rrrrWrrrrrrWrr'], [14, 4, 'rrr'], [13, 5, 'rrr'], [12, 6, 'rr'], [13, 7, 'r']],
      },
      { map: { k: 'ink' }, segs: [[19, 7, 'kkkkkk'], [25, 8, 'kkk'], [25, 9, 'kkk'], [25, 10, 'kkk']] },
      // a brass flashlight held level, the lens glints
      { map: { B: '#BBD2F2' }, segs: [[27, 16, 'kky'], [27, 17, 'yyB'], [27, 18, 'ooB'], [27, 19, 'kko']] },
      // a stepped cone of light widens away from the lens: 2px, 4px then 6px tall, 2 columns each
      { g: 'b1', map: { F: '#FFF3B0' }, segs: [[30, 17, 'FF'], [30, 18, 'FF']] },
      { g: 'b2', map: { F: '#FFE680' }, segs: [[32, 16, 'FF'], [32, 17, 'FF'], [32, 18, 'FF'], [32, 19, 'FF']] },
      { g: 'b3', map: { F: '#FFD54A' }, segs: [[34, 15, 'FF'], [34, 16, 'FF'], [34, 17, 'FF'], [34, 18, 'FF'], [34, 19, 'FF'], [34, 20, 'FF']] },
      { g: 'gl', map: { G: '#FFFFFF' }, segs: [[28, 17, 'G']] },
    ],
    anim: `.p-cats .b1{opacity:.9}
.p-cats .b2{opacity:.65}
.p-cats .c-scout.run .gl{animation:cats-blink 1s steps(1) infinite}
.p-cats .b3{opacity:.4}
.p-cats .c-scout.run .b2{animation:cats-blink 1s steps(1) infinite}
.p-cats .c-scout.run .b3{animation:cats-blink 1s steps(1) -.5s infinite}`,
  },
  // plain: no costume; the collar carries the colour
  plain: { layers: [], anim: '' },
}

// --- render -------------------------------------------------------------------------------
type Cell = { c: string; g: string; key: string; tone?: Tones }

// Paints one pose into rect runs, keyed by animation group.
const paint = (name: string, coat: Coat, accent: string, tail: Seg[]): Map<string, string[]> => {
  const costume = COSTUMES[name]
  const grid: (Cell | null)[][] = Array.from({ length: CAT_H }, () => Array(CAT_W).fill(null))
  const coatColor = (ch: string): string | undefined =>
    ({ b: coat.b, s: coat.s, h: coat.h, m: coat.m, n: coat.n, i: coat.n, E: coat.e, P: '#1E2328', G: '#FFFFFF', O: coat.o })[ch]
  // The fur letters take the second tone inside the pattern; a point mask covers the muzzle too.
  const toneAt = (ch: string, x: number, y: number, group: string): Tones | undefined =>
    coat.patch && coat.pattern && 'bshm'.includes(ch) && (ch !== 'm' || coat.pattern === 'point') && patched(coat.pattern, x, y, group) ? coat.patch : undefined
  const fill = (segs: Seg[], group: string) => {
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        const tone = toneAt(ch, x + i, y, group)
        const c = tone ? tone[ch === 'm' ? 'h' : (ch as keyof Tones)] : coatColor(ch)
        if (ch !== '.' && c && x + i < CAT_W) grid[y + DY][x + i] = { c, g: group, key: ch, tone }
      })
  }
  fill(tail, 'tl')
  fill(BODY, 'bd')
  fill(HEAD, 'bd')
  // Far legs first so the near ones overlap them; diagonal pairs share a walk phase.
  fill(LEGS.backFar, 'lb')
  fill(LEGS.frontFar, 'la')
  fill(LEGS.backNear, 'la')
  if (!costume.hold) fill(LEGS.frontNear, 'lb')
  const near = new Set<string>()
  for (const leg of costume.hold ? [LEGS.backNear] : [LEGS.backNear, LEGS.frontNear])
    for (const [x, y, s] of leg) for (let i = 0; i < s.length; i++) near.add(`${x + i},${y + DY}`)
  const far = new Set<string>()
  for (const leg of [LEGS.backFar, LEGS.frontFar])
    for (const [x, y, s] of leg) for (let i = 0; i < s.length; i++) if (!near.has(`${x + i},${y + DY}`)) far.add(`${x + i},${y + DY}`)

  // Outline: any filled pixel that touches empty space or the edge, and a near leg
  // where it passes in front of a far one.
  const outline = (
    only?: (x: number, y: number) => boolean,
    solid: (x: number, y: number, fx: number, fy: number) => boolean = (nx, ny, fx, fy) =>
      !!grid[ny][nx] && !(near.has(`${fx},${fy}`) && far.has(`${nx},${ny}`)),
  ) => {
    const edges: [number, number][] = []
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (!cell || (only && !only(x, y))) return
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= CAT_W || ny >= CAT_H) return true
          return !solid(nx, ny, x, y)
        })
        if (open) edges.push([x, y])
      }),
    )
    for (const [x, y] of edges) grid[y][x] = { ...(grid[y][x] as Cell), c: (grid[y][x] as Cell).tone?.o ?? coat.o }
  }
  outline()

  const put = (segs: Seg[], group: string, map: Record<string, string> = {}) => {
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        if (ch === '.' || x + i >= CAT_W) return
        let c = map[ch] ?? (ch === 'A' ? accent : ch === 'g' ? '#E3B23C' : PROP[ch])
        if (c === 'ink') c = coat.ink
        if (c === 'A') c = accent
        if (c) grid[y + DY][x + i] = { c, g: group, key: ch }
      })
  }
  put(COLLAR, 'bd')
  for (const layer of costume.layers) put(layer.segs, layer.g ?? 'bd', layer.map)

  // The lifted paw goes on last, outlined where it meets anything that is not body.
  if (costume.hold) {
    const arm = new Set<string>()
    for (const [x, y, s] of costume.arm ?? ARM)
      [...s].forEach((ch, i) => {
        const tone = toneAt(ch, x + i, y, 'la') // the lifted paw is a leg
        grid[y + DY][x + i] = { c: tone ? tone[ch === 'm' ? 'h' : (ch as keyof Tones)] : (coatColor(ch) as string), g: 'bd', key: ch, tone }
        arm.add(`${x + i},${y + DY}`)
      })
    const bodyish = (x: number, y: number) => {
      const cell = grid[y][x]
      return !!cell && (arm.has(`${x},${y}`) || 'bshmO'.includes(cell.key) || cell.c === coat.o || cell.c === coat.patch?.o)
    }
    outline((x, y) => arm.has(`${x},${y}`), bodyish)
  }

  // One rect per horizontal run of same-colour pixels in the same group: the panel
  // redraws running rows every second, so fewer nodes matter.
  const groups = new Map<string, string[]>()
  grid.forEach((row, y) => {
    let x = 0
    while (x < CAT_W) {
      const cell = row[x]
      if (!cell) {
        x++
        continue
      }
      let end = x + 1
      while (end < CAT_W && row[end]?.g === cell.g && row[end]?.c === cell.c) end++
      const list = groups.get(cell.g) ?? []
      list.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${cell.c}"/>`)
      groups.set(cell.g, list)
      x = end
    }
  })
  return groups
}

// The tail rides the body's bob and swishes by swapping between two pixel poses (`tl`, `tw`),
// so it never leaves the grid or pulls away from the rump. Body rects sit straight in `bd`:
// a nested `bd` would bob twice and leave the props behind.
const svgFor = (name: string, coat: Coat, accent: string): string => {
  const groups = paint(name, coat, accent, TAIL)
  const swish = paint(name, coat, accent, TAIL_SWISH).get('tl') ?? []
  const g = (k: string, rects = groups.get(k)) => (rects ? `<g class="${k}">${rects.join('')}</g>` : '')
  const props = [...groups.keys()].filter(k => !['bd', 'la', 'lb', 'tl'].includes(k)).map(k => g(k)).join('')
  return `<g class="bd">${g('tl')}${g('tw', swish)}${(groups.get('bd') ?? []).join('')}${props}</g>${g('la')}${g('lb')}`
}

const CAT_CSS = `<style>
.p-cats .run g{transform-box:fill-box}
.p-cats .run .la{animation:cats-st .5s steps(1) infinite}
.p-cats .run .lb{animation:cats-st .5s steps(1) infinite -.25s}
.p-cats .run .bd{animation:cats-bob .5s steps(1) infinite -.125s}
.p-cats .tw,.p-cats .pb{opacity:0}
.p-cats .run .pa{animation:cats-off .5s steps(1) infinite}
.p-cats .run .pb{animation:cats-on .5s steps(1) infinite}
.p-cats .run .tl{animation:cats-off 1s steps(1) infinite}
.p-cats .run .tw{animation:cats-on 1s steps(1) infinite}
@keyframes cats-st{50%{transform:translateY(-1px)}}
@keyframes cats-bob{50%{transform:translateY(1px)}}
@keyframes cats-off{50%{opacity:0}}
@keyframes cats-on{50%{opacity:1}}
@keyframes cats-blink{50%{opacity:.25}}
${Object.values(COSTUMES).map(c => c.anim).filter(Boolean).join('\n')}
@media (prefers-reduced-motion: reduce){.p-cats .run,.p-cats .run g{animation:none!important}}
</style>`

// The grid is the same for every redraw of a row, so build it once per look.
const cache = new Map<string, string>()

const inner = (costume: string, coat: string, accent: string): string => {
  const key = `${costume}|${coat}|${accent}`
  let hit = cache.get(key)
  if (hit === undefined) {
    hit = svgFor(costume, COATS[coat], accent)
    cache.set(key, hit)
  }
  return hit
}

// `mirror` flips the cat inside its own box (x .. x + CAT_W * scale) so it faces left.
// The cats dress by role; the tier only reaches them through the accent colour.
const draw = (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions): string => {
  const name = COSTUMES[who.role] ? who.role : 'plain'
  const coat = ROLE_COAT[name]
  const scale = o.scale ?? 1
  const place = o.mirror ? `translate(${x + CAT_W * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  return `<g class="p-cats"><g transform="${place}" opacity="${o.dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="c-${name}${o.isWalking ? ' run' : ''}">${inner(name, coat, o.accent)}</g></g></g>`
}

export const cats: Pack = {
  id: 'cats',
  name: 'British Shorthair cats',
  w: CAT_W,
  h: CAT_H,
  css: CAT_CSS,
  roles: ROLES,
  draw,
}
