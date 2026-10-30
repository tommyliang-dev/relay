// A pixel Christmas cast in profile, 32x28 grid units, drawn as SVG rects. The character is
// chosen by role, so a crew reads as a scene: Santa conducts (orchestrator), Mrs Claus holds
// the naughty-or-nice list (planner), elves carry the blueprint tube, laptop and gift
// (architect, developer, designer), the flying sleigh explores, and the reindeer is everyone
// else. Same canvas, facing, generated outline and animation rules as cats.ts; the tier
// accent sits in one "collar" spot per character: Santa's belt, Mrs Claus's ribbon, the elf's
// collar, the ribbon on the sleigh's sack, the reindeer's harness strap.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

export const XMAS_W = 32
export const XMAS_H = 28
const DY = 2 // every figure sits two rows down so hats and antlers fit above it

// --- variants -------------------------------------------------------------------------------
// The six variants are the reindeer coats. The other characters read them as one detail: the
// elves' tunic and cap, the sleigh's paint. Santa and Mrs Claus ignore them.
type Tones = { o: string; s: string; b: string; h: string }
type Coat = Tones & { m: string; n: string; e: string; i: string }

const NOSE = '#2A2320'
const COATS: Record<string, Coat> = {
  brown: { o: '#45290F', s: '#7A4B24', b: '#9A6434', h: '#B47C49', m: '#EADCC4', n: NOSE, e: '#231811', i: '#C98E7E' },
  'dark-brown': { o: '#1F120A', s: '#3E2614', b: '#5B3A22', h: '#74502F', m: '#CDB99E', n: NOSE, e: '#15100B', i: '#8E5C4E' },
  tan: { o: '#6A4624', s: '#B2865A', b: '#D0A672', h: '#E3C08E', m: '#F6ECDC', n: NOSE, e: '#2E2014', i: '#D9A08E' },
  grey: { o: '#353A40', s: '#6D7378', b: '#8C9297', h: '#A9AEB3', m: '#E2E3E4', n: NOSE, e: '#1C1F23', i: '#B98E8E' },
  // arctic white; the grey outline keeps it visible on light rows
  white: { o: '#948F87', s: '#D8D4CC', b: '#F3F1EC', h: '#FFFFFF', m: '#FFFFFF', n: '#3A3A40', e: '#2B2B30', i: '#E7A0A8' },
  // a warmer red-brown with the famous nose
  rudolph: { o: '#4A2612', s: '#8B4F28', b: '#AE6A3A', h: '#C98755', m: '#F0E0C8', n: '#FF2F2A', e: '#231811', i: '#D59684' },
}

export const VARIANTS: readonly string[] = Object.keys(COATS)

// FNV-1a so the same agent id always wears the same look across redraws and sessions.
export const variantOf = (key: string): string => {
  if (!key) return 'brown'
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return VARIANTS[h % VARIANTS.length]
}

// Elf tunics and caps, and sleigh paint, by variant index.
type Pair = { c: string; o: string }
const GREEN: Pair = { c: '#3B9C5F', o: '#1C5E3A' }
const RED: Pair = { c: '#C8102E', o: '#7A0C1E' }
const GOLD: Pair = { c: '#D9A520', o: '#8A6412' }
const TEAL: Pair = { c: '#2A9D8F', o: '#176B62' }
const PLUM: Pair = { c: '#8E3A7C', o: '#5E2352' }
const BLUE: Pair = { c: '#3E78CF', o: '#24498A' }
const TUNICS: [tunic: Pair, cap: Pair][] = [[GREEN, RED], [RED, GREEN], [GOLD, GREEN], [TEAL, RED], [PLUM, GREEN], [BLUE, RED]]
const PAINTS: Pair[] = [RED, GREEN, GOLD]

