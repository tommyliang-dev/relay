// A pixel Christmas cast in profile, 32x28 grid units, drawn as SVG rects. The character is
// chosen by role, so a crew reads as a scene: Santa conducts (conductor), a gingerbread
// figure swings a peppermint mallet (builder), a nutcracker peers through a magnifying glass
// (fixer), Mrs Claus ticks off her clipboard (tester), an elf lights the way with a lantern
// (scout), and the reindeer is everyone else (plain). Same canvas, facing, generated outline
// and animation rules as cats.ts. The tier accent tints one costume piece per character:
// Santa's hat band and belt, the gingerbread hard hat, the nutcracker's shako, Mrs Claus's
// shawl, the elf's cap, the reindeer's harness strap.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

export const XMAS_W = 32
export const XMAS_H = 28
const DY = 2 // every figure sits two rows down so hats and antlers fit above it

// --- variants -------------------------------------------------------------------------------
// The six variants are the reindeer coats. The other characters read them as one detail: the
// gingerbread's dough and gumdrops, the nutcracker's jacket, the elf's tunic and tights.
// Santa and Mrs Claus ignore them.
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

// Cloth by variant index: the elf's tunic (tights a shade darker) and the nutcracker's jacket.
type Pair = { c: string; o: string }
const GREEN: Pair = { c: '#3B9C5F', o: '#1C5E3A' }
const RED: Pair = { c: '#C8102E', o: '#7A0C1E' }
const GOLD: Pair = { c: '#D9A520', o: '#8A6412' }
const TEAL: Pair = { c: '#2A9D8F', o: '#176B62' }
const PLUM: Pair = { c: '#8E3A7C', o: '#5E2352' }
const BLUE: Pair = { c: '#3E78CF', o: '#24498A' }
const TUNICS: Pair[] = [GREEN, RED, GOLD, TEAL, PLUM, BLUE]
const JACKETS: Pair[] = [RED, BLUE, GREEN, TEAL, PLUM, GOLD]
const cloth = (list: Pair[], variant: string): Pair => list[VARIANTS.indexOf(variant)] ?? list[0]

// Gingerbread dough and gumdrop buttons by variant; rudolph gets a red gumdrop nose.
type Dough = { d: string; s: string; o: string; g: string; i: string; n?: string }
const DOUGH: Record<string, Dough> = {
  brown: { d: '#B8733A', s: '#9A5E2C', o: '#5E3214', g: '#D0453F', i: '#FFFFFF' },
  'dark-brown': { d: '#7E4A22', s: '#683B19', o: '#33190A', g: '#3B9C5F', i: '#FFFFFF' },
  tan: { d: '#D9A066', s: '#C08550', o: '#7A4E22', g: '#D0453F', i: '#FFFFFF' },
  grey: { d: '#B8733A', s: '#9A5E2C', o: '#5E3214', g: '#3E78CF', i: '#BBD2F2' },
  white: { d: '#EBD3A8', s: '#D6B886', o: '#9A7B52', g: '#D9A520', i: '#FFFFFF' },
  rudolph: { d: '#B8733A', s: '#9A5E2C', o: '#5E3214', g: '#3B9C5F', i: '#FFFFFF', n: '#FF2F2A' },
}

// --- shared palette -------------------------------------------------------------------------
// An ink is a fill colour with the outline tone it turns into where it meets empty space.
// No `o`: drawn flat and treated as empty by its neighbours (antlers). `o` equal to `c`:
// solid but never darkened (hooves, buckles, boots). `g` moves the pixel to its own group
// (the reindeer's nose glows).
type Ink = { c: string; o?: string; g?: string }
const flat = (c: string, g?: string): Ink => (g ? { c, o: c, g } : { c, o: c })

// The accent as a costume piece: its own colour, outlined in a darker shade of itself.
const darker = (hex: string): string => {
  const n = Number.parseInt(hex.slice(1, 7), 16)
  if (Number.isNaN(n)) return hex
  const ch = (v: number) => Math.round(v * 0.55).toString(16).padStart(2, '0')
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}
const tinted = (accent: string): Ink => ({ c: accent, o: darker(accent) })

