// A pixel fantasy party, front-facing, on a 32x30 grid drawn as SVG rects. The role picks the
// adventurer, so a crew reads as a party: the magician conducts (conductor), the Thief builds
// (builder), the knight fixes (fixer), the healer tests (tester), the archer scouts (scout) and
// the ninja is everyone else (plain). The seed is ignored: every character has one look.
//
// Every figure is filled in flat colours first, then each pixel touching empty space becomes an
// outline (a shared dark one unless the ink names its own). Shading is per ink: `h` lights the
// left edge of a colour region and `s` shades its right and bottom edges, as on the ninja's suit
// and the Thief's coat. Most rows are drawn from a left half mirrored to the right, in solid
// blocks rather than single-pixel noise.
//
// The tier accent tints exactly one costume piece: the magician's hat band, the Thief's coat
// clasp, the knight's plume, the healer's stole, the archer's hood trim and the ninja's headband.
//
// Motion (only while running, off under prefers-reduced-motion): everyone steps in place (`la` /
// `lb` legs half a cycle apart) with a body bob (`bd`). On top: the magician's orb pulses (halo
// and hot core blink on); the Thief's daggers swap between crossed and swung out while a glint
// runs along them (`g1`..`g4`), his eyes pulse, shadow wisps rise, the coat hem and the shadow
// soldiers behind him sway; the knight raises the sword a step while a glint (`gl`) climbs the
// blade; the healer's tome bobs with its glow while plus signs and sparkles rise and fade above
// it (`s1`..`s3`); the archer's fire arrow flickers between two flame frames with a white-hot
// core; the ninja's eyes twinkle and the tail of the headband flutters.
//
// Size: the gallery pane draws nothing past 100,000 characters across every pack, so rows are
// encoded painter-style (a colour's run may cross pixels painted after it) to keep runs few,
// wide and stackable for `compact`.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

export const ADV_W = 32
export const ADV_H = 30

// --- inks -------------------------------------------------------------------------------------
// An ink is a fill colour with optional shadow / highlight tones and the outline tone it turns
// into where it meets empty space. No `o`: flat, and empty to its neighbours. `o` equal to `c`:
// solid but never outlined or shaded (eyes, buckles, wood). `m` makes a detail count as part of
// a neighbouring colour region for shading, so an eye does not cast a shadow line on the face.
type Ink = { c: string; o?: string; s?: string; h?: string; m?: string }
const OUT = '#2A2030'
const tone = (c: string, s?: string, h?: string, o = OUT): Ink => ({ c, s, h, o })
const solid = (c: string, m?: string): Ink => (m ? { c, o: c, m } : { c, o: c })

// The tier accent as a costume piece, outlined like the rest.
const accentInk = (a: string): Ink => tone(a)

const SKIN = tone('#F2C9A5')
// Hands are two or three pixels wide, so they are mostly outline: a lighter outline keeps them skin.
const HAND = tone('#F2C9A5', undefined, undefined, '#B87A5E')
// Eyes, brows and seams share the outline's colour, so they cost no extra paint.
const EYE = solid(OUT, 'f')
const MOUTH = solid('#A8524A', 'f')
const BLUSH = solid('#EE9F8E', 'f')
const GOLD = tone('#E6B23A')
const BOOT = tone('#5A3A24')
const BRASS = solid('#E6B23A')
const DARK = solid(OUT)

// --- pictures ---------------------------------------------------------------------------------
// A segment is [x, y, pixels]; '.' leaves the cell alone, '_' clears it, any other letter is an ink.
type Seg = [x: number, y: number, s: string]
type Part = { g: string; segs: Seg[] }
// A layer is painted on its own grid, so it gets its own outline and can move without leaving a
// hole in what is under it. `flat` layers are plain colour pixels (glows, glints, flames).
type Layer = { g: string; in?: string; segs: Seg[]; flat?: Record<string, string> }
// `back` layers are flat and drawn behind everything, legs included (the Thief's shadow soldiers).
type Figure = { ink: Record<string, Ink>; base: Part[]; layers: Layer[]; back?: Layer[] }

const HALF = ADV_W / 2
const flip = (s: string) => [...s].reverse().join('')
// Symmetric rows: each string is the left half, right-aligned to the centre, mirrored to the right.
const sym = (y0: number, halves: string[]): Seg[] =>
  halves.map((h, i) => {
    const l = h.padStart(HALF, '.')
    return [0, y0 + i, l + flip(l)] as Seg
  })
// Right-half rows from the centre outwards; the rest of the half is cleared.
const right = (y0: number, rows: string[]): Seg[] => rows.map((s, i) => [HALF, y0 + i, s.padEnd(HALF, '_')] as Seg)
const col = (x: number, y0: number, y1: number, s: string): Seg[] =>
  Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i, s] as Seg)
const mirrorSegs = (segs: Seg[]): Seg[] => segs.map(([x, y, s]) => [ADV_W - x - s.length, y, flip(s)] as Seg)
// A glint on a blade whose middle column is x: a white spark with a soft cross round it. One
// glint (`gl`) climbs the blade in four steps while running.
const glint = (x: number, y: number): Seg[] => [[x, y - 1, 'W'], [x - 1, y, 'WWW'], [x, y + 1, 'W']]
const GLINT = { W: '#FFFFFF' }

