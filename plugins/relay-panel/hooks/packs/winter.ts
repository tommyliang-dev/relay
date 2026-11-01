// Winter: a pixel winter cast drawn from the front, as SVG rects. An everyday pack, not a season.
// Cast: conductor snowman, builder yeti, fixer polar bear, tester snowy owl, scout arctic fox,
//   plain penguin. Nobody holds anything and nobody varies, so the seed is ignored.
// Accent: exactly one piece per figure: the snowman's hat band, the yeti's belt, the bear's scarf,
//   the owl's leg band, the fox's bandana, the penguin's bow tie.
// Box: 36x30 grid units; most figures are written as the left half and mirrored.
// Animation: CSS only; legs step and the body bobs, poses (arms, flippers, tail) swap by opacity.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

const WINTER_W = 36
const WINTER_H = 30

// --- inks -----------------------------------------------------------------------------------
// An ink is a fill colour, the outline tone it turns into where it meets empty space (none or
// equal to `c`: never outlined; white fur and snow get a grey-blue outline so they read on light
// rows), and a paint pass `z` (default 1). A region on a higher pass
// (a face on the fur, eyes on the face) is painted after the one round it, so the fill under it
// runs straight across: fewer, longer rects.
type Ink = { c: string; o?: string; z?: number }
const dot = (c: string, z = 3): Ink => ({ c, z })
const on = (ink: Ink, z: number): Ink => ({ ...ink, z })

// Mixes a #rrggbb colour towards black; anything else comes back unchanged.
const darker = (hex: string): string => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const n = Number.parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v * 0.55).toString(16).padStart(2, '0')
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}

const ICE_OUT = '#5C7088'
const SNOW: Ink = { c: '#F2F6FA', o: ICE_OUT }
const SNOW_S: Ink = { c: '#C9D6E3', o: ICE_OUT } // cool shadow, seams between parts

// --- pictures --------------------------------------------------------------------------------
// A segment is [x, y, pixels]; '.' leaves the cell alone, any other letter is an ink.
type Seg = [x: number, y: number, s: string]
type Part = { g: string; segs: Seg[] }
// A layer is flat colour painted over the figure in its own group (twig arms, closed eyelids),
// with no outline.
type Layer = { g: string; map: Record<string, string>; segs: Seg[] }
// Poses are outlined parts (arms, flippers, a tail) drawn behind the body in groups `pa` and
// `pb`; the CSS swaps them by opacity, so pixels never leave the grid.
type Figure = { ink: Record<string, Ink>; parts: Part[]; poses?: Part[]; layers: Layer[] }

const flip = (s: string) => [...s].reverse().join('')
// Symmetric rows about the line between columns cx-1 and cx: each string is the left half,
// ending at column cx-1, mirrored to the right.
const sym = (cx: number, y0: number, halves: string[]): Seg[] =>
  halves.map((h, i) => [cx - h.length, y0 + i, h + flip(h)] as Seg)
const mirror = (cx: number, segs: Seg[]): Seg[] => segs.map(([x, y, s]) => [2 * cx - x - s.length, y, flip(s)] as Seg)
const both = (cx: number, segs: Seg[]): Seg[] => [...segs, ...mirror(cx, segs)]
const col = (x: number, y0: number, y1: number, s: string): Seg[] =>
  Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i, s] as Seg)
const rows = (x: number, y0: number, list: string[]): Seg[] => list.map((s, i) => [x, y0 + i, s] as Seg)