// --- shared palette -------------------------------------------------------------------------
// An ink is a fill colour with the outline tone it turns into where it meets empty space.
// No `o`: drawn flat and treated as empty by its neighbours (antlers, sparkles). `o` equal to
// `c`: solid but never darkened (hooves, buckles, runners). `g` moves the pixel to its own
// group (the reindeer's nose glows, sparkles twinkle).
type Ink = { c: string; o?: string; g?: string }
const flat = (c: string, g?: string): Ink => (g ? { c, o: c, g } : { c, o: c })

const SKIN: Ink = { c: '#F2C9A5', o: '#9A6040' }
const SNOW: Ink = { c: '#F6F2EA', o: '#9A958D' } // trim, beard, apron: grey outline so it reads on light rows
const SUIT: Ink = { c: RED.c, o: RED.o }
const SLEEVE: Ink = { c: '#A80E26', o: RED.o } // a shade darker so the near arm reads against the suit
const EYE: Ink = flat('#1E1A1A')
const NOSE_ROSY: Ink = { c: '#E58A82', o: '#B8584F' }
const BOOT: Ink = flat('#23201F')
const BRASS: Ink = flat('#E3B23C')
const HAIR: Ink = { c: '#CBC6BE', o: '#777269' }
const SPARK: Ink = { c: '#F2C230' }

// Prop colours for layers put on top after the outline; 'ink' resolves per figure.
const PROP: Record<string, string> = {
  k: '#3D4752', // dark prop body
  K: '#5C6875', // its lighter face
  w: '#E4E8EC', // light edge
  W: '#F6F2EA', // paper, snow
  l: '#A9A49A', // grey edge of white things
  y: '#E3B23C', // brass
  o: '#A8743E', // wood
  r: '#C8102E', // Santa red
  R: '#86101F', // its shadow
  v: '#3B9C5F', // nice green
  x: '#D0453F', // naughty red
}

// --- pictures --------------------------------------------------------------------------------
// A segment is [x, y, pixels] in the figure's own coordinates (before DY); '.' is empty.
type Seg = [x: number, y: number, s: string]
const r = (ch: string, n: number) => ch.repeat(n)
const pic = (y0: number, rows: string[]): Seg[] => rows.map((s, i) => [0, y0 + i, s] as Seg)

type Part = { g: string; segs: Seg[] }
type Layer = { segs: Seg[]; g?: string; map?: Record<string, string> }
type Figure = {
  ink: Record<string, Ink>
  parts: Part[] // filled in order, later ones over earlier, then outlined
  layers: Layer[] // put on top after the outline: collars, spectacles, props
  late?: Part[] // filled after the layers and outlined where they meet anything that is not figure
  outer?: string[] // groups emitted beside the body instead of inside it (the sleigh's sparkle trail)
}

// ---- reindeer (other) -----------------------------------------------------------------------
// Deep deer body on slim legs with dark hooves, short upturned tail, thick neck with a pale
// mane, long wedge muzzle, one leaf ear and a pair of branched antlers in pale bone. Letters:
// b s h coat, m mane, n nose, i inner ear, E iris, G glint, a near antler, f far antler, k hoof.
const ANTLER_NEAR: Seg[] = pic(-2, [
  '.................a..a..a',
  '.................a..a..a',
  '.................aa.a..a',
  '..................aaa.aa',
  '....................aaa',
])
const ANTLER_FAR: Seg[] = pic(-2, [
  '................f..f..f',
  '................f..f..f',
  '................ff.f..f',
  '.................fff.ff',
  '...................fff',
])
const DEER_TAIL: Seg[] = pic(10, ['.bb', '.bmb', '..bmbb'])
const DEER_BODY: Seg[] = pic(3, [
  '................bb..bbbbbbb',
  '................bibbbbbbEGbbb',
  '.................bibbbbbEEbbbb',
  '..................bbbbbbbbbbbmnn',
  '.....................bbbbbbmmmnn',
  '....................bbbbbbbmmm',
  '....................bbbbbbmm',
  '...................bbbbbbbmm',
  '..................bbbbbbmm',
  '.....bbbbbbbbbbbbbbbbbbbmm',
  '...bbbbbbbbbbbbbbbbbbbbmmm',
  '..bbbbbbbbbbbbbbbbbbbmmmm',
  '..bbbbbbbbbbbbbbbbbbbmmmm',
  '...bbbbbbbbbbbbbbbbbmmmm',
  '...bbbbbbbbbbbbbbbbbbmmm',
  '....bbbbbbbbbbbbbbbbbmm',
  '.....ssbbbbbbbbbbbbbbs',
])
// Slim straight legs, three wide, dark hooves; the far pair stands in shadow.
const deerLeg = (x: number, ch: string): Seg[] => [
  [x, 20, r(ch, 3)], [x, 21, r(ch, 3)], [x, 22, r(ch, 3)], [x, 23, r(ch, 3)], [x, 24, 'kkk'], [x, 25, 'kkk'],
]
// The harness strap wraps the base of the neck; the bell hangs off its front, on the chest.
const STRAP: Seg[] = [[18, 11, r('A', 8)], [19, 12, r('A', 7)]]
const BELL: Seg[] = [[26, 13, 'jj'], [26, 14, 'jJ']]