const SKIN: Ink = { c: '#F2C9A5', o: '#9A6040' }
const SNOW: Ink = { c: '#F6F2EA', o: '#9A958D' } // trim, beard, apron: grey outline so it reads on light rows
const SUIT: Ink = { c: RED.c, o: RED.o }
const SLEEVE: Ink = { c: '#A80E26', o: RED.o } // a shade darker so the near arm reads against the suit
const EYE: Ink = flat('#1E1A1A')
const NOSE_ROSY: Ink = { c: '#E58A82', o: '#B8584F' }
const BOOT: Ink = flat('#23201F')
const BRASS: Ink = flat('#E3B23C')
const HAIR: Ink = { c: '#CBC6BE', o: '#777269' }

// Prop colours for layers put on top after the outline.
const PROP: Record<string, string> = {
  k: '#3D4752', // dark prop body
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
  layers: Layer[] // put on top after the outline: spectacles, props
  late?: Part[] // filled after the layers and outlined where they meet anything that is not figure (the hand over a prop)
  tail?: Seg[] // a second tail pose, swapped in by steps so the tail never leaves the rump
}

// The shared prop anchor: every lifted front hand is this 2x2 block, drawn over the prop's grip.
const HAND: Seg[] = [[24, 15, 'HH'], [24, 16, 'HH']]

// ---- reindeer (plain) -----------------------------------------------------------------------
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
// the flick: the tip swings back and down, still rooted on the rump at y12
const DEER_TAIL_FLICK: Seg[] = pic(10, ['b', 'bmb', '.bmbbb'])
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
  tail: DEER_TAIL_FLICK,
})

// ---- Santa (conductor) ----------------------------------------------------------------------
// Hat flopping back with a pompom over a band in the accent, a face that is mostly beard,
// round red suit, belt in the accent with a brass buckle, white hem and black boots. Letters:
// r suit, q sleeve, W snow, p skin, P eye, n nose, A hat band and belt, y buckle, k boot.
const SANTA: Seg[] = pic(-2, [
  '.......WWW',
  '........rrrrr',
  '.........rrrrrrr',
  '..........rrrrrrrrr',
  '..........AAAAAAAAAA',
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
  ink: { r: SUIT, q: SLEEVE, W: SNOW, p: SKIN, P: EYE, n: NOSE_ROSY, k: BOOT, y: BRASS, A: tinted(accent) },
  parts: [
    { g: 'bd', segs: SANTA },
    { g: 'la', segs: [[9, 21, 'rrrr'], [9, 22, 'rrrr'], [9, 23, 'kkkk'], [9, 24, 'kkkk'], [9, 25, 'kkkkk']] },
    { g: 'lb', segs: [[16, 21, 'rrrrr'], [16, 22, 'rrrrr'], [16, 23, 'kkkkk'], [16, 24, 'kkkkkk'], [16, 25, 'kkkkkk']] },
    { g: 'bd', segs: SANTA_ARM },
  ],
  // candy-cane baton: raised (it), then a beat level (iu); the two poses swap by steps
  layers: [
    { g: 'it', segs: [[27, 13, 'RW'], [28, 12, 'Rr'], [29, 11, 'RW'], [30, 10, 'r']] },
    { g: 'iu', segs: [[27, 13, 'RWRWr']] },
  ],
})