// ---- magician (conductor) --------------------------------------------------------------------
// Tall pointed hat with a gold star over a band in the accent, long white beard, deep blue robe
// with wide sleeves, gold cuffs and hem, a star and moon on the cloth; the staff stands in the
// right hand, topped with a glowing orb. Letters: h hat, A band, f skin, j hand, w beard,
// v sleeve, r robe, y gold, x/X stars, Z moon, k shoe, o/O staff, q/Q/W orb.
const magician = (A: Ink): Figure => ({
  ink: {
    h: tone('#3B4FB4'), A, f: SKIN, j: HAND, e: EYE, c: BLUSH,
    w: tone('#F2F0EA'), v: tone('#3A4BAF'),
    r: tone('#2E3D99'), y: GOLD, x: solid('#E6B23A', 'h'), X: solid('#E6B23A', 'r'),
    Z: solid('#E6B23A', 'r'), k: BOOT, o: solid('#A8743E'), O: solid('#5A3A24'),
    q: solid('#3AA0D8'), Q: solid('#8FE0FF'), W: solid('#E9FCFF'),
  },
  base: [
    {
      g: 'bd',
      segs: sym(0, [
        'h', 'hh', 'hh', 'hhh', 'hhh', 'hhhh', 'AAAA', 'AAAAA', 'hhhhhhhh',
        'fwwff', 'ffeff', 'fcfff',
        'wwwwww', 'vvwwwwww', 'vvvrwwwww', 'vvvvrrwwww', 'vvvvrrrwww', 'vvvvvrrrrww', 'vvvvvrrrrrw', 'vvvvvvrrrrrr',
        'yyyyyyrrrrrr', 'jj.rrrrrrr', 'jj.rrrrrrr', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrrr', 'rrrrrrrrr', 'yyyyyyyyyy',
      ]),
    },
    // hat star, robe stars and a crescent moon
    { g: 'bd', segs: [[15, 3, 'x'], [14, 4, 'xxx'], [15, 5, 'x'], [11, 23, 'X'], [20, 24, 'X'], [14, 26, 'X'], [18, 21, 'Z'], [17, 22, 'Z']] },
    // the staff with its prongs and orb; the right hand moves out of the sleeve to grip it
    { g: 'bd', segs: [[27, 4, 'O'], [30, 4, 'O'], ...col(28, 4, 29, 'oO'), [27, 0, '.qq.'], [27, 1, 'qQWq'], [27, 2, 'qQQq'], [27, 3, '.qq.']] },
    { g: 'bd', segs: [[24, 21, '__jjj'], [24, 22, '__jjj']] },
    { g: 'la', segs: [[10, 28, 'kkkk'], [10, 29, 'kkkk']] },
    { g: 'lb', segs: [[18, 28, 'kkkk'], [18, 29, 'kkkk']] },
  ],
  layers: [
    { g: 'oh', flat: { h: 'rgba(143,224,255,.55)' }, segs: [[27, 0, 'h..h'], [26, 1, 'h....h'], [26, 2, 'h....h'], [27, 3, 'h..h']] },
    { g: 'ob', flat: { W: '#FFFFFF' }, segs: [[28, 1, 'WW'], [28, 2, 'WW']] },
  ],
})