// ---- snowman (conductor) --------------------------------------------------------------------
// Three stacked snowballs, each shaded along its lower rim, a top hat with its band in the
// accent, coal eyes, smile and buttons, a carrot nose pointing aside, and two twig arms that
// sway between raised (pa) and lowered (pb). Letters: W s snow, k hat, A band, c coal, n N carrot.
const SNOWMAN: Seg[] = [
  ...sym(18, 0, [
    '..............kkkk', '..............kkkk', '..............kkkk', '..............AAAA', '............kkkkkk',
    '.............WWWWW', '............WWWWWW', '............WWWcWW', '............WWWWWW', '............WWcWWW',
    '.............WWWcW', '..............ssss',
    '............WWWWWW', '...........WWWWWWW', '..........WWWWWWWc', '..........WWWWWWWW', '..........WWWWWWWc',
    '..........sWWWWWWW', '...........ssWWWWW', '............ssssss',
    '..........WWWWWWWW', '.........WWWWWWWWW', '........WWWWWWWWWW', '........WWWWWWWWWc', '........WWWWWWWWWW',
    '........WWWWWWWWWW', '........sWWWWWWWWW', '.........ssWWWWWWW', '..........ssssssss', '............ssssss',
  ]),
  [17, 8, 'nnnN'],
]
const TWIG = { o: '#7A5230' }
const snowman = (accent: string): Figure => ({
  ink: { W: SNOW, s: on(SNOW_S, 2), k: { c: '#2B2F36', o: ICE_OUT }, A: dot(accent, 2), c: dot('#22252B'), n: dot('#F08A24'), N: dot('#C4651A', 4) },
  parts: [{ g: 'bd', segs: SNOWMAN }],
  layers: [
    { g: 'pa', map: TWIG, segs: both(18, rows(3, 8, ['o.o', '.o', '..o', '...o', '....o', '.....o', '......o'])) },
    { g: 'pb', map: TWIG, segs: both(18, rows(2, 11, ['o', '.oo', 'o..oo', '.....oo', '.......o'])) },
  ],
})

// ---- yeti (builder) -------------------------------------------------------------------------
// A tall shaggy biped: a spiky crown and cheek tufts, a blue-grey face under a heavy brow, dark
// eyes with a glint, a broad nose, a wide mouth with two fangs, sloped shoulders, long arms with
// big fists (hanging in pa, swung out in pb), a belt in the accent with a darker buckle, a fur
// fringe over thick legs and big bare feet. Letters: b fur, h tuft, s shadow, g leg, F brow,
// f face, hands and feet, E glint, P eye, n nose, m mouth, t fang, A a belt.
const YETI_LEG: Seg[] = [...col(11, 20, 26, 'ggggg'), [10, 27, 'ffffff'], [9, 28, 'ffffffff'], [9, 29, 'ffffffff']]
const YETI: Seg[] = [
  ...sym(18, 0, [
    '.............b.b..', '............bbbbbb', '...........bbbbbbb', '..........bbbbbbbb', '.........bbbbbbbbb',
    '.........bbbFFFFFF', '........bbbbfEPfff', '.........bbbfPPffn', '........bbbbfffmmm', '.........bbbfffftf',
    '..........bbbfffff', '.......bbbbbbsssss', '......bbbbbbbbbbbb',
    '..........bbhbbbbb', '..........bhhbbbbb', '..........bbbbbbbb', '..........bbbbbbbb', '..........bbbbbbbb',
    '..........AAAAAAAa', '..........AAAAAAAa', '..........ssssssss', '..........b.bb.b..',
  ]),
  ...sym(18, 2, ['..............hh..', '.............h....']),
  ...sym(18, 12, ['.......hh.........']),
]
const YETI_ARMS: Part[] = [
  { g: 'pa', segs: both(18, [...col(6, 13, 21, 'bbbb'), [5, 15, 'b'], [5, 19, 'b'], [7, 14, 'h'], [7, 15, 'h'], [6, 22, 'ffff'], [6, 23, 'ffff'], [7, 24, 'ff']]) },
  {
    g: 'pb',
    segs: both(18, [...col(6, 13, 14, 'bbbb'), ...col(5, 15, 16, 'bbbb'), ...col(4, 17, 20, 'bbbb'), [3, 18, 'b'], [6, 14, 'h'], [5, 15, 'h'], [3, 21, 'ffff'], [3, 22, 'ffff'], [4, 23, 'ff']]),
  },
]
const yeti = (accent: string): Figure => {
  const fur = '#4F6680'
  return {
    ink: {
      b: { c: '#F7FAFD', o: fur }, h: { c: '#D4E0EC', o: fur, z: 2 }, s: { c: '#C9D6E3', o: fur, z: 2 }, g: { c: '#C9D6E3', o: fur },
      f: { c: '#6F829B', o: fur, z: 2 }, F: { c: fur, z: 3 }, E: dot('#FFFFFF', 5), P: dot('#1E2530', 4), n: dot('#2A3340', 4),
      m: dot('#1E2530', 4), t: dot('#FFFFFF', 5), A: dot(accent, 2), a: dot(darker(accent), 4),
    },
    parts: [{ g: 'la', segs: YETI_LEG }, { g: 'lb', segs: mirror(18, YETI_LEG) }, { g: 'bd', segs: YETI }],
    poses: YETI_ARMS,
    layers: [],
  }
}