// ---- gingerbread (builder) ------------------------------------------------------------------
// A cut-out gingerbread figure turned to the right: round head, arms out, stubby legs, icing
// smile and cuffs, gumdrop buttons, a hard hat in the accent. Letters: d dough, s far leg,
// A hard hat, E currant eye, n nose (a red gumdrop on rudolph), H hand.
const GINGER: Seg[] = pic(4, [
  '...........ddddddddd',
  '..........ddddddddddd',
  '..........ddddddddEdd',
  '..........dddddddddddn',
  '..........ddddddddddd',
  '...........ddddddddd',
  '............ddddddd',
  '..........ddddddddddd',
  '........ddddddddddddd',
  '......ddddddddddddddd',
  '....dddddddddddddddd',
  '....ddddd.dddddddddd',
  '....ddd...dddddddddd',
  '..........dddddddddd',
  '..........dddddddddd',
  '..........dddddddddd',
])
const HARD_HAT: Seg[] = [[13, -1, 'AAAAA'], [11, 0, 'AAAAAAAAA'], [10, 1, 'AAAAAAAAAAA'], [10, 2, 'AAAAAAAAAAA'], [8, 3, r('A', 15)]]
const gingerbreadFigure = (variant: string, accent: string): Figure => {
  const d = DOUGH[variant] ?? DOUGH.brown
  return {
    ink: {
      d: { c: d.d, o: d.o }, s: { c: d.s, o: d.o }, A: tinted(accent), E: flat('#2A1A10'),
      n: { c: d.n ?? d.d, o: d.o }, H: { c: d.d, o: d.o },
    },
    parts: [
      { g: 'bd', segs: GINGER },
      { g: 'bd', segs: HARD_HAT },
      { g: 'la', segs: [[10, 20, 'ssss'], [10, 21, 'ssss'], [10, 22, 'ssss'], [10, 23, 'ssss'], [9, 24, 'sssss'], [10, 25, 'ssss']] },
      { g: 'lb', segs: [[15, 20, 'dddd'], [15, 21, 'dddd'], [15, 22, 'dddd'], [15, 23, 'dddd'], [15, 24, 'ddddd'], [15, 25, 'dddd']] },
      { g: 'bd', segs: [[19, 13, 'dd'], [20, 14, 'ddd'], [21, 15, 'ddd'], [22, 16, 'dd']] },
    ],
    layers: [
      // icing: smile, hat-side swirl, wrist and ankle cuffs; gumdrop buttons
      { map: { W: d.i }, segs: [[17, 8, 'WW'], [19, 7, 'W'], [6, 14, 'W'], [6, 15, 'W'], [11, 23, 'WW'], [16, 23, 'WW'], [12, 4, 'W']] },
      { map: { g: d.g }, segs: [[17, 13, 'g'], [17, 15, 'g'], [17, 17, 'g']] },
      // peppermint mallet: a wooden handle into a squared, outlined head with candy stripes.
      // Raised upright (it), then struck forward with the head turned on its side (iu).
      {
        g: 'it',
        map: { O: '#7A0C1E', R: '#C8102E', W: '#F6F2EA', o: '#8A5A2B' },
        segs: [[23, 8, 'OOOOOOO'], [23, 9, 'ORWRWRO'], [23, 10, 'ORWRWRO'], [23, 11, 'OOOOOOO'], [26, 12, 'o'], [26, 13, 'o'], [26, 14, 'o'], [26, 15, 'o']],
      },
      {
        g: 'iu',
        map: { O: '#7A0C1E', R: '#C8102E', W: '#F6F2EA', o: '#8A5A2B' },
        segs: [[26, 15, 'oo'], [28, 12, 'OOOO'], [28, 13, 'ORRO'], [28, 14, 'OWWO'], [28, 15, 'ORRO'], [28, 16, 'OWWO'], [28, 17, 'ORRO'], [28, 18, 'OOOO']],
      },
    ],
    late: [{ g: 'bd', segs: HAND }],
  }
}