const reindeerFigure = (coat: Coat, accent: string): Figure => ({
  ink: {
    b: { c: coat.b, o: coat.o }, s: { c: coat.s, o: coat.o }, h: { c: coat.h, o: coat.o }, m: { c: coat.m, o: coat.o },
    i: { c: coat.i, o: coat.o }, E: { c: coat.e, o: coat.o }, G: { c: '#FFFFFF', o: coat.o },
    n: flat(coat.n, 'ns'), k: flat('#2B2420'), a: { c: '#E8DCBE' }, f: { c: '#A28E66' },
  },
  parts: [
    { g: 'bd', segs: ANTLER_FAR }, { g: 'bd', segs: ANTLER_NEAR }, { g: 'tl', segs: DEER_TAIL }, { g: 'bd', segs: DEER_BODY },
    // diagonal pairs share a walk phase
    { g: 'lb', segs: deerLeg(8, 's') }, { g: 'la', segs: deerLeg(16, 's') }, { g: 'la', segs: deerLeg(5, 'b') }, { g: 'lb', segs: deerLeg(19, 'b') },
  ],
  layers: [{ segs: STRAP, map: { A: accent } }, { g: 'bl', segs: BELL, map: { j: '#F2C94C', J: '#B8860B' } }],
})

// ---- Santa (orchestrator) -------------------------------------------------------------------
// Hat flopping back with a pompom, a face that is mostly beard, round red suit, belt in the
// accent with a brass buckle, white hem and black boots. Letters: r suit, q sleeve, W snow,
// p skin, P eye, n nose, A belt, y buckle, k boot.
const SANTA: Seg[] = pic(-2, [
  '.......WWW',
  '........rrrrr',
  '.........rrrrrrr',
  '..........rrrrrrrrr',
  '..........WWWWWWWWWW',
  '..........pppppppppp',
  '..........ppppppppPp',
  '..........pppppppppnn',
  '.........WWWWWWWWWWW',
  '........rrWWWWWWWWWWWr',
  '.......rrrWWWWWWWWWWrrr',
  '......rrrrrWWWWWWWWrrrrr',
  '......rrrrrrWWWWWWrrrrrr',
  '......rrrrrrrWWWWrrrrrrr',
  '......rrrrrrrrWWrrrrrrrr',
  '......rrrrrrrrrrrrrrrrrr',
  '......AAAAAAAAAAAAAAyyAA',
  '......AAAAAAAAAAAAAAyyAA',
  '......rrrrrrrrrrrrrrrrrr',
  '......rrrrrrrrrrrrrrrrrr',
  '......rrrrrrrrrrrrrrrrrr',
  '......rrrrrrrrrrrrrrrrrr',
  '......WWWWWWWWWWWWWWWWWW',
])
// The near arm reaches forward in a darker sleeve to a white mitten that grips the baton.
const SANTA_ARM: Seg[] = [[20, 8, 'qqq'], [21, 9, 'qqq'], [22, 10, 'qqq'], [23, 11, 'qqq'], [23, 12, 'WWW'], [24, 13, 'WWW'], [24, 14, 'WW']]
const santaFigure = (accent: string): Figure => ({
  ink: { r: SUIT, q: SLEEVE, W: SNOW, p: SKIN, P: EYE, n: NOSE_ROSY, k: BOOT, y: BRASS, A: flat(accent) },
  parts: [
    { g: 'bd', segs: SANTA },
    { g: 'la', segs: [[9, 21, 'rrrr'], [9, 22, 'rrrr'], [9, 23, 'kkkk'], [9, 24, 'kkkk'], [9, 25, 'kkkkk']] },
    { g: 'lb', segs: [[16, 21, 'rrrrr'], [16, 22, 'rrrrr'], [16, 23, 'kkkkk'], [16, 24, 'kkkkkk'], [16, 25, 'kkkkkk']] },
    { g: 'bd', segs: SANTA_ARM },
  ],
  // candy-cane baton
  layers: [{ g: 'it', segs: [[27, 13, 'RW'], [28, 12, 'Rr'], [29, 11, 'RW'], [30, 10, 'r']] }],
})