// ---- polar bear (fixer) ---------------------------------------------------------------------
// Standing upright: a broad round head with small round ears, black eyes, a big black nose over
// a split mouth, a scarf in the accent with its end hanging down the chest, a cream belly, arms
// hanging at the sides, short thick legs with wide toed feet. It blinks (ey). Letters: W s fur,
// c belly, E eye, n nose, d mouth and toes, A a scarf.
const BEAR_LEG: Seg[] = [...col(10, 23, 27, 'WWWWWW'), [9, 28, 'WdWdWdWW'], [9, 29, 'WWWWWWWW']]
const BEAR: Seg[] = [
  ...sym(18, 0, [
    '..........WWW.....', '.........WWsWW....', '........WWWWWWWWWW', '........WWWWWWWWWW', '........WWWWWWWWWW',
    '........WWWWWEWWWW', '........WWWWWEWWWW', '.........WWWWWWWnn', '.........WWWWWWWWn', '..........WWWWWWWd',
    '...........WWWWWdd', '.........AAAAAAAAA', '........AAAAAAAAAA',
    '......WWWWWWWWWWWW', '......WWWWsWWWWWWW', '......WWWWsWWWcccc', '......WWWWsWWccccc', '......WWWWsWcccccc',
    '......WWWWsWcccccc', '......WWWWsWcccccc', '......WWWWsWcccccc', '......WWWWsWWccccc', '......WdWdsWWWcccc',
    '..........WWWWWWWW',
  ]),
  // the scarf's end hangs over the chest
  ...col(11, 13, 17, 'Aa'), [11, 18, 'a.a'],
]
const bear = (accent: string): Figure => ({
  ink: {
    W: SNOW, s: on(SNOW_S, 2), c: { c: '#EFE3C8', o: ICE_OUT, z: 2 }, E: dot('#1E2228', 4), n: dot('#1E2228', 4), d: dot('#1E2228', 4),
    A: dot(accent, 3), a: dot(darker(accent), 4),
  },
  parts: [{ g: 'la', segs: BEAR_LEG }, { g: 'lb', segs: mirror(18, BEAR_LEG) }, { g: 'bd', segs: BEAR }],
  layers: [{ g: 'ey', map: { W: '#F2F6FA', d: '#1E2228' }, segs: both(18, [[13, 5, 'W'], [12, 6, 'ddd']]) }],
})