// ---- thief (builder) -------------------------------------------------------------------------
// A pixel tribute to Sung Jinwoo of Solo Leveling, the Shadow Monarch, as a chibi shadow assassin.
// Traits confirmed on the Solo Leveling wiki (solo-leveling.fandom.com):
// - Sung_Jinwoo, Appearance: tall and muscular; gray eyes that glow purple when he uses his powers;
//   sharp features; black hair with bangs that hang down to his eyes; favours dark clothing, from
//   tailored suits to long hooded coats.
// - Demon_King's_Daggers (his main pair): large black daggers with brown hilts and red guards; in
//   his hands their edges glow light purple.
// - Igris: jet-black armour from head to toe, a light purple glow, a tattered black cape and a long
//   red plume from the back of the helmet. Beru: a huge humanoid shadow ant with a light purple
//   glow, neon eyes, sharp claws and smoky wings.
// Not confirmed in a source: a violet aura or wisps round Jinwoo himself (here a stylisation of
// his shadows' glow) and the cut of the coat. The blades are dark with a light violet edge and a
// glint after the Demon King's Daggers.
// Drawn upright and unmasked: short, messy black hair (spikes on top, side-swept bangs touching
// the brows, cut above the ears), violet eyes with a light glint, a straight dark hooded coat in
// three flat tones with a violet rim down the right edge, a belt with a clasp in the accent (the
// only tinted piece), a hem with three ragged points over visible boots. Twin daggers cross in
// front of the chest, hands gripping the hilts at the bottom of the X: dark blades with a light
// violet edge, red guards and brown hilts. Behind him stand two shadow soldiers with a lighter
// violet rim: a plumed knight (Igris) on the left and an ant (Beru) on the right. Letters: H hair,
// h shine, V rim, f skin, E lash, e eye, m mouth, C coat, T shirt, B belt, A clasp, j hand,
// p trousers, b boot; flat: k blade, l edge, u hilt, r guard, W glint; n/v/e/r shadow soldier,
// rim, eye and plume.
const K0 = '#0D0A14'
const THIEF_LEG: Seg[] = [[12, 26, 'ppp'], [12, 27, 'ppp'], [11, 28, 'bbbb'], [11, 29, 'bbbb']]
const DAGGER = { k: '#2B2740', l: '#B9A0E8', u: '#6B4A32', r: '#B3262E' }
// One dagger for the left hand; the right hand holds its mirror, drawn first so the left is in front.
const pair = (segs: Seg[]): Seg[] => [...mirrorSegs(segs), ...segs]
const VGLINT = { W: '#F1EAFF' }
const SHADOW = { n: '#2A1F44', v: '#5E4B94', e: '#D6C6FF', r: '#B8283A' }
const thief = (A: Ink): Figure => ({
  ink: {
    H: solid(K0), h: solid('#2B2540', 'H'), V: solid('#7A62C4', 'C'),
    f: tone('#E8C9A0', undefined, undefined, K0), E: solid(K0, 'f'), e: solid('#A57CFF', 'f'), m: solid('#B98A70', 'f'),
    C: tone('#1A1626', undefined, '#34294D', K0), T: tone('#2E2A3A', undefined, undefined, K0),
    B: solid('#2B2540', 'C'), A: solid(A.c, 'C'), j: solid('#E8C9A0'),
    p: tone('#15121F', undefined, undefined, K0), b: tone('#2B2540', undefined, undefined, K0),
  },
  base: [
    {
      g: 'bd',
      segs: [
        [9, 1, '...H...H...H'], [9, 2, '..HH..HHH.HH'], [10, 3, 'HHHHHHHHHHHH'], ...col(9, 4, 7, 'HHHHHHHHHHHHHH'),
        [9, 8, 'HffHHfHHHfHHfH'], [9, 9, 'fffEEffffEEfff'], [9, 10, 'fffeeffffeefff'], [10, 11, 'ffffffffffff'],
        [11, 12, 'ffffmmffff'], [9, 13, 'CCCffffffffCCC'],
        [8, 14, 'CCCCCCTTTTCCCCCC'], [8, 15, 'CCCCCCCTTCCCCCCC'], ...col(8, 16, 22, 'CCCCCCCCCCCCCCCC'),
        [10, 21, 'jj........jj'], [10, 22, 'jj........jj'], [8, 23, 'BBBBBBAAAABBBBBB'], ...col(8, 24, 25, 'CCCCCCCCCCCCCCCC'),
        [12, 2, 'h'], [11, 3, 'hh'], [10, 4, 'hh'], [15, 2, 'hh'], [16, 3, 'h'],
        [21, 3, 'V'], ...col(22, 4, 8, 'V'), ...col(23, 14, 25, 'V'),
      ],
    },
    // the hem's three ragged points, which sway while running
    { g: 'hm', segs: [[8, 26, 'CCC....CC....CCV']] },
    { g: 'la', segs: THIEF_LEG },
    { g: 'lb', segs: mirrorSegs(THIEF_LEG) },
  ],
  layers: [
    // eye glints, daggers crossed (pose a) and raised apart in a V (pose b), a glint running up
    // the edges in four steps, and wisps over the shoulders
    { g: 'eg', flat: { W: '#F3ECFF' }, segs: [[12, 10, 'W......W']] },
    {
      g: 'da',
      flat: DAGGER,
      segs: pair([[12, 20, 'ur'], [12, 19, 'r'], [13, 19, 'kl'], [14, 18, 'kl'], [15, 17, 'kl'], [16, 16, 'kl'], [17, 15, 'kl'], [18, 14, 'kl']]),
    },
    { g: 'db', flat: DAGGER, segs: pair([[11, 20, 'u'], [10, 19, 'rrr'], ...col(11, 17, 18, 'kl'), ...col(10, 15, 16, 'kl'), [9, 14, 'kl']]) },
    { g: 'g1', flat: VGLINT, segs: [[15, 18, 'WW']] },
    { g: 'g2', flat: VGLINT, segs: [[12, 14, 'W'], [19, 14, 'W']] },
    { g: 'g3', flat: VGLINT, segs: [[12, 17, 'W'], [19, 17, 'W']] },
    { g: 'g4', flat: VGLINT, segs: [[10, 14, 'W'], [21, 14, 'W']] },
    { g: 'w1', flat: { v: 'rgba(165,124,255,.6)' }, segs: [[8, 12, 'v'], [23, 11, 'v']] },
  ],
  back: [
    // Igris: a helmet with a glowing visor slit and a red plume, pauldrons and a short body
    {
      g: 'sa',
      flat: SHADOW,
      segs: [
        [1, 8, 'rr'], [1, 9, 'rnnn'], [1, 10, 'vnnnn'], [1, 11, 'vneen'], [1, 12, 'vnnnn'], [2, 13, 'nnn'],
        [0, 14, 'vnnnnnn'], [0, 15, 'vnnnnnn'], ...col(1, 16, 19, 'vnnnn'), [1, 20, 'nn.nn'],
      ],
    },
    // Beru: an ant's head with two antennae, two eyes and mandibles, on a narrow thorax
    {
      g: 'sb',
      flat: SHADOW,
      segs: [
        [26, 6, 'n...n'], [27, 7, 'n.n'], [26, 8, 'nnnnn'], [25, 9, 'nnnnnnv'], [25, 10, 'neeneev'], [25, 11, 'nnnnnnv'],
        [26, 12, 'nnnnv'], [26, 13, 'n...n'], [27, 14, 'nnn'], [25, 15, 'nnnnnnv'], ...col(26, 16, 19, 'nnnnv'), [26, 20, 'nn.nn'],
      ],
    },
  ],
})