// ---- Mrs Claus (planner) --------------------------------------------------------------------
// Grey bun, spectacles, white shawl with the accent ribbon, red dress to the ground with a
// white apron down the front, shoes peeking out. Letters as Santa plus g hair.
const MRS_CLAUS: Seg[] = pic(0, [
  '.........ggg',
  '........ggggggggg',
  '.........gggggggggg',
  '..........gppppppppp',
  '..........gppppppPpp',
  '..........gppppppppnn',
  '...........pppppppp',
  '..........WWWWWWWWWW',
  '.........WWWWWWWWWWWW',
  '.........rrrrrrrrrrrr',
  '........rrrrrrrrrrrrrr',
  '........rrrrrWWWWWWWWr',
  '.......rrrrrrWWWWWWWWWr',
  '.......rrrrrrWWWWWWWWWr',
  '......rrrrrrrWWWWWWWWWWr',
  '......rrrrrrrWWWWWWWWWWr',
  '......rrrrrrrWWWWWWWWWWr',
  '.....rrrrrrrrWWWWWWWWWWWr',
  '.....rrrrrrrrWWWWWWWWWWWr',
  '.....rrrrrrrrWWWWWWWWWWWr',
  '.....rrrrrrrrrrrrrrrrrrrr',
  '.....rrrrrrrrrrrrrrrrrrrr',
  '.....rrrrrrrrrrrrrrrrrrrr',
])
const MRS_ARM: Seg[] = [[20, 10, 'qq'], [21, 11, 'qq'], [22, 12, 'qq'], [23, 13, 'pp'], [23, 14, 'pp']]
const mrsClausFigure = (accent: string): Figure => ({
  ink: { r: SUIT, q: SLEEVE, W: SNOW, p: SKIN, P: EYE, n: NOSE_ROSY, k: BOOT, g: HAIR },
  parts: [
    { g: 'bd', segs: MRS_CLAUS },
    { g: 'la', segs: [[8, 23, 'kkkk'], [8, 24, 'kkkk'], [8, 25, 'kkkkk']] },
    { g: 'lb', segs: [[15, 23, 'kkkkk'], [15, 24, 'kkkkk'], [15, 25, 'kkkkkk']] },
    { g: 'bd', segs: MRS_ARM },
  ],
  layers: [
    // ribbon bow on the shawl
    { segs: [[16, 8, 'AAA'], [16, 9, 'AAA']], map: { A: accent } },
    // one round lens round the eye, a short temple back towards the hair; mid grey so it
    // reads as wire, not a patch
    { segs: [[14, 4, 'kk'], [16, 3, 'kkk'], [16, 4, 'k'], [18, 4, 'k'], [16, 5, 'kkk']], map: { k: '#5C5C66' } },
    // the naughty-or-nice scroll; the lines tick in, nice green and naughty red
    {
      g: 'it',
      map: { p: '#C9B88F', l: '#8E8470' },
      segs: [[25, 10, 'lllll'], ...[11, 12, 13, 14, 15, 16, 17, 18, 19].map(y => [25, y, 'pWWWp'] as Seg), [25, 20, 'lllll']],
    },
    { g: 'c1', segs: [[26, 12, 'vv']] },
    { g: 'c2', segs: [[26, 14, 'xx']] },
    { g: 'c3', segs: [[26, 16, 'vv']] },
  ],
})

