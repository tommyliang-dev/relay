// Pixel dogs in profile, 32x28 grid units, drawn as SVG rects. Sibling of cats.ts: same
// canvas, same facing, same generated outline, same collar band and prop anchor.
//
// A dog differs from the cat by a projecting snout with a dark nose at the tip, a mouth
// line, a longer neck and chest, and a breed tail and ears. Each breed is drawn whole, as
// pixel pictures, so its silhouette reads with no interior detail.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

export const DOG_W = 32
export const DOG_H = 28
const DY = 2 // the dog sits two rows down so tall hats fit above it

// --- coats ---------------------------------------------------------------------------------
// o outline, s shadow, b base, h highlight; patch: the second coat tone (white markings,
// urajiro). n nose leather, e iris, i inner ear, t tongue, ink: a prop colour that reads on
// this coat (spectacles, eye patch).
type Tones = { o: string; s: string; b: string; h: string }
type Coat = Tones & { patch?: Tones; n: string; e: string; i: string; t: string; ink: string }

// Warm off-whites with a grey outline, so white dogs read on light rows.
const WHITE: Tones = { o: '#9A948A', s: '#DCD6CB', b: '#F5F2EC', h: '#FFFFFF' }
const CREAM_WHITE: Tones = { o: '#A0978A', s: '#E0D9CC', b: '#F6F2EA', h: '#FFFFFF' }

// --- pictures ------------------------------------------------------------------------------
// A segment is [x, y, pixels], in the dog's own coordinates (before DY). Coat letters:
// b s h coat tones, w v u the patch's base/shadow/highlight, n nose, E iris, P pupil,
// G glint, i inner ear, t tongue, O forced outline, Q forced patch outline. '.' and ' ' are
// empty. Everything is filled first, then every filled pixel that touches empty space
// becomes the outline tone of its own coat.
type Seg = [x: number, y: number, s: string]
const pic = (y0: number, rows: string[]): Seg[] => rows.map((s, i) => [0, y0 + i, s] as Seg)

type Legs = { backFar: Seg[]; backNear: Seg[]; frontFar: Seg[]; frontNear: Seg[] }
type Breed = {
  label: string
  coat: Coat
  tail: Seg[]
  body: Seg[] // head, neck and body
  legs: Legs
  collar: Seg[]
  arm: Seg[] // the lifted near front paw, pad around x26-27, y17-19
  devArm: Seg[] // the near front paw reaching down onto the keyboard
  head: [dx: number, dy: number] // headwear offset from the husky's head
  hats?: Partial<Record<string, [dx: number, dy: number]>> // per-costume headwear offsets
  eye: [dx: number, dy: number] // eyewear offset from the husky's eye
  neck: [dx: number, dy: number] // bow tie offset from the husky's throat
  topknot?: Seg[] // drawn only when no hat covers the crown
}

// --- legs ----------------------------------------------------------------------------------
// Legs are drawn in pairs: the hind pair under the rump, the fore pair under the chest, with
// the belly tucked up between them. Templates use T thigh/upper, L leg, P paw, F feathering;
// each breed maps those to its own coat letters. Column 0 is the back of the leg.
// Hind: a round thigh out of the rump, the stifle forward, the lower leg stepping back to
// the hock, then down to a paw one pixel wider than the leg, toes forward.
const HIND: Record<number, string[]> = {
  7: ['.TTTTT', 'TTTTTTT', '.TTTTT', '.LLLL', 'LLLL', 'LLLL', 'PPPPP'],
  6: ['.TTTTT', 'TTTTTT', '.LLLL', 'LLLL', 'LLLL', 'PPPPP'],
  5: ['TTTTTT', 'TTTTTT', 'LLLLL', 'LLLL', 'PPPPP'],
  3: ['LLLL', 'LLLL', 'PPPPP'],
}
// Fore: straight under the chest, thicker at the top, a small forward paw.
const FORE: Record<number, string[]> = {
  7: ['TTTTT', 'TTTTT', '.LLLL', '.LLLL', '.LLLL', '.LLLL', '.PPPPP'],
  6: ['TTTTT', 'TTTTT', '.LLLL', '.LLLL', '.LLLL', '.PPPPP'],
  5: ['TTTTT', 'LLLLL', '.LLLL', '.LLLL', '.PPPPP'],
  3: ['LLLL', 'LLLL', 'PPPPP'],
}
// Samoyed: the same shapes with a fringe of fur down the back of each leg.
const HIND_FLUFF = ['..TTTTT', '.TTTTTTT', '..TTTTT', '.FLLLL', 'FLLLL', 'FLLLL', '.PPPPP']
const FORE_FLUFF = ['.TTTTT', '.TTTTT', 'FFLLLL', 'FFLLLL', '.FLLLL', '..LLLL', '..PPPPP']

type LegTones = { T: string; L: string; P: string; F?: string }
// The far side of the coat: base and highlight drop to shadow.
const SHADE: Record<string, string> = { b: 's', h: 's', s: 's', w: 'v', u: 'v', v: 'v' }
const stamp = (x0: number, y0: number, rows: string[], tones: LegTones, far = false): Seg[] =>
  rows.map((row, i): Seg => [x0, y0 + i, row.replace(/[TLPF]/g, c => {
    const ch = tones[c as keyof LegTones] ?? tones.L
    return far ? SHADE[ch] ?? ch : ch
  })])