// ---- snowy owl (tester) ---------------------------------------------------------------------
// A round owl with no ear tufts: a white heart-shaped facial disk in a grey rim, big yellow eyes
// with dark pupils and a glint, a tiny dark beak, dark barring on the crown, wings and flanks
// (the middle of the breast stays clean), wings folded at the sides behind a grey seam, feathered
// feet with dark talons and a band in the accent on the left leg. It blinks (ey) and hops.
// Letters: W plumage, w wing, r rim and seam, h face, Y iris, P pupil, g glint, k beak, d bar,
// t talon, A band.
const OWL_FOOT: Seg[] = [[12, 26, 'WWWWW'], [12, 27, 'WWWWW'], [12, 28, 'WWWWW'], [12, 29, 't.t.t']]
const OWL: Seg[] = [
  ...sym(18, 2, [
    '..............WWWW', '............WWWdWW', '..........WWrrrrWW', '.........WWrhhhhrW', '........wWrhhhhhhr',
    '........wWrhhYYhhh', '........wWrhYgPYhh', '........wWrhYPPYhh', '........wWrhhYYhhk', '........wWrhhhhhhk',
    '........wwWrhhhhhh', '........wwrWrrhhhh', '........wwwrWWrrrr', '........wwwwrWWWWW', '.......wwwwwrWWWWW',
    '.......wddwwrWWWWW', '.......wwwwwrddWWW', '.......wwddwrWWWWW', '.......wwwwwrWWWWW', '.......wddwwrWddWW',
    '........wwwwrWWWWW', '.........wwrWWWWWW', '..........wWWWWWWW', '............WWWWWW',
  ]),
]
const owl = (accent: string): Figure => ({
  ink: {
    W: SNOW, w: { c: '#D3DDE8', o: ICE_OUT, z: 2 }, r: { c: '#A9B8C8', o: ICE_OUT, z: 2 }, h: { c: '#FFFFFF', o: ICE_OUT, z: 3 },
    Y: dot('#F5C518', 4), P: dot('#1A1C20', 5), g: dot('#FFFFFF', 6), k: dot('#2E3138', 4), d: dot('#4A443E'), t: { c: '#2A2D33', z: 0 },
    A: dot(accent, 3),
  },
  parts: [
    { g: 'la', segs: [...OWL_FOOT, [13, 26, 'AAA']] },
    { g: 'lb', segs: mirror(18, OWL_FOOT) },
    { g: 'bd', segs: OWL },
  ],
  layers: [{ g: 'ey', map: { h: '#FFFFFF', P: '#1A1C20' }, segs: both(18, rows(12, 7, ['hhhh', 'hhhh', 'PPPP', 'hhhh'])) }],
})

// ---- arctic fox (scout) ---------------------------------------------------------------------
// Sitting up in its pale winter coat: tall pointed ears with dark tips and cream insides,
// dark eyes with a glint, cream cheek ruffs, a cream stripe down the long muzzle to a black nose,
// a bandana in the accent, a cream chest, two front legs with cream paws between the rounded
// haunches, and a huge bushy tail with a cream tip rising beside it, flicking its tip (pa still,
// pb flicked). Letters: W coat, c cream, e shadow, D ear tip, E eye, g glint, n nose, A bandana.
const FOX: Seg[] = rows(0, 0, [
  '........D..........D',
  '.......DDD........DDD',
  '.......WcW........WcW',
  '......WccW........WccW',
  '......WccWWWWWWWWWWccW',
  '.....WWccWWWWWWWWWWccWW',
  '.....WWWWWWWWWWWWWWWWWW',
  '....WWWWWEEWWWWWWEEWWWWW',
  '...cWWWWWEEWWccWWEEWWWWWc',
  '...ccWWWWWWWccccWWWWWWWcc',
  '....cccWWWWccccccWWWWccc',
  '.....ccccWWccccccWWcccc',
  '.......ccccccnncccccc',
  '...........cccccc',
  '......WAAAAAAAAAAAAAAW',
  '......WWWAAAAAAAAAAWWW',
  '......WWcccAAAAAAcccWW',
  '......WWcccccAAcccccWW',
  '......WWWccccccccccWWW',
  '.....WeeWWccccccccWWeeW',
  '....WWWWeWWccccccWWeWWWW',
  '...WWWWWWeWWWccWWWeWWWWWW',
  '...WWWWWWeWWWeeWWWeWWWWWW',
  '...WWWWWWeWWWeeWWWeWWWWWW',
  '...WWWWWWeWWWeeWWWeWWWWWW',
  '...WWWWWWeWWWeeWWWeWWWWWW',
  '...WWWWWWeWWWeeWWWeWWWWWW',
  '...WWWWWWeWWWeeWWWeWWWWWW',
  '...WWWWWWeccceeccceWWWWWW',
  '..WWWWWWWeWWW..WWWeWWWWWWW',
])
// The tail from its base behind the right haunch up to the cream tip; the flick lifts the top.
const TAIL_BASE: Seg[] = rows(24, 14, [
  'WWWWWWWWWW', 'WWWWWWWWWWW', 'WWWWWWWWWee', 'WWWWWWWWWee', 'WWWWWWWWWee', 'WWWWWWWWWe', 'WWWWWWWWee', 'WWWWWWWWee',
  'WWWWWWWee', 'WWWWWWWe', 'WWWWWWe', 'WWWWWe', 'WWWWe', 'WWWe', 'WWe',
])
const TAIL_TIP = ['..ccc', '.ccccc', 'ccccccc', 'ccccccc', 'cccccccc', 'WWWccWWW', 'WWWWWWWWW']
const fox = (accent: string): Figure => ({
  ink: {
    W: { c: '#D2DBE5', o: ICE_OUT }, c: { c: '#F4EAD5', o: ICE_OUT, z: 2 }, e: { c: '#9AA9BB', o: ICE_OUT, z: 2 }, D: { c: '#323A47' },
    E: dot('#1E2228'), g: dot('#FFFFFF', 4), n: dot('#1E2228'), A: dot(accent),
  },
  parts: [{ g: 'bd', segs: [...FOX, [10, 7, 'g'], [17, 7, 'g']] }],
  poses: [
    { g: 'pa', segs: [...rows(25, 7, TAIL_TIP), ...TAIL_BASE] },
    { g: 'pb', segs: [...rows(26, 6, TAIL_TIP.slice(0, 6)), [25, 12, 'WWWWWWWWW'], [25, 13, 'WWWWWWWWW'], ...TAIL_BASE] },
  ],
  layers: [],
})