// ---- knight (fixer) --------------------------------------------------------------------------
// Steel helmet with the visor raised over a face, a sweeping plume in the accent, a short red
// capelet over the pauldrons fastened with a brass clasp, breastplate, belt and tassets, greaves
// and dark sabatons. A blue kite shield with a gold rim and a white cross on the left arm; a
// sword held upright in the right gauntlet. Letters: a steel, d dark steel, f skin, r capelet,
// b belt, y brass, A plume, k shield, x cross, l blade, Y/J crossguard.
const KNIGHT_LEG: Seg[] = [[11, 25, 'aaaa'], [11, 26, 'aaaa'], [11, 27, 'aaaa'], [10, 28, 'ddddd'], [10, 29, 'ddddd']]
const knight = (A: Ink): Figure => ({
  ink: {
    a: tone('#B7BFCB'), d: tone('#7E8898'),
    f: SKIN, e: EYE, m: MOUTH, c: BLUSH, r: tone('#B8283A'), b: tone('#6B4426'),
    y: BRASS, A, k: tone('#3E6DB5'), x: solid('#F6F1E4', 'k'),
    l: tone('#C3CCD6'), Y: solid('#F2C94C'), J: solid('#A87A1E'),
  },
  base: [
    {
      g: 'bd',
      segs: sym(3, [
        'aaaa', 'aaaaa', 'aaaaaa', 'aaaaaa', 'aadddd', 'aaffff', 'aafeff', 'aacfff', 'aafffm', 'aaaaaa', 'ddddd',
        'rrrrrrrry', 'rrrrrrrraa', 'rrrrrraaaa', 'rrrrraaaaa', 'aaa.aaaaa', 'aaa.aaaaa', 'aaa.aaaaa', 'ddd.aaaaa',
        'bbbbby', 'aaaaaa', 'aaaaa.',
      ]),
    },
    { g: 'bd', segs: [[14, 0, 'AAAA'], [11, 1, 'AAAAAAA'], [9, 2, 'AAAAA.AA'], [9, 3, 'AA'], [9, 4, 'A']] },
    { g: 'la', segs: KNIGHT_LEG },
    { g: 'lb', segs: mirrorSegs(KNIGHT_LEG) },
  ],
  layers: [
    {
      g: 'sh',
      segs: [
        [2, 14, 'kkkkkkkkkk'], [2, 15, 'kyyyyyyyyk'], [2, 16, 'kykkxxkkyk'], [2, 17, 'kykkxxkkyk'], [2, 18, 'kyxxxxxxyk'],
        [2, 19, 'kykkxxkkyk'], [2, 20, 'kykkxxkkyk'], [2, 21, 'kykkxxkkyk'], [2, 22, '.kykxxkyk.'], [2, 23, '.kykkkkyk.'],
        [2, 24, '..kykkyk..'], [2, 25, '...kyyk...'], [2, 26, '....kk....'],
      ],
    },
    { g: 'sw', segs: [[26, 2, 'l'], ...col(25, 3, 17, 'lll'), [23, 18, 'YYYYYYY'], [24, 19, 'JJJJJ'], ...col(25, 20, 22, 'aaa'), [26, 23, 'Y']] },
    { g: 'gl', in: 'sw', flat: GLINT, segs: glint(26, 7) },
  ],
})

// ---- healer (tester) -------------------------------------------------------------------------
// White hood with a gold rim round a gentle face (closed, smiling eyes, rosy cheeks), golden
// fringe, a stole in the accent down the front over a white robe with a gold cord and hem. The
// right hand is held out palm up under a floating open tome in a soft green-gold glow; plus
// signs, a leaf and sparkles rise above it. Letters: w robe, v sleeve, y gold, H hair, f skin, j hand,
// A stole, k sandal, P page, L text, s spine, C cover.
const healer = (A: Ink): Figure => ({
  ink: {
    w: tone('#F5F2EB'), v: tone('#F5F2EB'), y: GOLD,
    H: tone('#D9A85A'), f: SKIN, j: HAND, e: EYE, m: MOUTH, c: BLUSH, A,
    k: tone('#8A5A34'),
    P: tone('#FBF5E2'), L: solid('#9AA3BE', 'P'), s: solid('#DCCFAE', 'P'),
    C: tone('#3F8F5E'),
  },
  base: [
    {
      g: 'bd',
      segs: sym(3, [
        'wwww', 'wwwwww', 'wwwwwww', 'wwwyyyyy', 'wwyHHHHH', 'wwyHfeff', 'wwyfefef', 'wwycffff', 'wwyfffmf', 'wwwyfffm', 'wwwwyyyy',
        'vvwAAwww', 'vvvwAAwww', 'vvvvwAAwww', 'vvvvwAAwww', 'vvvvvwAAwww', 'vvvvvyAAyyy', 'yyyyywAAwww', 'jj.wwAAwww', 'jj.wwAAwww',
        'wwwAAwww', 'wwwyywww', 'wwwwwwwww', 'wwwwwwwww', 'yyyyyyyyyy',
      ]),
    },
    // the right arm held out to the side, palm up
    { g: 'bd', segs: right(14, ['wwwAAwvv', 'wwwAAwvvvyjj', 'wwwAAwvvvyjj', 'wwwAAwvvvv', 'wwwAAwvvv', 'yyyAAy', 'wwwAAw', 'wwwAAww', 'wwwAAww']) },
    { g: 'la', segs: [[10, 28, 'kkkk'], [10, 29, 'kkkk']] },
    { g: 'lb', segs: [[18, 28, 'kkkk'], [18, 29, 'kkkk']] },
  ],
  layers: [
    { g: 'tm', segs: [[24, 9, 'PPP..PPP'], [24, 10, 'PLLssLLP'], [24, 11, 'PPPssPPP'], [24, 12, 'PLLssLLP'], [24, 13, 'CCCCCCCC']] },
    { g: 'gw', in: 'tm', flat: { g: 'rgba(176,236,120,.55)' }, segs: [[26, 8, 'gggg'], [27, 9, 'gg'], [25, 14, 'gggggg']] },
    { g: 's1', flat: { p: '#5FD46B', y: '#FFE27A' }, segs: [[27, 5, 'p'], [26, 6, 'ppp'], [27, 7, 'p'], [30, 7, 'y']] },
    { g: 's2', flat: { l: '#A7E36A', y: '#FFE27A' }, segs: [[30, 2, 'l'], [29, 3, 'l'], [25, 4, 'y']] },
    { g: 's3', flat: { p: 'rgba(95,212,107,.6)', y: 'rgba(255,226,122,.6)' }, segs: [[28, 0, 'p'], [27, 1, 'ppp'], [28, 2, 'p'], [31, 2, 'y']] },
  ],
})