// `top` is the body's bottom row, which the near thigh overlaps so it flows out of the rump.
// Far legs sit one row higher and a little apart, in shadow, half hidden behind the body.
type LegPlan = {
  top: number; hind: number; fore: number; hindRows: string[]; foreRows: string[]
  hindTones: LegTones; foreTones: LegTones; farHind?: number; farFore?: number
}
const legsFor = (p: LegPlan): Legs => ({
  backNear: stamp(p.hind, p.top, p.hindRows, p.hindTones),
  backFar: stamp(p.hind + (p.farHind ?? 2), p.top - 1, p.hindRows, p.hindTones, true),
  frontNear: stamp(p.fore, p.top, p.foreRows, p.foreTones),
  frontFar: stamp(p.fore + (p.farFore ?? -2), p.top - 1, p.foreRows, p.foreTones, true),
})

// Blanks the body's bottom row between x1 and x2: the belly tucks up between the pairs.
const tuck = (body: Seg[], x1: number, x2: number): Seg[] =>
  body.map(([x, y, row], i): Seg => (i === body.length - 1 ? [x, y, [...row].map((c, j) => (x + j >= x1 && x + j <= x2 ? '.' : c)).join('')] : [x, y, row]))

// --- breeds ----------------------------------------------------------------------------------
// The lifted near front paw: the forearm rises from the elbow under the chest to the pad
// at x25-27, y16-17, so a prop held at x28 reads as gripped. u leg, p paw, d pad.
const raised = (u: string, p: string, d: string): Seg[] => [
  [25, 16, p + p + p], [23, 17, u + u + p + p + d], [21, 18, u + u + u + u + p + p], [20, 19, u.repeat(4)], [20, 20, u.repeat(3)],
]
// The near front paw reaching down onto the keyboard.
const reaching = (u: string, p: string, d: string): Seg[] => [
  [21, 20, u.repeat(3)], [21, 21, u.repeat(4)], [22, 22, u + p.repeat(3)], [23, 23, p.repeat(3) + d],
]

// Husky: the reference head. Upright triangular ears set back on the skull, grey cap with
// white brow spots, white mask and muzzle, blue eyes, sickle tail curled over the back.
const HUSKY: Breed = {
  label: 'Siberian husky',
  coat: {
    o: '#3E4550', s: '#68717D', b: '#89929E', h: '#A7AFBA',
    patch: { o: '#8E8A84', s: '#D6D3CD', b: '#F2F0EB', h: '#FFFFFF' },
    n: '#2A2B30', e: '#5CB2F2', i: '#E6D2CF', t: '#E07A85', ink: '#2B323A',
  },
  tail: pic(3, [
    '.....bbbb',
    '...bbhhhbb',
    '..bbhbwwwbb',
    '..bbhw...ww',
    '..bbhw',
    '..bbbw',
    '...bbw',
    '...bbbw',
    '....bbbw',
    '.....bbw',
  ]),
  body: tuck(pic(0, [
    '...................b',
    '...............s..bib',
    '..............ss.biib',
    '..............sssbiiib',
    '..............bbbbbbbbbbb',
    '.............bbbbbhhhhbbbb',
    '.............bbbbbbbbbbwwb',
    '.............bbbbbbbbbwwEPw',
    '.............bbbbbbbbwwwwwwwwnn',
    '............bbbbbbbbwwwwwwwwwwn',
    '...........bbbbbbbbwwwwwwQQQQw',
    '.......bbbbbbbbbbbbbwwwwwwwww',
    '......bhhhhhhhbbbbbbbwww',
    '.....bbbbbbbbbbbbbbbbbwww',
    '.....bbbbbbbbbbbbbbbbbwww',
    '.....bbbbbbbbbbbbbbbbbwww',
    '.....bbbbbbbbbbbbbbbbbwww',
    '.....sbbbbbbbbbbbbbbbbwww',
    '......ssssbbbbbbbbbbbwwww',
    '.......vwwwwwwwwwwwwwwww',
  ]), 13, 16),
  legs: legsFor({ top: 19, hind: 5, fore: 18, hindRows: HIND[7], foreRows: FORE[7], hindTones: { T: 'b', L: 'w', P: 'w' }, foreTones: { T: 'b', L: 'w', P: 'w' } }),
  collar: [[14, 9, 'AAA'], [14, 10, 'AAA'], [15, 11, 'AAAA'], [16, 12, 'AAAAAA'], [20, 13, 'g']],
  arm: raised('w', 'w', 'u'),
  devArm: reaching('w', 'w', 'u'),
  head: [0, 0],
  eye: [0, 0],
  neck: [0, 0],
}

