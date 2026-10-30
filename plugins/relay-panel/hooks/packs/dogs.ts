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

// A straight leg: `w` wide from y0 to y25, the paw one pixel longer forward.
const leg = (x: number, y0: number, w: number, ch: string, top = ''): Seg[] => {
  const segs: Seg[] = []
  for (let y = y0; y <= 25; y++) segs.push([x, y, y === 25 ? ch.repeat(w + 1) : y - y0 < top.length ? top[y - y0].repeat(w) : ch.repeat(w)])
  return segs
}

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
  body: pic(0, [
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
  ]),
  legs: {
    backFar: leg(10, 20, 3, 'v'),
    backNear: [[6, 20, 'wwww'], [6, 21, 'wwww'], [7, 22, 'www'], [7, 23, 'www'], [7, 24, 'www'], [7, 25, 'wwww']],
    frontFar: leg(16, 20, 3, 'v'),
    frontNear: leg(19, 20, 3, 'w'),
  },
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
  body: pic(1, [
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
  ]),
  legs: {
    backFar: leg(8, 22, 3, 'v'),
    backNear: leg(4, 22, 4, 'w', 'b'),
    frontFar: leg(16, 22, 3, 'v'),
    frontNear: leg(19, 22, 3, 'w'),
  },
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
  body: pic(1, [
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
    '.............b.b......b',
  ]),
  legs: {
    backFar: leg(10, 20, 3, 's'),
    backNear: [[6, 20, 'bbbb'], [6, 21, 'bbbb'], [7, 22, 'bbbb'], [7, 23, 'bbb'], [7, 24, 'bbb'], [7, 25, 'bbbb']],
    frontFar: leg(16, 20, 3, 's'),
    frontNear: leg(19, 20, 4, 'b'),
  },
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
  body: pic(4, [
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
  ]),
  legs: {
    backFar: leg(10, 21, 3, 's'),
    backNear: leg(6, 21, 4, 'b'),
    frontFar: leg(15, 21, 3, 's'),
    frontNear: leg(18, 21, 4, 'b'),
  },
  collar: [[12, 12, 'AA'], [13, 13, 'AA'], [14, 14, 'AAA'], [16, 15, 'AAAA'], [19, 16, 'g']],
  arm: raised('b', 'b', 'h'),
  devArm: reaching('b', 'b', 'h'),
  head: [0, 2],
  hats: { designer: [-3, 1], architect: [-2, 1], orchestrator: [-4, 0] },
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
  legs: {
    backFar: leg(9, 24, 3, 's'),
    backNear: leg(6, 24, 3, 'b'),
    frontFar: leg(16, 24, 3, 's'),
    frontNear: leg(19, 24, 3, 'b'),
  },
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
  body: pic(1, [
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
  ]),
  legs: {
    backFar: leg(10, 20, 3, 'v'),
    backNear: [[6, 20, 'bbbb'], [6, 21, 'bbbw'], [7, 22, 'bbw'], [7, 23, 'bbw'], [7, 24, 'www'], [7, 25, 'wwww']],
    frontFar: leg(16, 20, 3, 'v'),
    frontNear: leg(19, 20, 3, 'w', 'bbbb'),
  },
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