// ---- archer (scout) --------------------------------------------------------------------------
// Pointed green hood with trim in the accent round a face peering from its shadow, and a short
// green mantle over the shoulders and upper chest only; a leather vest with a quiver strap and a
// belt, cream sleeves, dark trousers and boots. Fletched arrows peek from the quiver over the
// left shoulder. A longbow stands at the right side with a fire arrow nocked; its head burns in
// stepped orange, yellow and white-hot. Letters: g hood, A trim, i hood shadow, f skin, j hand,
// c sleeve, l leather, b belt, Y buckle, S strap, t trousers, k boot, q quiver, R/W fletching,
// B/D bow, s string, o shaft, 1/2/3 flame.
const ARCHER_LEG: Seg[] = [[11, 25, 'kkkk'], [11, 26, 'kkkk'], [11, 27, 'kkkk'], [10, 28, 'kkkkk'], [10, 29, 'kkkkk']]
const FIRE = { 1: '#FF8A1F', 2: '#FFD54A', 3: '#FFF3B0' }
const archer = (A: Ink): Figure => ({
  ink: {
    g: tone('#3F8C4F'), A, i: solid('#C28C70', 'f'), f: SKIN, j: HAND, e: EYE, m: MOUTH,
    c: tone('#E2D3B0'), l: tone('#9A6438'), b: tone('#5A3A20'), Y: BRASS, S: solid('#5A3A20', 'l'),
    t: tone('#5B5348'), k: BOOT, q: tone('#9A6438'),
    R: solid('#D0453F'), W: solid('#E2D3B0'), o: solid('#E2D3B0'), B: solid('#B07A40'), D: DARK,
    s: solid('#E2D3B0'), 1: solid(FIRE[1]), 2: solid(FIRE[2]), 3: solid(FIRE[3]),
  },
  base: [
    // the quiver first, behind the hood and mantle
    { g: 'bd', segs: [[5, 6, 'R.W'], [5, 7, 'RRWW'], [6, 8, 'o.o'], ...col(5, 9, 12, 'qqqq')] },
    {
      g: 'bd',
      segs: sym(2, [
        'g', 'gg', 'gggg', 'ggggg', 'gAAAAA', 'gAiiii', 'gAfeff', 'gAffff', 'gAffff', 'ggAAAA',
        'gggggggg', 'ggggggggg', 'ggggggggg', 'cccllllgg',
        'cccllllll', 'cccllllll', 'cccllllll', 'cccllllll', 'jj.bbbbbY', 'jj.llllll',
        'ttttt', 'ttttt', 'ttttt',
      ]),
    },
    { g: 'bd', segs: [[13, 16, 'S'], [14, 17, 'S'], [15, 18, 'S'], [16, 19, 'S'], [14, 10, 'mmmm'], [17, 9, 'm']] },
    { g: 'la', segs: ARCHER_LEG },
    { g: 'lb', segs: mirrorSegs(ARCHER_LEG) },
  ],
  layers: [
    {
      g: 'bw',
      segs: [
        [25, 4, 'D'], [25, 5, 'BD'], ...col(26, 6, 8, 'BD'), ...col(27, 9, 20, 'BD'), ...col(26, 21, 23, 'BD'), [25, 24, 'BD'], [25, 25, 'D'],
        ...col(25, 6, 23, 's'),
        [20, 13, 'RR'], [20, 15, 'RR'], [20, 14, 'ooooooooo'], [29, 13, '1'], [29, 14, '232'], [29, 15, '1'],
        [25, 15, 'jjj'], [25, 16, 'jjj'],
      ],
    },
    { g: 'fa', flat: FIRE, segs: [[30, 10, '1'], [30, 11, '2'], [29, 12, '121'], [30, 13, '2']] },
    { g: 'fb', flat: FIRE, segs: [[29, 10, '1.1'], [29, 11, '121'], [30, 12, '22'], [29, 13, '222']] },
    { g: 'fc', flat: { W: '#FFFFFF' }, segs: [[30, 14, 'W']] },
  ],
})