// Corgi: long low body, very short legs, large upright pointed ears, fox face. Red with a
// white muzzle, chest and paws. Short fluffy tail.
const CORGI: Breed = {
  label: 'Corgi',
  coat: {
    o: '#7A3D1A', s: '#B9652B', b: '#DB863B', h: '#EDA75F',
    patch: { o: '#9A8F82', s: '#DED7CC', b: '#F6F2EB', h: '#FFFFFF' },
    n: '#2A2426', e: '#3A2618', i: '#F1C8B6', t: '#E07A85', ink: '#3A2A20',
  },
  tail: pic(12, [
    '..bbb',
    '.bbhbb',
    '.bbhbb',
    '..bbbb',
  ]),
  body: tuck(pic(1, [
    '...................b',
    '..............s...bib',
    '.............ss...biib',
    '.............sss.biiib',
    '.............ssssbiiibb',
    '.............bbbbbbbbbbbb',
    '............bbbbbhhhhbbbbb',
    '............bbbbbbbbbbbbbw',
    '............bbbbbbbbbbbEPww',
    '............bbbbbbbbbbbbbbbbbnn',
    '............bbbbbbbbwwwwwwwwwwn',
    '..........bbbbbbbbbwwwwwQQQQw',
    '...bbbbbbbbbbbbbbbbwwwwwwwww',
    '..bhhhhhhhhhhhbbbbbbwwww',
    '..bbbbbbbbbbbbbbbbbbbwww',
    '..bbbbbbbbbbbbbbbbbbbwww',
    '..bbbbbbbbbbbbbbbbbbbwww',
    '..bbbbbbbbbbbbbbbbbbbwww',
    '..bbbbbbbbbbbbbbbbbbbwww',
    '..sbbbbbbbbbbbbbbbbbbwww',
    '...ssswwwwwwwwwwwwwwwww',
  ]), 10, 13),
  legs: legsFor({ top: 21, hind: 3, fore: 16, hindRows: HIND[5], foreRows: FORE[5], hindTones: { T: 'b', L: 'b', P: 'w' }, foreTones: { T: 'w', L: 'w', P: 'w' } }),
  collar: [[13, 11, 'AAA'], [13, 12, 'AAA'], [14, 13, 'AAAA'], [15, 14, 'AAAAAA'], [19, 15, 'g']],
  arm: raised('w', 'w', 'u'),
  devArm: reaching('w', 'w', 'u'),
  head: [-1, 2],
  eye: [-1, 2],
  neck: [-1, 2],
}

// Samoyed: all white and fluffy, scalloped chest ruff, belly fringe and plume, upright
// ears, smiling mouth with the tongue showing, plume tail lying over the back, dark eyes.
const SAMOYED: Breed = {
  label: 'Samoyed',
  coat: { ...WHITE, n: '#2A2628', e: '#3A2A20', i: '#EBC6C0', t: '#E7838F', ink: '#3A4048' },
  tail: pic(5, [
    '....b.bb.b',
    '...bbbbbbbb',
    '..bbhhhhhbbb',
    '..bbhbbbbbbb',
    '..bbbsssssss',
    '...bbsssss',
    '....bbs',
  ]),
  body: tuck(pic(1, [
    '...............s...bb',
    '..............sss.bibb',
    '..............sssbiibb',
    '..............bbbbbbbbbbb',
    '.............bbbbbhhhhbbbb',
    '............bbbbbbbbbbbbbb',
    '...........bbbbbbbbbbbbbPEb',
    '............bbbbbbbbbbbbbbbbbnn',
    '..........bbbbbbbbbbbbbObbbbbbn',
    '...........bbbbbbbbbbbbbOOOOb',
    '.......b.bbbbbbbbbbbbbbbbttb',
    '......bhhhhhhhbbbbbbbbbbbbb',
    '.....bbbbbbbbbbbbbbbbbbbbb',
    '.....bbbbbbbbbbbbbbbbbbbb',
    '.....bbbbbbbbbbbbbbbbbbbbb',
    '.....bbbbbbbbbbbbbbbbbbbb',
    '.....sbbbbbbbbbbbbbbbbbbbb',
    '......ssssbbbbbbbbbbbbbbb',
    '.......sbbsbbsbbsbbsbbsbb',
  ]), 13, 16),
  legs: legsFor({ top: 19, hind: 4, fore: 17, hindRows: HIND_FLUFF, foreRows: FORE_FLUFF, hindTones: { T: 'b', L: 'b', P: 'b', F: 'h' }, foreTones: { T: 'b', L: 'b', P: 'b', F: 'h' } }),
  collar: [[14, 9, 'AAA'], [14, 10, 'AAA'], [15, 11, 'AAAA'], [16, 12, 'AAAAAA'], [20, 13, 'g']],
  arm: raised('b', 'b', 'h'),
  devArm: reaching('b', 'b', 'h'),
  head: [0, 0],
  eye: [0, 0],
  neck: [0, 0],
}