// ---- elves (architect, developer, designer) -------------------------------------------------
// Child proportions: big head, tall pointed cap bent forward with a bell, pointed ear, accent
// collar, tunic flaring at the hem, tights in the cap colour, curly-toed shoes. Letters:
// c cap, W band, p skin, P eye, n nose, A collar, t tunic, u sleeve, s tights, k shoe.
const ELF: Seg[] = pic(0, [
  '................ccy',
  '..............ccc',
  '.............cccc',
  '............cccccc',
  '...........cccccccc',
  '...........cccccccc',
  '..........WWWWWWWWWW',
  '........p..pppppppp',
  '........pppppppppPp',
  '.........ppppppppppn',
  '...........pppppppp',
  '...........AAAAAAAA',
  '..........tttttttttt',
  '.........tttttttttttt',
  '.........tttttttttttt',
  '.........tttttttttttt',
  '.........tttttttttttt',
  '.........tttttttttttt',
  '........tttttttttttttt',
  '........tttttttttttttt',
])
const ELF_LEGS: Part[] = [
  { g: 'la', segs: [[10, 20, 'sss'], [10, 21, 'sss'], [10, 22, 'sss'], [10, 23, 'sss'], [14, 23, 'k'], [10, 24, 'kkkkk'], [10, 25, 'kkkk']] },
  { g: 'lb', segs: [[16, 20, 'sss'], [16, 21, 'sss'], [16, 22, 'sss'], [16, 23, 'sss'], [21, 23, 'k'], [16, 24, 'kkkkkk'], [16, 25, 'kkkkk']] },
]
// The near arm forward and down to a hand at x22-23, y16.
const ELF_ARM: Seg[] = [[19, 13, 'uu'], [20, 14, 'uu'], [21, 15, 'uu'], [22, 16, 'ppp']]
const elfFigure = (variant: string, accent: string, extra: { parts?: Part[]; layers: Layer[]; arm?: Seg[] }): Figure => {
  const [tunic, cap] = TUNICS[VARIANTS.indexOf(variant)] ?? TUNICS[0]
  return {
    ink: {
      c: { c: cap.c, o: cap.o }, W: SNOW, p: SKIN, P: EYE, n: NOSE_ROSY, A: flat(accent), y: BRASS,
      t: { c: tunic.c, o: tunic.o }, u: { c: tunic.o, o: tunic.o }, s: { c: cap.c, o: cap.o }, k: BOOT,
    },
    parts: [{ g: 'bd', segs: ELF }, ...ELF_LEGS, { g: 'bd', segs: extra.arm ?? ELF_ARM }, ...(extra.parts ?? [])],
    layers: extra.layers,
  }
}

// architect: blueprint tube held upright; it sways
const architectFigure = (variant: string, accent: string): Figure =>
  elfFigure(variant, accent, {
    layers: [
      {
        g: 'it',
        map: { b: '#3E78CF', B: '#BBD2F2' },
        segs: [[24, 11, 'BBB'], ...[12, 13, 15, 16, 18, 19, 21].map(y => [24, y, 'bbb'] as Seg), [24, 14, 'BBB'], [24, 17, 'BBB'], [24, 20, 'BBB'], [24, 22, 'BBB']],
      },
    ],
  })