// ---- ninja (plain) ---------------------------------------------------------------------------
// A chibi shinobi in a crouched ready stance: a big charcoal-navy hood and face mask with a pale
// eye slit (white-and-dark eyes that twinkle), a forehead band in the accent (the only tinted
// piece) knotted at the right with a tail that flutters. The suit is three navy tones (base,
// shadow, and highlights on the shoulders and knees) so it keeps its form, with a grey wrapped
// obi, wrapped forearms, one bare fist at the hip and the other holding a steel kunai up on the
// right, and split-toe tabi. A katana rides the back: a gold-wrapped hilt over the left shoulder,
// the black sheath tip at the right hip, and its sling across the chest. Letters: n suit, d shadow,
// l highlight, a band, f skin, w eye white, p pupil, r wrap, R wrap line, j fist, g obi, G knot,
// S sling and guard, b tabi, k toe split, K blade, h handle, q/Q hilt, Z sheath, z tip.
const NINJA_LEG: Seg[] = [
  [9, 24, 'nnnnn'], [9, 25, 'nllnn'], [9, 26, 'rrrrr'], [9, 27, 'bbbbb'], [8, 28, 'bbbkbb'], [8, 29, 'bbbkbb'],
]
const ninja = (A: Ink): Figure => ({
  ink: {
    n: tone('#1B2030', '#0E1118', '#2F3B58', '#0B0C0F'), d: solid('#0E1118', 'n'), l: solid('#2F3B58', 'n'),
    a: solid(A.c), f: tone('#E8C9A0', undefined, undefined, '#0B0C0F'), w: solid('#FFFFFF', 'f'), p: solid('#0B0C0F', 'f'),
    r: tone('#2A2F3B', undefined, undefined, '#0B0C0F'), R: solid('#14171F', 'r'), j: solid('#E8C9A0'),
    g: tone('#3A3F4B', undefined, undefined, '#0B0C0F'), G: solid('#23262E', 'g'), S: solid('#3A3F4B', 'n'),
    b: tone('#151B2B', undefined, '#2A3550', '#0B0C0F'), k: solid('#0B0C0F', 'b'),
    K: tone('#C9D2DE', undefined, undefined, '#8A94A3'), h: solid('#3A3F4B'),
    q: solid('#D9A520'), Q: solid('#A87A1E'), Z: tone('#2A2F3B', undefined, undefined, '#0B0C0F'), z: solid('#8A94A3'),
  },
  base: [
    {
      g: 'bd',
      segs: sym(4, [
        'nnnnn', 'nnnnnnn', 'nnnnnnnn', 'nnnnnnnn', 'aaaaaaaa', 'aaaaaaaa', 'nnffffff', 'nnfwpfff', 'nnfwpfff', 'nnnnnnnn', 'nnnnnnnn', 'nnnnnn',
        'nllnnnn', 'nnnnnn', 'dnnnnn', 'dnnnnn', 'dnnnnn', 'gggggg', 'gggggg', 'nnnnng',
      ]),
    },
    // headband knot, kunai, sling, belt knot, arms, sheath and hilt
    {
      g: 'bd',
      segs: [
        [24, 8, 'aa'], [24, 9, 'aa'],
        [11, 17, 'SS'], [13, 18, 'SS'], [15, 19, 'SS'], [17, 20, 'SS'], [15, 21, 'GG'], [15, 22, 'GG'],
        [26, 13, 'K'], [25, 14, 'KKK'], [25, 15, 'KKK'], [26, 16, 'K'], [26, 17, 'h'], [26, 18, 'h'],
        [7, 17, 'nln'], [7, 18, 'nnn'], [7, 19, 'nnn'], [7, 20, 'rRr'], [7, 21, 'Rrr'], [7, 22, 'jjj'], [7, 23, 'jjj'],
        [22, 17, 'nln'], [22, 18, 'nnn'], [22, 19, 'rRr'], [22, 20, 'Rrr'], [25, 19, 'jjj'], [25, 20, 'jjj'],
        [22, 21, 'ZZ'], [22, 22, 'ZZZ'], [23, 23, 'ZZZ'], [24, 24, 'ZZZ'], [25, 25, 'Zz'],
        [5, 13, 'Qq'], [6, 14, 'qQ'], [7, 15, 'qq'], [7, 16, 'SS'],
      ],
    },
    { g: 'tl', segs: [[26, 8, 'aaa'], [26, 9, 'aaaa'], [27, 10, 'aaa']] },
    { g: 'la', segs: NINJA_LEG },
    { g: 'lb', segs: mirrorSegs(NINJA_LEG) },
  ],
  layers: [{ g: 'ey', flat: { W: '#FFFFFF' }, segs: [[12, 11, 'W'], [19, 11, 'W']] }],
})

const FIGURES: Record<Role, (accent: Ink) => Figure> = {
  conductor: magician,
  builder: thief,
  fixer: knight,
  tester: healer,
  scout: archer,
  plain: ninja,
}