// Bichon frise: white, round cotton-ball head with the ears lost in it, short body, big
// dark round eyes, a short snout poking out of the fluff, plume tail over the back.
const BICHON: Breed = {
  label: 'Bichon frise',
  coat: { ...CREAM_WHITE, n: '#2A2628', e: '#2A2220', i: '#EBC6C0', t: '#E7838F', ink: '#3A4048' },
  tail: pic(7, [
    '....b.bb',
    '...bbbbbb',
    '..bbhhbbbb',
    '..bbhbbbbbb',
    '..bbb..sbbb',
    '..bbb...sb',
    '...bbb',
  ]),
  body: tuck(pic(4, [
    '.................bb.bbb',
    '...............bbbbbbbbbb',
    '..............bbbbhhhhbbbb',
    '.............bbbbbbbbbbbbbb',
    '.............bbbbbbbbbbbbbb',
    '............bbbbbbbbbbbPGbbb',
    '............bbbbbbbbbbbPPbbbbnn',
    '.............bbbbbbbbbbbbbbbbbn',
    '.........bbbbsbbbbbbbbbbbbOOOb',
    '.......bbbbbbssbbbbbbbbbbbbb',
    '......bhhhhhhhssbbbbbbbbbb',
    '.....bbbbbbbbbbbsbbbbbbbbb',
    '.....bbbbbbbbbbbbbbbbbbbb',
    '.....bbbbbbbbbbbbbbbbbbb',
    '.....bbbbbbbbbbbbbbbbbbb',
    '.....sbbbbbbbbbbbbbbbbbb',
    '......sssbbbbbbbbbbbbbb',
  ]), 12, 14),
  legs: legsFor({ top: 20, hind: 5, fore: 17, hindRows: HIND[6], foreRows: FORE[6], hindTones: { T: 'b', L: 'b', P: 'b' }, foreTones: { T: 'b', L: 'b', P: 'b' } }),
  collar: [[12, 12, 'AA'], [13, 13, 'AA'], [14, 14, 'AAA'], [16, 15, 'AAAA'], [19, 16, 'g']],
  arm: raised('b', 'b', 'h'),
  devArm: reaching('b', 'b', 'h'),
  head: [0, 2],
  hats: { fixer: [-2, 1], conductor: [-4, 0] },
  eye: [-1, 2],
  neck: [-1, 2],
}

// Maltese: white long silky coat hanging close to the ground, legs mostly hidden, drop ears
// of long hair, a small top-knot bow, dark eyes.
const MALTESE: Breed = {
  label: 'Maltese',
  coat: { ...WHITE, n: '#2A2628', e: '#2A2220', i: '#EBC6C0', t: '#E7838F', ink: '#3A4048' },
  tail: pic(5, [
    '...bbbbb',
    '..bbhhhbbb',
    '.bbhbbbbbbb',
    '.bbs..sbbbb',
    '.bb...sbbbb',
    '..b...sbsbs',
  ]),
  body: pic(2, [
    '..................bb',
    '.................bhbb',
    '..............bbbbbbbbbb',
    '.............bbbbbhhhhbb',
    '.............bbsssbbbbbb',
    '.............bsssssbbbbPEb',
    '............bbsssssbbbbbbbbbnn',
    '...........bbbsssssbbbbbbbbbbn',
    '..........bbbbsssssbbbbbOOOb',
    '.......bbbbbbbsssssbbbbbbb',
    '.....bhhhhhhhhsssssbbbbbb',
    '....bbbbbbbbbbsssssbbbbb',
    '....bbbbbbbbbbssssssbbbb',
    '...bbbbbbbbbbbbssssbbbbb',
    '...bbbsbbbbbbbbbsbsbbbbbb',
    '...bbbsbbbbbbsbbbbbbbbbb',
    '..bbbbsbbbbbbsbbbbbbsbbb',
    '..bbbbsbbbbbbsbbbbbbsbbbb',
    '..bbbbsbbbbbbbsbbbbbbsbbb',
    '..bbbbbsbbbbbbsbbbbbbsbbbb',
    '.bbbbbbsbbbbbbbsbbbbbbsbbb',
    '.b.bb.bbb.bb.bbb.bb.bbb.bb',
  ]),
  legs: legsFor({ top: 23, hind: 6, fore: 18, hindRows: HIND[3], foreRows: FORE[3], hindTones: { T: 'b', L: 'b', P: 'b' }, foreTones: { T: 'b', L: 'b', P: 'b' } }),
  collar: [[13, 10, 'AA'], [13, 11, 'AAA'], [14, 12, 'AA'], [17, 12, 'AAA'], [19, 13, 'AAA'], [21, 14, 'g']],
  arm: raised('b', 'b', 'h'),
  devArm: reaching('b', 'b', 'h'),
  head: [0, 0],
  eye: [-1, 0],
  neck: [0, 0],
  topknot: [[18, 1, 'rRr'], [19, 2, 'R']],
}