// developer: earmuffs, the band dark across the cap band, the muff over the ear; a laptop
// held open in front, the screen flickers
const developerFigure = (variant: string, accent: string): Figure =>
  elfFigure(variant, accent, {
    arm: [[19, 13, 'uu'], [20, 14, 'uu'], [20, 15, 'uu'], [20, 16, 'pp']],
    layers: [
      { segs: [[10, 6, r('k', 10)], [8, 7, 'kk'], [7, 8, 'kWWk'], [7, 9, 'kWWk'], [8, 10, 'kk']] },
      {
        g: 'it',
        map: { s: '#C3C9D0', b: '#8AB4F8' },
        segs: [[22, 16, r('s', 7)], [22, 17, r('k', 7)], ...[11, 12, 13, 14, 15].map(y => [26, y, 'bbk'] as Seg)],
      },
      { g: 'cur', map: { b: '#EAF2FF' }, segs: [[26, 12, 'b'], [27, 14, 'b']] },
    ],
  })

// designer: a wrapped gift held in both hands, the ribbon curl above it bounces
const designerFigure = (variant: string, accent: string): Figure =>
  elfFigure(variant, accent, {
    arm: [[19, 13, 'uu'], [20, 14, 'uu'], [20, 15, 'uu'], [20, 16, 'pp']],
    layers: [
      { map: { e: '#3B9C5F', E: '#2A7A47', x: '#D0453F' }, segs: [[24, 11, 'xx'], [22, 12, 'eexxee'], [22, 13, 'xxxxxx'], [22, 14, 'eexxee'], [22, 15, 'eexxee'], [22, 16, 'EExxEE']] },
      { g: 'it', segs: [[28, 12, 'x'], [29, 11, 'x'], [29, 10, 'xx'], [30, 9, 'x']] },
    ],
  })

// ---- flying sleigh (explore) ----------------------------------------------------------------
// Red sleigh with a curled dash, gold runners on dark struts, a sack tied with the accent
// ribbon and gift boxes peeking over the rail, hovering with a sparkle trail behind. Letters:
// r paint, o sack, A ribbon, e g gift box, y runner, k strut, 1 2 3 sparkle groups.
const SLEIGH: Seg[] = pic(5, [
  '............oo',
  '...........AAAA',
  '...........AAAA',
  '.........oooooooo',
  '.........oooooooo..eggee',
  '.........oooooooo..eggee',
  '.........oooooooo..eggee..rr',
  '........rrrrrrrrrrrrrrrrrrr',
  '........rrrrrrrrrrrrrrrr.rr',
  '.........rrrrrrrrrrrrrrrrr',
  '..........rrrrrrrrrrrrrrr',
  '...........rrrrrrrrrrrrr',
  '............rrrrrrrrrrr',
  '.............kk......kk',
  '.........yyyyyyyyyyyyyyyyyy',
  '........y.................y',
])
const SPARKLES: Seg[] = [
  [5, 12, '1'], [4, 13, '111'], [5, 14, '1'],
  [2, 16, '2'], [1, 17, '222'], [2, 18, '2'],
  [7, 19, '3'], [3, 10, '3'], [6, 8, '3'],
]
const sleighFigure = (variant: string, accent: string): Figure => {
  const paint = PAINTS[(VARIANTS.indexOf(variant) + PAINTS.length) % PAINTS.length]
  return {
    ink: {
      r: { c: paint.c, o: paint.o }, o: { c: '#9A6B3C', o: '#5C3D1F' }, A: flat(accent),
      e: { c: '#3B9C5F', o: '#1C5E3A' }, g: { c: '#D0453F', o: '#1C5E3A' },
      y: flat('#D9A520'), k: flat('#3D4752'),
      '1': { c: SPARK.c, g: 's1' }, '2': { c: SPARK.c, g: 's2' }, '3': { c: '#FFE08A', g: 's3' },
    },
    parts: [{ g: 'bd', segs: SLEIGH }, { g: 'bd', segs: SPARKLES }],
    layers: [],
    outer: ['s1', 's2', 's3'],
  }
}