// ---- penguin (plain) ------------------------------------------------------------------------
// Upright and egg-shaped: a black head and back, a big white belly from the beak down, white
// eyes with dark pupils, an orange beak, orange feet, and a bow tie in the accent: two wings
// that taper into a darker knot. The flippers flap between down (pa) and out (pb). Letters:
// k black, w belly, e eye, P pupil, b B beak, A a bow tie, f F feet.
const PENGUIN_FOOT: Seg[] = [[13, 28, 'ffff'], [12, 29, 'FFFFF']]
const PENGUIN: Seg[] = [
  ...sym(18, 5, [
    '..............kkkk', '............kkkkkk', '...........kkkkkkk', '..........kkkkeekk', '..........kkkkePkk',
    '..........kkkkkkbb', '.........kkkwwwwwB', '.........kkwwwwwww', '.........kwwwwwwww', '........kkwwwwwwww',
    '........kkwwwwwwww', '........kkwwwwwwww', '........kkwwwwwwww', '........kkwwwwwwww', '........kkwwwwwwww',
    '........kkwwwwwwww', '........kkwwwwwwww', '........kkwwwwwwww', '........kkwwwwwwww', '.........kwwwwwwww',
    '.........kkwwwwwww', '..........kkwwwwww', '............kkkkkk',
  ]),
  ...sym(18, 13, ['AA..', 'AAAa', 'AAAa', 'AA..']),
]
const penguin = (accent: string): Figure => ({
  ink: {
    k: { c: '#2A2F38', o: ICE_OUT }, w: on(SNOW, 2), e: dot('#FFFFFF'), P: dot('#121419', 4), b: dot('#F08A24'), B: dot('#C4651A', 4),
    A: dot(accent), a: dot(darker(accent), 4), f: { c: '#F08A24' }, F: { c: '#C4651A' },
  },
  parts: [{ g: 'la', segs: PENGUIN_FOOT }, { g: 'lb', segs: mirror(18, PENGUIN_FOOT) }, { g: 'bd', segs: PENGUIN }],
  poses: [
    { g: 'pa', segs: both(18, rows(4, 14, ['..kk', '.kkk', '.kkk', 'kkk', 'kkk', 'kkk', 'kk', 'k'])) },
    { g: 'pb', segs: both(18, rows(1, 14, ['....kkk', '...kkkk', '..kkkk', '.kkkk', 'kkkk', 'kk'])) },
  ],
  layers: [],
})

const FIGURES: Record<Role, (accent: string) => Figure> = {
  conductor: snowman,
  builder: yeti,
  fixer: bear,
  tester: owl,
  scout: fox,
  plain: penguin,
}