// Shiba inu: red with cream urajiro on the cheeks, throat, chest, belly and inside the
// legs, small thick triangular ears, a tight curled tail over the back, dark almond eyes.
const SHIBA: Breed = {
  label: 'Shiba inu',
  coat: {
    o: '#7E3A16', s: '#BF6526', b: '#DE8A3E', h: '#EEA963',
    patch: { o: '#A08766', s: '#E3CDA8', b: '#F4E4C6', h: '#FBF1DD' },
    n: '#2A2224', e: '#3A2418', i: '#F4E4C6', t: '#E07A85', ink: '#3A2A20',
  },
  tail: pic(4, [
    '.....bbbb',
    '....bbhhbb',
    '...bbwwwbbb',
    '...bbw..wbb',
    '...bbbwwbb',
    '....bbbbb',
    '.....bbb',
    '.....bb',
  ]),
  body: tuck(pic(1, [
    '..................bb',
    '..............ss.bibb',
    '..............sssbiibb',
    '..............bbbbbbbbbbb',
    '.............bbbbbhhhhbbbb',
    '.............bbbbbbbbbbwwb',
    '.............bbbbbbbbbbOPEb',
    '.............bbbbbbbwwwbbbbbbnn',
    '............bbbbbbbwwwwwwwwwwwn',
    '...........bbbbbbbbwwwwwwQQQQw',
    '.......bbbbbbbbbbbbbwwwwwwwww',
    '......bhhhhhhhbbbbbbbwww',
    '.....bbbbbbbbbbbbbbbbbwww',
    '.....bbbbbbbbbbbbbbbbbwww',
    '.....bbbbbbbbbbbbbbbbbwww',
    '.....bbbbbbbbbbbbbbbbbwww',
    '.....sbbbbbbbbbbbbbbbbwww',
    '......ssssbbbbbbbbbbbwwww',
    '.......vwwwwwwwwwwwwwwww',
  ]), 13, 16),
  legs: legsFor({ top: 19, hind: 5, fore: 18, hindRows: HIND[7], foreRows: FORE[7], hindTones: { T: 'b', L: 'b', P: 'w' }, foreTones: { T: 'b', L: 'b', P: 'w' } }),
  collar: [[14, 10, 'AAA'], [14, 11, 'AAA'], [15, 12, 'AAAA'], [16, 13, 'AAAAAA'], [20, 14, 'g']],
  arm: raised('b', 'w', 'u'),
  devArm: reaching('b', 'w', 'u'),
  head: [0, 0],
  eye: [0, 0],
  neck: [0, 0],
}

const BREED_TABLE: Record<string, Breed> = { corgi: CORGI, husky: HUSKY, samoyed: SAMOYED, bichon: BICHON, maltese: MALTESE, shiba: SHIBA }

export const BREEDS: readonly string[] = Object.keys(BREED_TABLE)
export const BREED_LABELS: Readonly<Record<string, string>> = Object.fromEntries(BREEDS.map(k => [k, BREED_TABLE[k].label]))

// FNV-1a so the same agent id always gets the same breed across redraws and sessions.
export const breedOf = (key: string): string => {
  if (!key) return BREEDS[0]
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return BREEDS[h % BREEDS.length]
}

// --- costumes ------------------------------------------------------------------------------
// Layer colours: costume map first, then the fixed props below; 'ink' resolves per coat.
// `at` moves a layer with the breed's head, eye or throat; other layers sit at the paw.
// `ground` props rest on the floor, so they stay out of the walking bob.
type Layer = { segs: Seg[]; g?: string; map?: Record<string, string>; at?: 'head' | 'eye' | 'neck'; ground?: boolean }
type Costume = { hold?: boolean; hat?: boolean; layers: Layer[]; anim: string }

const PROP: Record<string, string> = {
  k: '#3D4752', // dark prop body
  K: '#5C6875', // its lighter face
  w: '#E4E8EC', // light edge
  W: '#F3F0E9', // paper, baton
  y: '#E3B23C', // brass
  o: '#A8743E', // wood
}

const r = (ch: string, n: number) => ch.repeat(n)