const COSTUMES: Record<string, Costume> = {
  // headphones + laptop; the screen flickers
  developer: {
    hold: true,
    layers: [
      {
        // band rises in front of the ear, over the crown, down to a round cup at the ear base
        at: 'head',
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
    anim: '.p-dogs .d-developer.run .cur{animation:dogs-blink 1s steps(1) infinite}',
  },
  // beret + brush + palette; the brush dabs
  designer: {
    hold: true,
    hat: true,
    layers: [
      {
        // a flat disc tipped forward over the brow, in front of the ears
        at: 'head',
        map: { r: '#C04257', R: '#8E2332' },
        segs: [[24, 1, 'r'], [21, 2, r('r', 7)], [20, 3, r('r', 9)], [21, 4, r('R', 4)]],
      },
      {
        g: 'gd',
        ground: true,
        map: { p: '#C9955A', r: '#D0453F', b: '#2F6FD6', e: '#3B9C5F' },
        segs: [[25, 23, 'ppppp'], [24, 24, 'prpbyp'], [24, 25, 'ppeppp']],
      },
      { g: 'it', map: { r: '#D0453F' }, segs: [[28, 17, 'o'], [29, 16, 'o'], [30, 15, 'rr'], [30, 14, 'rr']] },
    ],
    anim: '.p-dogs .d-designer.run .it{animation:dogs-dab .5s steps(1) infinite}',
  },
  // spectacles + clipboard; the checks tick in one by one
  planner: {
    hold: true,
    layers: [
      {
        // one square lens around the visible eye, the temple arm back toward the ear
        at: 'eye',
        map: { k: 'ink' },
        segs: [[23, 6, 'kkkk'], [18, 7, 'kkkkkk'], [26, 7, 'k'], [23, 8, 'k'], [26, 8, 'k'], [23, 9, 'kkkk']],
      },
      {
        g: 'it',
        map: { m: '#9AA0A8', P: '#F3F0E9', l: '#BFBFBA' },
        segs: [
          [28, 15, 'mm'],
          [26, 16, 'oooooo'],
          [26, 17, 'oPPPPo'], [26, 18, 'oPPllo'], [26, 19, 'oPPPPo'], [26, 20, 'oPPllo'],
          [26, 21, 'oPPPPo'], [26, 22, 'oPPllo'], [26, 23, 'oPPPPo'], [26, 24, 'oooooo'],
        ],
      },
      { g: 'c1', map: { v: '#3B9C5F' }, segs: [[27, 18, 'vv']] },
      { g: 'c2', map: { v: '#3B9C5F' }, segs: [[27, 20, 'vv']] },
      { g: 'c3', map: { v: '#3B9C5F' }, segs: [[27, 22, 'vv']] },
    ],
    anim: `.p-dogs .d-planner.run .c1{animation:dogs-tick 1.5s steps(1) infinite}
.p-dogs .d-planner.run .c2{animation:dogs-tick 1.5s steps(1) infinite -.5s}
.p-dogs .d-planner.run .c3{animation:dogs-tick 1.5s steps(1) infinite -1s}`,
  },
  // flat cap + blueprint tube; the tube sways
  architect: {
    hold: true,
    hat: true,
    layers: [
      {
        // ear tips poke out above the cap; the brim juts past the brow
        at: 'head',
        map: { h: '#6E6253', H: '#A3957F', d: '#4E4539' },
        segs: [[18, 3, r('H', 7)], [17, 4, r('h', 9)], [17, 5, r('h', 9)], [26, 5, 'ddd']],
      },
      {
        g: 'it',
        map: { b: '#3E78CF', B: '#BBD2F2' },
        segs: [
          [28, 16, 'BBB'],
          ...[17, 18, 20, 21, 23, 24].map(y => [28, y, 'bbb'] as Seg),
          [28, 19, 'BBB'], [28, 22, 'BBB'], [28, 25, 'BBB'],
        ],
      },
    ],
    anim: '.p-dogs .d-architect.run .it{transform-origin:50% 100%;animation:dogs-sway 1.6s ease-in-out infinite}',
  },
  // top hat in front of the ears + bow tie + baton; the baton conducts
  orchestrator: {
    hold: true,
    hat: true,
    layers: [
      {
        at: 'head',
        map: { r: '#8E2332' },
        segs: [[22, -2, 'wwwww'], [22, -1, 'kKkkk'], [22, 0, 'kKkkk'], [22, 1, 'kKkkk'], [22, 2, 'rrrrr'], [21, 3, 'wkkkkkw']],
      },
      { at: 'neck', map: { r: '#C04257', R: '#8E2332' }, segs: [[21, 14, 'rr.rr'], [21, 15, 'rrRrr'], [21, 16, 'rr.rr']] },
      { g: 'it', segs: [[28, 16, 'kW'], [29, 15, 'kW'], [30, 14, 'kW'], [31, 13, 'y']] },
    ],
    anim: '.p-dogs .d-orchestrator.run .it{transform-origin:0% 100%;animation:dogs-conduct .5s ease-in-out infinite}',
  },
  // bandana + eye patch + cutlass; the cutlass lunges
  explore: {
    hold: true,
    hat: true,
    layers: [
      {
        // tied across the brow under the ears, the knot trailing behind
        at: 'head',
        map: { r: '#C7563D', W: '#F6F2EA' },
        segs: [[14, 4, r('r', 11)], [13, 5, 'rrrWrrrrrWrrr'], [12, 4, 'rr'], [11, 5, 'rr'], [11, 6, 'r']],
      },
      { at: 'eye', map: { k: 'ink' }, segs: [[19, 6, 'kkkk'], [23, 6, 'kkk'], [23, 7, 'kkk'], [23, 8, 'kkk']] },
      { g: 'it', map: { s: '#D3D6DB' }, segs: [[28, 17, 'y'], [28, 18, 'y'], [28, 19, 'y'], [29, 16, 'ks'], [29, 15, 'ks'], [30, 14, 'ks'], [31, 13, 's']] },
    ],
    anim: '.p-dogs .d-explore.run .it{transform-origin:0% 100%;animation:dogs-lunge .5s ease-in-out infinite}',
  },
  // no costume; the collar carries the colour
  other: { layers: [], anim: '' },
}

// --- render -------------------------------------------------------------------------------
type Cell = { c: string; g: string; key: string; tone: Tones }

const svgFor = (name: string, breed: Breed, accent: string): string => {
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
  fill(breed.tail, 'tl')
  fill(breed.body, 'bd')
  // Far legs first so the near ones overlap them; diagonal pairs share a walk phase.
  fill(legs.backFar, 'lb')
  fill(legs.frontFar, 'la')
  fill(legs.backNear, 'la')
  if (!costume.hold) fill(legs.frontNear, 'lb')
  const cells = (list: Seg[][]) => {
    const set = new Set<string>()
    for (const segs of list) for (const [x, y, s] of segs) for (let i = 0; i < s.length; i++) if (s[i] !== '.' && s[i] !== ' ') set.add(`${x + i},${y + DY}`)
    return set
  }
  const near = cells(costume.hold ? [legs.backNear] : [legs.backNear, legs.frontNear])
  const far = new Set([...cells([legs.backFar, legs.frontFar])].filter(k => !near.has(k)))

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
    fill(name === 'developer' ? breed.devArm : breed.arm, 'bd', arm)
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
  const g = (k: string) => (groups.has(k) ? `<g class="${k}">${groups.get(k)?.join('')}</g>` : '')
  const ground = new Set(costume.layers.filter(l => l.ground).map(l => l.g ?? 'bd'))
  const props = (onGround: boolean) =>
    [...groups.keys()].filter(k => !['bd', 'la', 'lb', 'tl'].includes(k) && ground.has(k) === onGround).map(g).join('')
  return `${g('tl')}<g class="bd">${g('bd')}${props(false)}</g>${props(true)}${g('la')}${g('lb')}`
}

// Same walk and prop motion as the cats, with two dog-only rules: the body group sits inside
// the outer .bd, so it must not bob a second time, and a dog's tail wags from its base.
const DOG_CSS = `<style>
.p-dogs .run g{transform-box:fill-box}
.p-dogs .run .la{animation:dogs-st .5s steps(1) infinite}
.p-dogs .run .lb{animation:dogs-st .5s steps(1) infinite -.25s}
.p-dogs .run .bd{animation:dogs-bob .5s steps(1) infinite -.125s}
.p-dogs .run .tl{transform-origin:85% 100%;animation:dogs-swish 1.2s ease-in-out infinite}
.p-dogs .dog.run .bd .bd{animation:none}
.p-dogs .dog.run .tl{transform-origin:50% 100%;animation:dogs-wag .4s ease-in-out infinite}
@keyframes dogs-st{50%{transform:translateY(-1px)}}
@keyframes dogs-bob{50%{transform:translateY(1px)}}
@keyframes dogs-swish{50%{transform:rotate(-12deg)}}
@keyframes dogs-wag{50%{transform:rotate(-6deg)}}
@keyframes dogs-blink{50%{opacity:.25}}
@keyframes dogs-dab{50%{transform:translate(1px,-1px)}}
@keyframes dogs-tick{0%{opacity:0}33%{opacity:1}}
@keyframes dogs-sway{50%{transform:rotate(6deg)}}
@keyframes dogs-conduct{50%{transform:rotate(-24deg)}}
@keyframes dogs-lunge{50%{transform:translateX(1px) rotate(-8deg)}}
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
  const name = COSTUMES[who.role] ? who.role : 'other'
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