// --- render -----------------------------------------------------------------------------------
type Cell = { ch: string; g: string }
type Px = { c: string; g: string } | null
type Span = [x: number, y: number, w: number]
const N4: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const rect = (x: number, y: number, w: number, c: string) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`

// Painter's encoding, one group at a time. Colours are laid down in turn; a colour's run spans
// from its first to its last pixel across any pixels of colours still to come (a face row runs
// straight under its eyes, the outline runs under the whole figure). The next colour is the one
// that saves the most runs that way. The panel redraws running rows every second, so fewer
// nodes matter, and equal runs stacked in a column become one block in `compact`.
const runs = (rows: Px[][]): Map<string, string[]> => {
  const out = new Map<string, string[]>()
  const groups = new Set<string>()
  for (const row of rows) for (const p of row) if (p) groups.add(p.g)
  for (const g of groups) {
    const at = (x: number, y: number): string | null => {
      const p = rows[y][x]
      return p && p.g === g ? p.c : null
    }
    const left = new Set<string>()
    rows.forEach((row, y) => row.forEach((_, x) => left.add(at(x, y) ?? '')))
    left.delete('')
    const spans = (c: string, open: Set<string>): Span[] => {
      const sp: Span[] = []
      rows.forEach((_, y) => {
        let s = -1
        let e = -1
        for (let x = 0; x <= ADV_W; x++) {
          const k = x < ADV_W ? at(x, y) : null
          if (k !== null && open.has(k)) {
            if (k === c) {
              if (s < 0) s = x
              e = x
            }
            continue
          }
          if (s >= 0) sp.push([s, y, e - s + 1])
          s = -1
        }
      })
      return sp
    }
    const blocks = (sp: Span[]) => sp.filter(([x, y, w]) => !sp.some(([a, b, v]) => a === x && v === w && b === y - 1)).length
    const list: string[] = []
    let owner = new Map<number, string>()
    while (left.size) {
      let best = ''
      let gain = -1
      for (const c of left) {
        const v = blocks(spans(c, new Set([c]))) - blocks(spans(c, left))
        if (v > gain) {
          gain = v
          best = c
        }
      }
      // `compact` starts a new set of paths when a rect lands on another fill drawn since the last
      // such break. Putting a colour's overlapping runs first keeps each colour in one path.
      const sp = spans(best, left)
      const hits = ([x, y, w]: Span) => {
        for (let i = x; i < x + w; i++) if ((owner.get(y * ADV_W + i) ?? best) !== best) return true
        return false
      }
      const first = sp.filter(hits)
      if (first.length) owner = new Map()
      for (const [x, y, w] of [...first, ...sp.filter(s => !first.includes(s))]) {
        list.push(rect(x, y, w, best))
        for (let i = x; i < x + w; i++) owner.set(y * ADV_W + i, best)
      }
      left.delete(best)
    }
    out.set(g, list)
  }
  return out
}

// Fills the parts in order, outlines every outlined pixel that touches empty space or the
// edge, then shades the rest: highlight where the colour region starts on the left, shadow
// where it ends on the right or below.
const paint = (ink: Record<string, Ink>, parts: Part[]): Map<string, string[]> => {
  const grid: (Cell | null)[][] = Array.from({ length: ADV_H }, () => Array<Cell | null>(ADV_W).fill(null))
  for (const { g, segs } of parts)
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        const cx = x + i
        if (ch === '.' || cx < 0 || cx >= ADV_W || y < 0 || y >= ADV_H) return
        if (ch === '_') grid[y][cx] = null
        else if (ink[ch]) grid[y][cx] = { ch, g }
      })
  const inkAt = (x: number, y: number): Ink | undefined => {
    if (x < 0 || y < 0 || x >= ADV_W || y >= ADV_H) return undefined
    const cell = grid[y][x]
    return cell ? ink[cell.ch] : undefined
  }
  const filled = (x: number, y: number) => inkAt(x, y)?.o !== undefined
  const edge = grid.map((row, y) =>
    row.map((cell, x) => {
      const i = cell ? ink[cell.ch] : undefined
      return !!i && i.o !== undefined && i.o !== i.c && N4.some(([dx, dy]) => !filled(x + dx, y + dy))
    }),
  )
  const mat = (x: number, y: number): string => {
    const cell = x < 0 || y < 0 || x >= ADV_W || y >= ADV_H ? null : grid[y][x]
    return cell ? (ink[cell.ch].m ?? cell.ch) : ''
  }
  const colour = (x: number, y: number, cell: Cell): string => {
    const i = ink[cell.ch]
    if (i.o === undefined || i.o === i.c) return i.c
    if (edge[y][x]) return i.o
    const m = mat(x, y)
    const off = (nx: number, ny: number) => mat(nx, ny) !== m || edge[ny]?.[nx] !== false
    if (i.h && off(x - 1, y)) return i.h
    if (i.s && (off(x + 1, y) || off(x, y + 1))) return i.s
    return i.c
  }
  return runs(grid.map((row, y) => row.map((cell, x) => (cell ? { c: colour(x, y, cell), g: cell.g } : null))))
}

const flatRects = (segs: Seg[], map: Record<string, string>): string[] => {
  const rows: Px[][] = Array.from({ length: ADV_H }, () => Array<Px>(ADV_W).fill(null))
  for (const [x, y, s] of segs)
    [...s].forEach((ch, i) => {
      const c = map[ch]
      if (c && x + i >= 0 && x + i < ADV_W && y >= 0 && y < ADV_H) rows[y][x + i] = { c, g: 'f' }
    })
  return runs(rows).get('f') ?? []
}

// Legs come first so a lifted foot slides behind the hem; the body group `bd` holds the body
// rects and every prop, so the bob carries them. Props nest by `in` (the glints ride their
// blade, the healer's glow rides the tome).
const svgFor = (fig: Figure): string => {
  const nodes = new Map<string, { rects: string[]; kids: string[] }>()
  const node = (g: string) => {
    let n = nodes.get(g)
    if (!n) {
      n = { rects: [], kids: [] }
      nodes.set(g, n)
    }
    return n
  }
  node('bd')
  for (const [g, rects] of paint(fig.ink, fig.base)) {
    node(g).rects.push(...rects)
    if (g !== 'bd' && g !== 'la' && g !== 'lb') node('bd').kids.push(g)
  }
  for (const layer of fig.layers) {
    const rects = layer.flat ? flatRects(layer.segs, layer.flat) : (paint(fig.ink, [{ g: layer.g, segs: layer.segs }]).get(layer.g) ?? [])
    node(layer.g).rects.push(...rects)
    node(layer.in ?? 'bd').kids.push(layer.g)
  }
  const render = (g: string): string => {
    const n = nodes.get(g)
    return n ? `<g class="${g}">${n.rects.join('')}${n.kids.map(render).join('')}</g>` : ''
  }
  const back = (fig.back ?? []).map(l => `<g class="${l.g}">${flatRects(l.segs, l.flat ?? {}).join('')}</g>`).join('')
  return `${back}${render('la')}${render('lb')}${render('bd')}`
}

// Pure CSS, run by the compositor: no redraws. Periods divide one second, so the once-a-second
// redraw of a running row restarts them in phase. Hidden-by-default poses: `ob` / `oh` (orb
// flare), `fb` (second flame), `s2` `s3` (sparkles), `db` (swung daggers) and `g2`..`g4` (glints).
const P = '.p-adventurers'
const R = `${P} .run`
const ADV_CSS = `<style>
${R} g{transform-box:fill-box}
${P} .ob,${P} .oh,${P} .fb,${P} .db,${P} .g2,${P} .g3,${P} .g4,${P} .s2,${P} .s3{opacity:0}
${R} .la{animation:adventurers-st .5s steps(1) infinite}
${R} .lb{animation:adventurers-st .5s steps(1) infinite -.25s}
${R} .bd{animation:adventurers-bob .5s steps(1) infinite -.125s}
${R}.c-conductor .ob,${R}.c-conductor .oh{animation:adventurers-on 1s steps(1) infinite}
${R} .hm,${R} .sa{animation:adventurers-sway .5s steps(1) infinite}
${R} .sb{animation:adventurers-sway .5s steps(1) infinite -.25s}
${R} .da{animation:adventurers-off 1s steps(1) infinite}
${R} .db{animation:adventurers-on 1s steps(1) infinite}
${R} .g1{animation:adventurers-q4 1s steps(1) infinite}
${R} .g2{animation:adventurers-q4 1s steps(1) infinite -.75s}
${R} .g3{animation:adventurers-q4 1s steps(1) infinite -.5s}
${R} .g4{animation:adventurers-q4 1s steps(1) infinite -.25s}
${R} .eg{animation:adventurers-glow 1s ease-in-out infinite}
${R} .w1{animation:adventurers-rise 1s steps(1) infinite}
${R}.c-fixer .sw{animation:adventurers-raise 1s steps(1) infinite}
${R} .gl{animation:adventurers-up 1s steps(1) infinite}
${R}.c-tester .tm{animation:adventurers-hover 1s steps(1) infinite}
${R}.c-tester .gw{animation:adventurers-glow 1s ease-in-out infinite}
${R} .s1{animation:adventurers-q3 1s steps(1) infinite}
${R} .s2{animation:adventurers-q3 1s steps(1) infinite -.667s}
${R} .s3{animation:adventurers-q3 1s steps(1) infinite -.333s}
${R} .fa{animation:adventurers-off .25s steps(1) infinite}
${R} .fb{animation:adventurers-on .25s steps(1) infinite}
${R} .fc,${R} .ey{animation:adventurers-flick .5s steps(1) infinite}
${R} .tl{animation:adventurers-flap .5s steps(1) infinite}
@keyframes adventurers-st{50%{transform:translateY(-1px)}}
@keyframes adventurers-bob{50%{transform:translateY(1px)}}
@keyframes adventurers-off{50%{opacity:0}}
@keyframes adventurers-on{50%{opacity:1}}
@keyframes adventurers-raise{50%{transform:translateY(-2px)}}
@keyframes adventurers-sway{50%{transform:translateX(1px)}}
@keyframes adventurers-q4{0%{opacity:1}25%,100%{opacity:0}}
@keyframes adventurers-rise{33%{transform:translateY(-1px);opacity:.7}67%{transform:translateY(-2px);opacity:.35}}
@keyframes adventurers-hover{50%{transform:translateY(-1px)}}
@keyframes adventurers-glow{50%{opacity:.35}}
@keyframes adventurers-up{0%{transform:translateY(8px)}25%{transform:translateY(4px)}50%{transform:none}75%{transform:translateY(-3px)}}
@keyframes adventurers-q3{0%{opacity:1}33.3%,100%{opacity:0}}
@keyframes adventurers-flap{50%{transform:translateY(1px)}}
@keyframes adventurers-flick{25%{opacity:.3}50%{opacity:1}75%{opacity:.6}}
@media (prefers-reduced-motion: reduce){${R},${R} g{animation:none!important}}
</style>`

// The rects are the same for every redraw of a row, so build them once per look (role + accent).
const cache = new Map<string, string>()

const inner = (role: Role, accent: string): string => {
  const key = `${role}|${accent}`
  let hit = cache.get(key)
  if (hit === undefined) {
    hit = svgFor(FIGURES[role](accentInk(accent)))
    cache.set(key, hit)
  }
  return hit
}

// `mirror` flips the figure inside its own box (x .. x + ADV_W * scale). The role picks the
// adventurer; the tier only reaches it through the accent colour. Unknown role -> ninja.
const draw = (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions): string => {
  const name: Role = Object.prototype.hasOwnProperty.call(FIGURES, who.role) ? who.role : 'plain'
  const scale = o.scale ?? 1
  const place = o.mirror ? `translate(${x + ADV_W * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  const cls = `c-${name}${o.isWalking ? ' run' : ''}`
  return `<g class="p-adventurers"><g class="${cls}" transform="${place}"${o.dim ? ' opacity="0.45"' : ''} shape-rendering="crispEdges">${inner(name, o.accent)}</g></g>`
}

export const adventurers: Pack = {
  id: 'adventurers',
  name: 'Adventurers',
  w: ADV_W,
  h: ADV_H,
  css: ADV_CSS,
  roles: ROLES,
  draw,
}