// The tier colour ('A' in a map value) tints each costume's main piece, as well as the collar.
// Held props sit at the lifted paw (pad at x25-27, y16-17), one row above the cats' paw.
const COSTUMES: Record<string, Costume> = {
  // builder: headphones + laptop; the screen flickers
  builder: {
    hold: true,
    layers: [
      {
        // band rises in front of the ear, over the crown, down to a round cup at the ear base
        at: 'head',
        map: { K: 'A' },
        segs: [
          [21, 1, 'ww'], [21, 2, 'kk'], [21, 3, 'kk'], [20, 4, 'kk'], [18, 5, 'kkk'],
          [15, 6, 'kkkk'], [15, 7, 'kKKk'], [15, 8, 'kKKk'], [15, 9, 'kKKk'], [16, 10, 'kk'],
        ],
      },
      {
        g: 'it',
        ground: true,
        map: { s: '#C3C9D0', b: '#8AB4F8' },
        segs: [
          [23, 24, r('s', 9)], [23, 25, r('k', 9)],
          [30, 17, 'bk'], [30, 18, 'bk'], [30, 19, 'bk'],
          [29, 20, 'bk'], [29, 21, 'bk'], [29, 22, 'bk'], [29, 23, 'bk'],
        ],
      },
      { g: 'cur', ground: true, map: { b: '#EAF2FF' }, segs: [[30, 18, 'b'], [29, 21, 'b']] },
    ],
    anim: '.p-dogs .d-builder.run .cur{animation:dogs-blink 1s steps(1) infinite}',
  },
  // tester: spectacles + clipboard; the boxes check in one by one
  tester: {
    hold: true,
    layers: [
      {
        // one square lens around the visible eye, the temple arm back toward the ear
        at: 'eye',
        map: { k: 'ink' },
        segs: [[23, 6, 'kkkk'], [18, 7, 'kkkkkk'], [26, 7, 'k'], [23, 8, 'k'], [26, 8, 'k'], [23, 9, 'kkkk']],
      },
      {
        // a narrow board gripped at its top-left corner by the pad; a steel clip on top,
        // three list lines, each with a box that a check fills in
        g: 'it',
        map: { m: '#9AA0A8', P: '#F3F0E9', l: '#A9A9A3', x: '#D6D3CC', o: 'A' },
        segs: [
          [28, 16, 'mmm'],
          [27, 17, 'ooooo'],
          [27, 18, 'oPPPo'], [27, 19, 'oxllo'], [27, 20, 'oPPPo'], [27, 21, 'oxllo'],
          [27, 22, 'oPPPo'], [27, 23, 'oxllo'], [27, 24, 'ooooo'],
        ],
      },
      { g: 'c1', map: { v: '#2E8B57' }, segs: [[28, 19, 'v']] },
      { g: 'c2', map: { v: '#2E8B57' }, segs: [[28, 21, 'v']] },
      { g: 'c3', map: { v: '#2E8B57' }, segs: [[28, 23, 'v']] },
    ],
    // one pass a second: blank, then each box checks in turn
    anim: `.p-dogs .d-tester.run .c1{animation:dogs-t1 1s steps(1) infinite}
.p-dogs .d-tester.run .c2{animation:dogs-t2 1s steps(1) infinite}
.p-dogs .d-tester.run .c3{animation:dogs-t3 1s steps(1) infinite}`,
  },
  // fixer: flat cap + wrench; the wrench works up and down
  fixer: {
    hold: true,
    hat: true,
    layers: [
      {
        // ear tips poke out above the cap; the brim juts past the brow
        at: 'head',
        map: { H: 'A', h: 'A', d: '#4E4539' },
        segs: [[18, 3, r('H', 7)], [17, 4, r('h', 9)], [17, 5, r('h', 9)], [26, 5, 'ddd']],
      },
      {
        // an open-ended wrench held upright in the paw, jaw up
        g: 'it',
        map: { s: '#8C96A3', S: '#5F6874' },
        segs: [[28, 15, 's..s'], [28, 16, 's..s'], [28, 17, 'ssss'], [29, 18, 'sS'], [29, 19, 'sS'], [29, 20, 'sS'], [29, 21, 'sS'], [29, 22, 'sS'], [29, 23, 'sS']],
      },
    ],
    anim: '.p-dogs .d-fixer.run .it{animation:dogs-st .5s steps(1) infinite}',
  },
  // conductor: top hat in front of the ears + bow tie + baton; the baton beats between two poses
  conductor: {
    hold: true,
    hat: true,
    layers: [
      {
        at: 'head',
        map: { r: 'A' },
        segs: [[22, -2, 'wwwww'], [22, -1, 'kKkkk'], [22, 0, 'kKkkk'], [22, 1, 'kKkkk'], [22, 2, 'rrrrr'], [21, 3, 'wkkkkkw']],
      },
      { at: 'neck', map: { r: '#C04257', R: '#8E2332' }, segs: [[21, 14, 'rr.rr'], [21, 15, 'rrRrr'], [21, 16, 'rr.rr']] },
      // the baton swaps between raised and level; the grip pixel stays in the paw
      { segs: [[28, 16, 'k'], [28, 17, 'k']] },
      { g: 'pa', segs: [[29, 15, 'kW'], [30, 14, 'kW'], [31, 13, 'y']] },
      { g: 'pb', segs: [[29, 16, 'WWy'], [29, 17, 'kkk']] },
    ],
    anim: '',
  },
  // scout: bandana + eye patch + spyglass
  scout: {
    hold: true,
    hat: true,
    layers: [
      {
        // tied across the brow under the ears, the knot trailing behind
        at: 'head',
        map: { r: 'A', W: '#F6F2EA' },
        segs: [[14, 4, r('r', 11)], [13, 5, 'rrrWrrrrrWrrr'], [12, 4, 'rr'], [11, 5, 'rr'], [11, 6, 'r']],
      },
      { at: 'eye', map: { k: 'ink' }, segs: [[19, 6, 'kkkk'], [23, 6, 'kkk'], [23, 7, 'kkk'], [23, 8, 'kkk']] },
      // a brass spyglass held level, the wide end out front; the lens glints
      { map: { B: '#BBD2F2' }, segs: [[30, 14, 'kk'], [29, 15, 'kyy'], [28, 16, 'yyyB'], [28, 17, 'oooB'], [29, 18, 'koo'], [30, 19, 'kk']] },
      { g: 'gl', map: { G: '#FFFFFF' }, segs: [[31, 16, 'G']] },
    ],
    anim: '.p-dogs .d-scout.run .gl{animation:dogs-blink 1s steps(1) infinite}',
  },
  // plain: no costume; the collar carries the colour
  plain: { layers: [], anim: '' },
}

// --- render -------------------------------------------------------------------------------
type Cell = { c: string; g: string; key: string; tone: Tones }

// The wag: the same tail with its upper half one pixel further back. The lower rows, where
// it meets the rump, match the first pose, so the join never moves.
const wagOf = (tail: Seg[]): Seg[] => {
  const half = Math.ceil(tail.length / 2)
  return tail.map(([x, y, px], i): Seg => [i < half ? x - 1 : x, y, px])
}