// --- render -----------------------------------------------------------------------------------
type Px = { c: string; z: number; g: string }
const N4: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const rect = (x: number, y: number, w: number, c: string) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`

// Paints pixels pass by pass (z 0 outline, then fills, then details), one rect per run in each
// group. A run may cross pixels a later pass paints over, so a fill runs straight under the eyes
// and the outline pass lays down whole rows of silhouette: few, long rects. The panel redraws
// running rows every second and the pane caps its markup, so fewer nodes matter.
const passes = (px: (Px | null)[][], out: Map<string, string[]>): void => {
  const all = px.flat().filter((p): p is Px => p !== null)
  const zs = [...new Set(all.map(p => p.z))].sort((a, b) => a - b)
  for (const g of new Set(all.map(p => p.g))) {
    const list = out.get(g) ?? []
    out.set(g, list)
    for (const z of zs)
      px.forEach((row, y) => {
        let x = 0
        while (x < WINTER_W) {
          const p = row[x]
          if (!p || p.g !== g || p.z < z) {
            x++
            continue
          }
          let c: string | undefined
          let end = x
          for (; end < WINTER_W; end++) {
            const q = row[end]
            if (!q || q.g !== g || q.z < z) break
            if (q.z !== z) continue
            if (c === undefined) c = q.c
            else if (q.c !== c) break
          }
          if (c !== undefined) list.push(rect(x, y, end - x, c))
          x = end
        }
      })
  }
}

const blank = (): (Px | null)[][] => Array.from({ length: WINTER_H }, () => Array<Px | null>(WINTER_W).fill(null))

// Later parts overwrite earlier ones, so a pose painted first stays behind the body and only its
// uncovered pixels land in its group; its outline follows the whole figure.
const paint = (ink: Record<string, Ink>, parts: Part[]): Map<string, string[]> => {
  const grid: ({ ch: string; g: string } | null)[][] = Array.from({ length: WINTER_H }, () => Array(WINTER_W).fill(null))
  for (const { g, segs } of parts)
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        const cx = x + i
        if (ch !== '.' && ink[ch] && cx >= 0 && cx < WINTER_W && y >= 0 && y < WINTER_H) grid[y][cx] = { ch, g }
      })
  const open = (x: number, y: number) => x < 0 || y < 0 || x >= WINTER_W || y >= WINTER_H || !grid[y][x]
  const px = grid.map((row, y) =>
    row.map((cell, x): Px | null => {
      if (!cell) return null
      const k = ink[cell.ch]
      const edge = k.o !== undefined && k.o !== k.c && N4.some(([dx, dy]) => open(x + dx, y + dy))
      return edge ? { c: k.o as string, z: 0, g: cell.g } : { c: k.c, z: k.z ?? 1, g: cell.g }
    }),
  )
  const out = new Map<string, string[]>()
  passes(px, out)
  return out
}

const layerRects = (layer: Layer): string[] => {
  const px = blank()
  for (const [x, y, s] of layer.segs)
    [...s].forEach((ch, i) => {
      const c = layer.map[ch]
      if (c && x + i >= 0 && x + i < WINTER_W && y >= 0 && y < WINTER_H) px[y][x + i] = { c, z: 1, g: 'f' }
    })
  const out = new Map<string, string[]>()
  passes(px, out)
  return out.get('f') ?? []
}

// Legs come first so a lifted foot slides behind the body; `bd` holds the body, the poses and
// the layers, so the bob carries them.
const svgFor = (fig: Figure): string => {
  const groups = paint(fig.ink, fig.parts)
  const g = (k: string, rects: string[] | undefined) => (rects?.length ? `<g class="${k}">${rects.join('')}</g>` : '')
  const poses = (fig.poses ?? []).map(p => g(p.g, paint(fig.ink, [p, ...fig.parts]).get(p.g))).join('')
  const layers = fig.layers.map(l => g(l.g, layerRects(l))).join('')
  return `${g('la', groups.get('la'))}${g('lb', groups.get('lb'))}<g class="bd">${(groups.get('bd') ?? []).join('')}${poses}${layers}</g>`
}

// Motion only while running, off under prefers-reduced-motion. Everyone steps (`la` / `lb` half a
// cycle apart) with a body bob; the yeti stomps, the polar bear plods at half speed, the owl
// hops, the penguin waddles side to side. On top the snowman's twigs and the yeti's arms sway,
// the penguin's flippers flap, the fox's tail flicks, and the bear and the owl blink.
const WINTER_CSS = `<style>
.p-winter .run g{transform-box:fill-box}
.p-winter .pb,.p-winter .ey{opacity:0}
.p-winter .run .la{animation:winter-st .5s steps(1) infinite}
.p-winter .run .lb{animation:winter-st .5s steps(1) infinite -.25s}
.p-winter .run .bd{animation:winter-bob .5s steps(1) infinite -.125s}
.p-winter .run .pa{animation:winter-off 1s steps(1) infinite}
.p-winter .run .pb{animation:winter-on 1s steps(1) infinite}
.p-winter .run .ey{animation:winter-blink 2s steps(1) infinite}
.p-winter .c-builder.run .la,.p-winter .c-builder.run .lb{animation-name:winter-stomp}
.p-winter .c-fixer.run .la{animation-duration:1s}
.p-winter .c-fixer.run .lb{animation-duration:1s;animation-delay:-.5s}
.p-winter .c-fixer.run .bd{animation-duration:1s;animation-delay:-.25s}
.p-winter .c-tester.run{animation:winter-hop .5s steps(1) infinite}
.p-winter .c-tester.run .bd{animation:none}
.p-winter .c-tester.run .ey{animation-duration:2.6s}
.p-winter .c-scout.run .pa{animation-name:winter-fa}
.p-winter .c-scout.run .pb{animation-name:winter-fb}
.p-winter .c-plain.run .pa,.p-winter .c-plain.run .pb{animation-duration:.5s}
.p-winter .c-plain.run .bd{animation:winter-waddle 1s steps(1) infinite}
@keyframes winter-st{50%{transform:translateY(-1px)}}
@keyframes winter-stomp{50%{transform:translateY(-2px)}}
@keyframes winter-bob{50%{transform:translateY(1px)}}
@keyframes winter-hop{50%{transform:translateY(-2px)}}
@keyframes winter-waddle{0%,100%{transform:translateX(-1px)}50%{transform:translateX(1px)}}
@keyframes winter-off{50%{opacity:0}}
@keyframes winter-on{50%{opacity:1}}
@keyframes winter-blink{40%{opacity:1}48%{opacity:0}}
@keyframes winter-fa{60%{opacity:0}80%{opacity:1}}
@keyframes winter-fb{60%{opacity:1}80%{opacity:0}}
@media (prefers-reduced-motion: reduce){.p-winter .run,.p-winter .run g{animation:none!important}}
</style>`

// The rects are the same for every redraw of a row, so build them once per look (role + accent).
const cache = new Map<string, string>()

const inner = (role: Role, accent: string): string => {
  const key = `${role}|${accent}`
  let hit = cache.get(key)
  if (hit === undefined) {
    hit = svgFor(FIGURES[role](accent))
    cache.set(key, hit)
  }
  return hit
}

// `mirror` flips the figure inside its own box (x .. x + WINTER_W * scale). The role picks the
// character; the tier only reaches it through the accent colour. Unknown role -> penguin.
const draw = (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions): string => {
  const name: Role = Object.prototype.hasOwnProperty.call(FIGURES, who.role) ? who.role : 'plain'
  const scale = o.scale ?? 1
  const place = o.mirror ? `translate(${x + WINTER_W * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  return `<g class="p-winter"><g transform="${place}" ${o.dim ? 'opacity=".45" ' : ''}shape-rendering="crispEdges"><g class="c-${name}${o.isWalking ? ' run' : ''}">${inner(name, o.accent)}</g></g></g>`
}

export const winter: Pack = {
  id: 'winter',
  name: 'Winter',
  w: WINTER_W,
  h: WINTER_H,
  css: WINTER_CSS,
  roles: ROLES,
  draw,
}