// ---- nutcracker (fixer) ---------------------------------------------------------------------
// A wooden nutcracker soldier: tall shako in the accent with a brass badge, dark peak, white
// hair and moustache, hinged jaw, jacket with epaulette and brass buttons, black belt, white
// trousers and black boots. Letters: A shako, y brass, k peak and belt, h W white, p skin,
// P eye, n nose, t jacket, u sleeve, B boot, H glove.
const NUTCRACKER: Seg[] = pic(-2, [
  '...........AAAAAAAA',
  '...........AAAAAAAA',
  '...........AAAAAyAA',
  '...........AAAAAAAA',
  '...........AAAAAAAA',
  '..........kkkkkkkkkkk',
  '...........hhppppppp',
  '...........hhppppPpp',
  '...........hhppppppnn',
  '...........hhWWWWWWWW',
  '...........hhWkkkkkkk',
  '...........hhWWWWWWW',
  '............WWWWWWW',
  '..........ttttttttttt',
  '.........yytttttttyttt',
  '.........yyttttttttttt',
  '..........ttttttttyttt',
  '..........ttttttttttt',
  '..........ttttttttyttt',
  '..........ttttttttttt',
  '..........kkkkkkkyykk',
  '..........WWWWWWWWWWW',
  '..........WWWWWWWWWWW',
])
const MAGNIFIER_MAP = { k: '#B8860B', L: '#CDEBF7', G: '#FFFFFF', o: '#5A3A1E' }
// brass ring with a pale lens and a glint, handle down into the glove
const lens = (dy: number): Seg[] => [
  [26, 6 + dy, 'kkkk'], [25, 7 + dy, 'kLLLLk'], [25, 8 + dy, 'kLGLLk'], [25, 9 + dy, 'kLLLLk'], [25, 10 + dy, 'kLLLLk'], [26, 11 + dy, 'kkkk'],
]
const nutcrackerFigure = (variant: string, accent: string): Figure => {
  const jacket = cloth(JACKETS, variant)
  return {
    ink: {
      A: tinted(accent), y: BRASS, k: BOOT, h: SNOW, W: SNOW, p: SKIN, P: EYE, n: NOSE_ROSY,
      t: { c: jacket.c, o: jacket.o }, u: { c: jacket.o, o: jacket.o }, B: BOOT, H: SNOW,
    },
    parts: [
      { g: 'bd', segs: NUTCRACKER },
      // straight soldier's legs as wide as the hips, split by a one-pixel gap, into tall boots
      { g: 'la', segs: [[10, 21, 'WWWWW'], [10, 22, 'WWWWW'], [10, 23, 'BBBBB'], [10, 24, 'BBBBB'], [10, 25, 'BBBBBB']] },
      { g: 'lb', segs: [[16, 21, 'WWWWW'], [16, 22, 'WWWWW'], [16, 23, 'BBBBB'], [16, 24, 'BBBBB'], [16, 25, 'BBBBBB']] },
      { g: 'bd', segs: [[19, 12, 'uu'], [20, 13, 'uuu'], [21, 14, 'uuu'], [22, 15, 'uu']] },
    ],
    // the glass scans: level (it), then lifted a pixel on a longer handle (iu)
    layers: [
      { g: 'it', map: MAGNIFIER_MAP, segs: [...lens(0), [26, 12, 'o'], [26, 13, 'o'], [25, 14, 'o']] },
      { g: 'iu', map: MAGNIFIER_MAP, segs: [...lens(-1), [26, 11, 'o'], [26, 12, 'o'], [26, 13, 'o'], [25, 14, 'o']] },
    ],
    late: [{ g: 'bd', segs: HAND }],
  }
}