const FIGURES: Record<string, (variant: string, accent: string) => Figure> = {
  orchestrator: (_v, accent) => santaFigure(accent),
  planner: (_v, accent) => mrsClausFigure(accent),
  architect: architectFigure,
  developer: developerFigure,
  designer: designerFigure,
  explore: sleighFigure,
  other: (v, accent) => reindeerFigure(COATS[v], accent),
}

// --- render -------------------------------------------------------------------------------
type Cell = { c: string; o?: string; g: string }

const svgFor = (figure: Figure): string => {
  const grid: (Cell | null)[][] = Array.from({ length: XMAS_H }, () => Array(XMAS_W).fill(null))
  const fill = (segs: Seg[], group: string, keep?: Set<string>) => {
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        const ink = figure.ink[ch]
        if (ch === '.' || !ink || x + i >= XMAS_W) return
        grid[y + DY][x + i] = { c: ink.c, o: ink.o, g: ink.g ?? group }
        keep?.add(`${x + i},${y + DY}`)
      })
  }
  for (const part of figure.parts) fill(part.segs, part.g)

  // Outline: any outlined pixel that touches empty space, the edge, or a flat pixel.
  const outline = (only?: (x: number, y: number) => boolean, solid: (x: number, y: number) => boolean = (nx, ny) => grid[ny][nx]?.o !== undefined) => {
    const edges: [number, number][] = []
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (!cell || cell.o === undefined || cell.o === cell.c || (only && !only(x, y))) return
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= XMAS_W || ny >= XMAS_H) return true
          return !solid(nx, ny)
        })
        if (open) edges.push([x, y])
      }),
    )
    for (const [x, y] of edges) grid[y][x] = { ...(grid[y][x] as Cell), c: (grid[y][x] as Cell).o as string }
  }
  outline()

  const put = (segs: Seg[], group: string, map: Record<string, string> = {}) => {
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        if (ch === '.' || x + i >= XMAS_W) return
        const c = map[ch] ?? PROP[ch]
        if (c) grid[y + DY][x + i] = { c, g: group }
      })
  }
  for (const layer of figure.layers) put(layer.segs, layer.g ?? 'bd', layer.map)

  // Late parts go on over the props, outlined where they meet anything that is not figure.
  if (figure.late?.length) {
    const late = new Set<string>()
    for (const part of figure.late) fill(part.segs, part.g, late)
    outline((x, y) => late.has(`${x},${y}`), (x, y) => late.has(`${x},${y}`) || grid[y][x]?.o !== undefined)
  }

  // One rect per horizontal run of same-colour pixels in the same group: the panel
  // redraws running rows every second, so fewer nodes matter.
  const groups = new Map<string, string[]>()
  grid.forEach((row, y) => {
    let x = 0
    while (x < XMAS_W) {
      const cell = row[x]
      if (!cell) {
        x++
        continue
      }
      let end = x + 1
      while (end < XMAS_W && row[end]?.g === cell.g && row[end]?.c === cell.c) end++
      const list = groups.get(cell.g) ?? []
      list.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${cell.c}"/>`)
      groups.set(cell.g, list)
      x = end
    }
  })
  const g = (k: string) => (groups.has(k) ? `<g class="${k}">${groups.get(k)?.join('')}</g>` : '')
  const outer = new Set(['bd', 'la', 'lb', 'tl', ...(figure.outer ?? [])])
  const props = [...groups.keys()].filter(k => !outer.has(k)).map(g).join('')
  const trail = (figure.outer ?? []).map(g).join('')
  return `${trail}${g('tl')}<g class="bd">${g('bd')}${props}</g>${g('la')}${g('lb')}`
}