// Paints one pose into rect runs, keyed by animation group.
const paint = (name: string, breed: Breed, accent: string, tail: Seg[]): Map<string, string[]> => {
  const costume = COSTUMES[name]
  const coat = breed.coat
  const patch = coat.patch ?? coat
  const grid: (Cell | null)[][] = Array.from({ length: DOG_H }, () => Array(DOG_W).fill(null))
  const inside = (x: number, y: number) => x >= 0 && x < DOG_W && y >= 0 && y < DOG_H
  const look = (ch: string): [string, Tones] | undefined => {
    const c = ({ b: coat.b, s: coat.s, h: coat.h, n: coat.n, i: coat.i, t: coat.t, E: coat.e, P: '#1E1A1C', G: '#FFFFFF', O: coat.o } as Record<string, string>)[ch]
    if (c) return [c, coat]
    const p = ({ w: patch.b, v: patch.s, u: patch.h, Q: patch.o } as Record<string, string>)[ch]
    if (p) return [p, patch]
  }
  const fill = (segs: Seg[], group: string, set?: Set<string>) => {
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        const hit = look(ch)
        if (!hit || !inside(x + i, y + DY)) return
        grid[y + DY][x + i] = { c: hit[0], g: group, key: ch, tone: hit[1] }
        set?.add(`${x + i},${y + DY}`)
      })
  }
  const { legs } = breed
  // Far legs go under the body, so their tops hide behind it; the near legs go over it, so
  // the near thigh flows out of the rump. Diagonal pairs share a walk phase.
  fill(tail, 'tl')
  const farCells = new Set<string>()
  fill(legs.backFar, 'lb', farCells)
  fill(legs.frontFar, 'la', farCells)
  fill(breed.body, 'bd')
  fill(legs.backNear, 'la')
  if (!costume.hold) fill(legs.frontNear, 'lb')
  const cells = (list: Seg[][]) => {
    const set = new Set<string>()
    for (const segs of list) for (const [x, y, s] of segs) for (let i = 0; i < s.length; i++) if (s[i] !== '.' && s[i] !== ' ') set.add(`${x + i},${y + DY}`)
    return set
  }
  const near = cells(costume.hold ? [legs.backNear] : [legs.backNear, legs.frontNear])
  // Only the far-leg pixels the body and near legs left showing count as far.
  const far = new Set([...farCells].filter(k => !near.has(k) && (grid[+k.split(',')[1]][+k.split(',')[0]]?.g ?? 'bd') !== 'bd'))

  // Outline: any filled pixel that touches empty space or the edge, and a near leg where it
  // passes in front of a far one. The nose stays dark: it is its own outline.
  const outline = (
    only?: (x: number, y: number) => boolean,
    solid: (x: number, y: number, fx: number, fy: number) => boolean = (nx, ny, fx, fy) =>
      !!grid[ny][nx] && !(near.has(`${fx},${fy}`) && far.has(`${nx},${ny}`)),
  ) => {
    const edges: [number, number][] = []
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (!cell || cell.key === 'n' || (only && !only(x, y))) return
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const nx = x + dx
          const ny = y + dy
          return !inside(nx, ny) || !solid(nx, ny, x, y)
        })
        if (open) edges.push([x, y])
      }),
    )
    for (const [x, y] of edges) grid[y][x] = { ...(grid[y][x] as Cell), c: (grid[y][x] as Cell).tone.o }
  }
  outline()
  // A lighter glint on the nose's upper back corner keeps the snout tip readable on dark rows.
  const nose = grid.flatMap((row, y) => row.map((cell, x) => [x, y, cell] as const)).find(([, , cell]) => cell?.key === 'n')
  if (nose) grid[nose[1]][nose[0]] = { ...(nose[2] as Cell), c: '#6B6468' }

  const put = (segs: Seg[], group: string, map: Record<string, string> = {}, [dx, dy]: [number, number] = [0, 0]) => {
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        const gx = x + i + dx
        const gy = y + dy + DY
        if (ch === '.' || ch === ' ' || !inside(gx, gy)) return
        let c = map[ch] ?? (ch === 'A' ? accent : ch === 'g' ? '#E3B23C' : PROP[ch])
        if (c === 'ink') c = coat.ink
        if (c === 'A') c = accent
        if (c) grid[gy][gx] = { c, g: group, key: ch, tone: coat }
      })
  }
  put(breed.collar, 'bd')
  if (breed.topknot && !costume.hat) put(breed.topknot, 'bd', { r: '#E36F93', R: '#B8456A' })
  for (const layer of costume.layers) put(layer.segs, layer.g ?? 'bd', layer.map, layer.at === 'head' ? (breed.hats?.[name] ?? breed.head) : layer.at ? breed[layer.at] : [0, 0])

  // The lifted paw goes on last. It passes in front of the chest, so it is outlined against
  // everything but itself, except at the elbow where it grows out of the body.
  if (costume.hold) {
    const arm = new Set<string>()
    fill(name === 'builder' ? breed.devArm : breed.arm, 'bd', arm)
    const joined = (x: number, y: number) => {
      const cell = grid[y][x]
      if (arm.has(`${x},${y}`)) return true
      return !!cell && x <= 21 && ('bshwvuOQ'.includes(cell.key) || cell.c === coat.o || cell.c === patch.o)
    }
    outline((x, y) => arm.has(`${x},${y}`), joined)
  }

  // One rect per horizontal run of same-colour pixels in the same group: the panel
  // redraws running rows every second, so fewer nodes matter.
  const groups = new Map<string, string[]>()
  grid.forEach((row, y) => {
    let x = 0
    while (x < DOG_W) {
      const cell = row[x]
      if (!cell) {
        x++
        continue
      }
      let end = x + 1
      while (end < DOG_W && row[end]?.g === cell.g && row[end]?.c === cell.c) end++
      const list = groups.get(cell.g) ?? []
      list.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${cell.c}"/>`)
      groups.set(cell.g, list)
      x = end
    }
  })
  return groups
}