// ---- Mrs Claus (tester) ---------------------------------------------------------------------
// Grey bun, spectacles, a shawl in the accent, red dress to the ground with a white apron down
// the front, shoes peeking out, a clipboard held up at the shared hand. Letters as Santa plus
// g hair, A shawl, H hand.
const MRS_CLAUS: Seg[] = pic(0, [
  '.........ggg',
  '........ggggggggg',
  '.........gggggggggg',
  '..........gppppppppp',
  '..........gppppppPpp',
  '..........gppppppppnn',
  '...........pppppppp',
  '..........AAAAAAAAAA',
  '.........AAAAAAAAAAAA',
  '........AAAAAAAAAAAAA',
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
const MRS_ARM: Seg[] = [[19, 10, 'qq'], [20, 11, 'qqq'], [21, 12, 'qq'], [22, 13, 'qq'], [23, 14, 'qq']]
const mrsClausFigure = (accent: string): Figure => ({
  ink: { r: SUIT, q: SLEEVE, W: SNOW, p: SKIN, P: EYE, n: NOSE_ROSY, k: BOOT, g: HAIR, A: tinted(accent), H: SKIN },
  parts: [
    { g: 'bd', segs: MRS_CLAUS },
    { g: 'la', segs: [[8, 23, 'kkkk'], [8, 24, 'kkkk'], [8, 25, 'kkkkk']] },
    { g: 'lb', segs: [[15, 23, 'kkkkk'], [15, 24, 'kkkkk'], [15, 25, 'kkkkkk']] },
    { g: 'bd', segs: MRS_ARM },
  ],
  layers: [
    // one round lens round the eye, a short temple back towards the hair; mid grey so it
    // reads as wire, not an eye patch
    { segs: [[14, 4, 'kk'], [16, 3, 'kkk'], [16, 4, 'k'], [18, 4, 'k'], [16, 5, 'kkk']], map: { k: '#8A8A96' } },
    // clipboard with a brass clip; the lines tick in, nice green and naughty red
    {
      map: { o: '#8A5A2C' },
      segs: [[26, 8, 'yy'], [24, 9, 'oooooo'], ...[10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(y => [24, y, 'oWWWWo'] as Seg), [24, 20, 'oooooo'], ...[12, 14, 16, 18].map(y => [27, y, 'll'] as Seg)],
    },
    { g: 'c1', segs: [[25, 12, 'v']] },
    { g: 'c2', segs: [[25, 14, 'x']] },
    { g: 'c3', segs: [[25, 18, 'v']] },
  ],
  late: [{ g: 'bd', segs: HAND }],
})

// ---- elf (scout) ----------------------------------------------------------------------------
// Child proportions: big head, tall pointed cap in the accent bent forward with a bell,
// pointed ear, tunic flaring at the hem, tights a shade darker, curly-toed shoes, a lantern
// hanging from the shared hand. Letters: c cap, W band, p skin, P eye, n nose, y bell,
// t tunic, u sleeve, s tights, k shoe, H hand.
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
  '..........tttttttttt',
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
// The near arm forward and down to the shared hand.
const ELF_ARM: Seg[] = [[19, 12, 'uu'], [20, 13, 'uu'], [21, 14, 'uu'], [22, 15, 'uu']]
// The lantern hangs from the hand on a wire bail: dark cap and base, amber glass, and a bright
// flame core in its own group that flickers.
const LANTERN: Seg[] = [[24, 17, '.kk'], [23, 18, 'kkkk'], [23, 19, 'kaak'], [23, 20, 'kaak'], [23, 21, 'kaak'], [23, 22, 'kkkk']]
const FLAME: Seg[] = [[24, 19, 'f'], [24, 20, 'ff'], [25, 21, 'f']]
const elfFigure = (variant: string, accent: string): Figure => {
  const tunic = cloth(TUNICS, variant)
  return {
    ink: {
      c: tinted(accent), W: SNOW, p: SKIN, P: EYE, n: NOSE_ROSY, y: BRASS,
      t: { c: tunic.c, o: tunic.o }, u: { c: tunic.o, o: tunic.o }, s: { c: tunic.o, o: darker(tunic.o) }, k: BOOT, H: SKIN,
    },
    parts: [{ g: 'bd', segs: ELF }, ...ELF_LEGS, { g: 'bd', segs: ELF_ARM }],
    layers: [
      { segs: LANTERN, map: { k: '#3D4752', a: '#E8962A' } },
      { g: 'fl', segs: FLAME, map: { f: '#FFE680' } },
    ],
    late: [{ g: 'bd', segs: HAND }],
  }
}

const FIGURES: Record<Role, (variant: string, accent: string) => Figure> = {
  conductor: (_v, accent) => santaFigure(accent),
  builder: gingerbreadFigure,
  fixer: nutcrackerFigure,
  tester: (_v, accent) => mrsClausFigure(accent),
  scout: elfFigure,
  plain: (v, accent) => reindeerFigure(COATS[v], accent),
}

// --- render -------------------------------------------------------------------------------
type Cell = { c: string; o?: string; g: string }

// Paints a figure into rect runs, keyed by animation group.
const paint = (figure: Figure, tail?: Seg[]): Map<string, string[]> => {
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
  for (const part of figure.parts) fill(part.g === 'tl' && tail ? tail : part.segs, part.g)

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

  // Layers are flat. A second prop pose (`iu`) shares pixels with the first, so it is kept
  // off the grid and emitted as its own runs.
  const extra = new Map<string, string[]>()
  for (const layer of figure.layers) {
    const group = layer.g ?? 'bd'
    for (const [x, y, s] of layer.segs)
      [...s].forEach((ch, i) => {
        if (ch === '.' || x + i >= XMAS_W) return
        const c = layer.map?.[ch] ?? PROP[ch]
        if (!c) return
        if (group === 'iu') {
          const list = extra.get(group) ?? []
          list.push(`<rect x="${x + i}" y="${y + DY}" width="1" height="1" fill="${c}"/>`)
          extra.set(group, list)
        } else grid[y + DY][x + i] = { c, g: group }
      })
  }

  // Late parts go on over the props, outlined where they meet anything that is not figure.
  if (figure.late?.length) {
    const late = new Set<string>()
    for (const part of figure.late) fill(part.segs, part.g, late)
    outline((x, y) => late.has(`${x},${y}`), (x, y) => late.has(`${x},${y}`) || grid[y][x]?.o !== undefined)
  }

  // One rect per horizontal run of same-colour pixels in the same group: the panel
  // redraws running rows every second, so fewer nodes matter.
  const groups = new Map<string, string[]>(extra)
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
  return groups
}

// Everything attached to the body rides inside the one `bd` group, so the bob carries it
// along: body rects sit straight in `bd`, never in a nested `bd`. The tail and the prop
// poses swap by steps instead of rotating, so pixels never leave the grid.
const svgFor = (figure: Figure): string => {
  const groups = paint(figure)
  const flick = figure.tail ? (paint(figure, figure.tail).get('tl') ?? []) : undefined
  const g = (k: string, rects = groups.get(k)) => (rects ? `<g class="${k}">${rects.join('')}</g>` : '')
  const props = [...groups.keys()].filter(k => !['bd', 'la', 'lb', 'tl'].includes(k)).map(k => g(k)).join('')
  return `<g class="bd">${g('tl')}${flick ? g('tw', flick) : ''}${(groups.get('bd') ?? []).join('')}${props}</g>${g('la')}${g('lb')}`
}

const XMAS_CSS = `<style>
.p-christmas .run g{transform-box:fill-box}
.p-christmas .iu,.p-christmas .tw{opacity:0}
.p-christmas .run .la{animation:christmas-st .5s steps(1) infinite}
.p-christmas .run .lb{animation:christmas-st .5s steps(1) infinite -.25s}
.p-christmas .run .bd{animation:christmas-bob .5s steps(1) infinite -.125s}
.p-christmas .run .tl{animation:christmas-off 1s steps(1) infinite}
.p-christmas .run .tw{animation:christmas-on 1s steps(1) infinite}
.p-christmas .run .bl{animation:christmas-ring .5s steps(1) infinite}
.p-christmas .v-rudolph.run .ns{animation:christmas-glow 1s ease-in-out infinite}
.p-christmas .run .it{animation:christmas-off .5s steps(1) infinite}
.p-christmas .run .iu{animation:christmas-on .5s steps(1) infinite}
.p-christmas .c-fixer.run .it{animation-duration:1s}
.p-christmas .c-fixer.run .iu{animation-duration:1s}
.p-christmas .c-tester.run .c1{animation:christmas-t1 1s steps(1) infinite}
.p-christmas .c-tester.run .c2{animation:christmas-t2 1s steps(1) infinite}
.p-christmas .c-tester.run .c3{animation:christmas-t3 1s steps(1) infinite}
.p-christmas .c-scout.run .fl{animation:christmas-flicker .5s steps(1) infinite}
@keyframes christmas-st{50%{transform:translateY(-1px)}}
@keyframes christmas-bob{50%{transform:translateY(1px)}}
@keyframes christmas-off{50%{opacity:0}}
@keyframes christmas-on{50%{opacity:1}}
@keyframes christmas-ring{50%{transform:translateX(-1px)}}
@keyframes christmas-glow{0%,100%{filter:drop-shadow(0 0 0 #FF2F2A);opacity:.7}50%{filter:drop-shadow(0 0 1.5px #FF6A60);opacity:1}}
@keyframes christmas-t1{0%{opacity:0}25%{opacity:1}}
@keyframes christmas-t2{0%{opacity:0}50%{opacity:1}}
@keyframes christmas-t3{0%{opacity:0}75%{opacity:1}}
@keyframes christmas-flicker{25%{opacity:.35}50%{opacity:1}75%{opacity:.6}}
@media (prefers-reduced-motion: reduce){.p-christmas .run,.p-christmas .run g{animation:none!important}}
</style>`

// The grid is the same for every redraw of a row, so build it once per look.
const cache = new Map<string, string>()

const inner = (role: Role, variant: string, accent: string): string => {
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
  const name: Role = Object.hasOwn(FIGURES, who.role) ? who.role : 'plain'
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