const XMAS_CSS = `<style>
.p-christmas .run g{transform-box:fill-box}
.p-christmas .run .la{animation:christmas-st .5s steps(1) infinite}
.p-christmas .run .lb{animation:christmas-st .5s steps(1) infinite -.25s}
.p-christmas .run .bd{animation:christmas-bob .5s steps(1) infinite -.125s}
.p-christmas .run .tl{transform-origin:85% 100%;animation:christmas-flick 1.2s ease-in-out infinite}
.p-christmas .run .bl{transform-origin:50% 0%;animation:christmas-ring .5s ease-in-out infinite}
.p-christmas .v-rudolph.run .ns{animation:christmas-glow 1s ease-in-out infinite}
.p-christmas .c-orchestrator.run .it{transform-origin:0% 100%;animation:christmas-conduct .5s ease-in-out infinite}
.p-christmas .c-planner.run .c1{animation:christmas-tick 1.5s steps(1) infinite}
.p-christmas .c-planner.run .c2{animation:christmas-tick 1.5s steps(1) infinite -.5s}
.p-christmas .c-planner.run .c3{animation:christmas-tick 1.5s steps(1) infinite -1s}
.p-christmas .c-architect.run .it{transform-origin:50% 100%;animation:christmas-sway 1.6s ease-in-out infinite}
.p-christmas .c-developer.run .cur{animation:christmas-blink 1s steps(1) infinite}
.p-christmas .c-designer.run .it{animation:christmas-dab .5s steps(1) infinite}
.p-christmas .c-explore.run .bd{animation:christmas-hover 1s steps(1) infinite}
.p-christmas .c-explore.run .s1{animation:christmas-twinkle 1s steps(1) infinite}
.p-christmas .c-explore.run .s2{animation:christmas-twinkle 1s steps(1) infinite -.33s}
.p-christmas .c-explore.run .s3{animation:christmas-twinkle 1s steps(1) infinite -.66s}
@keyframes christmas-st{50%{transform:translateY(-1px)}}
@keyframes christmas-bob{50%{transform:translateY(1px)}}
@keyframes christmas-flick{50%{transform:rotate(-18deg)}}
@keyframes christmas-ring{25%{transform:rotate(16deg)}75%{transform:rotate(-16deg)}}
@keyframes christmas-glow{0%,100%{filter:drop-shadow(0 0 0 #FF2F2A);opacity:.7}50%{filter:drop-shadow(0 0 1.5px #FF6A60);opacity:1}}
@keyframes christmas-conduct{50%{transform:rotate(-24deg)}}
@keyframes christmas-tick{0%{opacity:0}33%{opacity:1}}
@keyframes christmas-sway{50%{transform:rotate(6deg)}}
@keyframes christmas-blink{50%{opacity:.25}}
@keyframes christmas-dab{50%{transform:translate(1px,-1px)}}
@keyframes christmas-hover{0%{transform:translateY(0)}25%{transform:translateY(-1px)}50%{transform:translateY(-2px)}75%{transform:translateY(-1px)}}
@keyframes christmas-twinkle{0%{opacity:0}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){.p-christmas .run,.p-christmas .run g{animation:none!important}}
</style>`

// The grid is the same for every redraw of a row, so build it once per look.
const cache = new Map<string, string>()

const inner = (role: string, variant: string, accent: string): string => {
  const key = `${role}|${variant}|${accent}`
  let hit = cache.get(key)
  if (hit === undefined) {
    hit = svgFor(FIGURES[role](variant, accent))
    cache.set(key, hit)
  }
  return hit
}

// `mirror` flips the figure inside its own box (x .. x + XMAS_W * scale) so it faces left.
// The cast is chosen by role; the tier only reaches it through the accent colour. The
// variant is a class too, so only rudolph's nose glows.
const draw = (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions): string => {
  const name = FIGURES[who.role] ? who.role : 'other'
  const variant = COATS[o.variant] ? o.variant : 'brown'
  const scale = o.scale ?? 1
  const place = o.mirror ? `translate(${x + XMAS_W * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  return `<g class="p-christmas"><g transform="${place}" opacity="${o.dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="c-${name} v-${variant}${o.isWalking ? ' run' : ''}">${inner(name, variant, o.accent)}</g></g></g>`
}

export const christmas: Pack = {
  id: 'christmas',
  name: 'Christmas',
  w: XMAS_W,
  h: XMAS_H,
  css: XMAS_CSS,
  roles: ROLES,
  variants: VARIANTS,
  variantOf,
  draw,
}