// The tail rides the body's bob and wags by swapping between two pixel poses (`tl`, `tw`), so
// it never leaves the grid or pulls away from the rump. Body rects sit straight in `bd`: a
// nested `bd` would bob twice and leave the props behind. Ground props stay out of the bob.
const svgFor = (name: string, breed: Breed, accent: string): string => {
  const costume = COSTUMES[name]
  const groups = paint(name, breed, accent, breed.tail)
  const wag = paint(name, breed, accent, wagOf(breed.tail)).get('tl') ?? []
  const g = (k: string, rects = groups.get(k)) => (rects ? `<g class="${k}">${rects.join('')}</g>` : '')
  const ground = new Set(costume.layers.filter(l => l.ground).map(l => l.g ?? 'bd'))
  const props = (onGround: boolean) =>
    [...groups.keys()].filter(k => !['bd', 'la', 'lb', 'tl'].includes(k) && ground.has(k) === onGround).map(k => g(k)).join('')
  return `<g class="bd">${g('tl')}${g('tw', wag)}${(groups.get('bd') ?? []).join('')}${props(false)}</g>${props(true)}${g('la')}${g('lb')}`
}

// Same walk and prop motion as the cats. A dog wags faster than a cat swishes.
const DOG_CSS = `<style>
.p-dogs .run g{transform-box:fill-box}
.p-dogs .run .la{animation:dogs-st .5s steps(1) infinite}
.p-dogs .run .lb{animation:dogs-st .5s steps(1) infinite -.25s}
.p-dogs .run .bd{animation:dogs-bob .5s steps(1) infinite -.125s}
.p-dogs .tw,.p-dogs .pb{opacity:0}
.p-dogs .run .pa{animation:dogs-off .5s steps(1) infinite}
.p-dogs .run .pb{animation:dogs-on .5s steps(1) infinite}
.p-dogs .run .tl{animation:dogs-off .5s steps(1) infinite}
.p-dogs .run .tw{animation:dogs-on .5s steps(1) infinite}
@keyframes dogs-st{50%{transform:translateY(-1px)}}
@keyframes dogs-bob{50%{transform:translateY(1px)}}
@keyframes dogs-off{50%{opacity:0}}
@keyframes dogs-on{50%{opacity:1}}
@keyframes dogs-blink{50%{opacity:.25}}
@keyframes dogs-t1{0%{opacity:0}25%{opacity:1}}
@keyframes dogs-t2{0%{opacity:0}50%{opacity:1}}
@keyframes dogs-t3{0%{opacity:0}75%{opacity:1}}
${Object.values(COSTUMES).map(c => c.anim).filter(Boolean).join('\n')}
@media (prefers-reduced-motion: reduce){.p-dogs .run,.p-dogs .run g{animation:none!important}}
</style>`

// The grid is the same for every redraw of a row, so build it once per look.
const cache = new Map<string, string>()

const inner = (costume: string, breed: string, accent: string): string => {
  const key = `${costume}|${breed}|${accent}`
  let hit = cache.get(key)
  if (hit === undefined) {
    hit = svgFor(costume, BREED_TABLE[breed], accent)
    cache.set(key, hit)
  }
  return hit
}

export const COSTUME_NAMES: readonly string[] = Object.keys(COSTUMES)

// `mirror` flips the dog inside its own box (x .. x + DOG_W * scale) so it faces left.
// The dogs dress by role; the tier only reaches them through the accent colour.
const draw = (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions): string => {
  const name = Object.prototype.hasOwnProperty.call(COSTUMES, who.role) ? who.role : 'plain'
  const breed = BREED_TABLE[o.variant] ? o.variant : BREEDS[0]
  const scale = o.scale ?? 1
  const place = o.mirror ? `translate(${x + DOG_W * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  return `<g class="p-dogs"><g transform="${place}" opacity="${o.dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="dog d-${name}${o.isWalking ? ' run' : ''}">${inner(name, breed, o.accent)}</g></g></g>`
}

export const dogs: Pack = {
  id: 'dogs',
  name: 'Pixel dogs',
  w: DOG_W,
  h: DOG_H,
  css: DOG_CSS,
  roles: ROLES,
  variants: BREEDS,
  variantOf: breedOf,
  draw,
}
