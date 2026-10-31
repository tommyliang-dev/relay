// Pixel heritage turkeys in profile, 32x28 grid units, drawn as SVG rects. Sibling of
// cats.ts and dogs.ts: same canvas, same facing, same generated outline, same prop anchor.
//
// A turkey is a round body on two legs, a small bare blue head on a neck, a beak with a red
// snood draped over it and a wattle under the chin, and a fanned tail behind the body that
// rises above the back. Six heritage breeds differ by feather palette, tail bands and
// markings. The neck ribbon always carries the tier accent, in the same place.

import { type DrawOptions, type Pack, type Role, ROLES, type Tier } from './types'

export const TURKEY_W = 32
export const TURKEY_H = 28
const DY = 2 // the bird sits two rows down so tall hats fit above it

// --- plumage -------------------------------------------------------------------------------
// body: o outline, s shadow, b base, h highlight. tail: o outline, t base, T band, u tip, v
// feather separator. w: the light bar on the folded wing's primaries. L near leg, l far leg.
type Tones = { o: string; s: string; b: string; h: string }
type Tail = { o: string; t: string; T: string; u: string; v: string }
type Breed = { label: string; body: Tones; tail: Tail; w: string; L: string; l: string; marks?: Seg[] }

// Every breed shares the bare blue-grey head, red caruncles, horn beak and dark eye.
const SKIN: Tones = { o: '#56687F', s: '#8BA0BC', b: '#AEC0D6', h: '#CAD7E6' }
const RED = '#D23A2E'
const BEAK = '#E2B04F'
const BEAK_DARK = '#9C7430'
const EYE = '#1E1E24'
const PINK_LEGS: [string, string] = ['#C08476', '#8E5A50']
const DARK_LEGS: [string, string] = ['#8E6A5E', '#5E4640']

type Seg = [x: number, y: number, s: string]
const pic = (y0: number, rows: string[]): Seg[] => rows.map((s, i) => [0, y0 + i, s] as Seg)

// Standard bronze: coppery body with a dark band and buff tip on every tail feather,
// barred wings. The classic Thanksgiving bird.
const BRONZE: Breed = {
  label: 'Standard bronze',
  body: { o: '#2C1A0E', s: '#5A3519', b: '#7E4E26', h: '#A8713A' },
  tail: { o: '#2C1A0E', t: '#7A4B22', T: '#2A1A10', u: '#E8D8BC', v: '#5A3519' },
  w: '#E8D8BC',
  L: DARK_LEGS[0],
  l: DARK_LEGS[1],
}

// Narragansett: steel-grey and black body, tan tail with a black band and white tips.
const NARRAGANSETT: Breed = {
  label: 'Narragansett',
  body: { o: '#232328', s: '#45474E', b: '#676A72', h: '#8E9198' },
  tail: { o: '#232328', t: '#B89C70', T: '#232328', u: '#F1ECE2', v: '#8E7651' },
  w: '#F1ECE2',
  L: DARK_LEGS[0],
  l: DARK_LEGS[1],
}

// Bourbon red: deep chestnut body, white wings and a white tail with a red bar.
// The white tail takes a grey outline so it reads on light rows.
const BOURBON_RED: Breed = {
  label: 'Bourbon red',
  body: { o: '#4A190C', s: '#86301C', b: '#B04428', h: '#CF6B4A' },
  tail: { o: '#9A8E82', t: '#F4EFE6', T: '#B04428', u: '#FBF8F2', v: '#DDD6CA' },
  w: '#F4EFE6',
  L: PINK_LEGS[0],
  l: PINK_LEGS[1],
}

// White Holland: all white, pink legs. Grey outline, or it vanishes on light rows.
const WHITE_HOLLAND: Breed = {
  label: 'White Holland',
  body: { o: '#9A958D', s: '#DAD6CE', b: '#F3F1EC', h: '#FFFFFF' },
  tail: { o: '#9A958D', t: '#F3F1EC', T: '#D4CFC5', u: '#FFFFFF', v: '#DAD6CE' },
  w: '#DAD6CE',
  L: PINK_LEGS[0],
  l: PINK_LEGS[1],
}

// Royal palm: white with black barring: a black saddle on the back and a black band
// across the tail, black-edged wings.
const ROYAL_PALM: Breed = {
  label: 'Royal palm',
  body: { o: '#8E8A84', s: '#D6D3CD', b: '#F2F0EB', h: '#FFFFFF' },
  tail: { o: '#8E8A84', t: '#F2F0EB', T: '#24242A', u: '#FFFFFF', v: '#D6D3CD' },
  w: '#24242A',
  L: PINK_LEGS[0],
  l: PINK_LEGS[1],
  marks: [[12, 11, 'TTTTTTTT'], [11, 12, 'T.T.T.T.T.T']],
}

// Slate: blue-grey all over, a darker band and a pale edge on the tail.
const SLATE: Breed = {
  label: 'Slate',
  body: { o: '#333B47', s: '#5A6678', b: '#7D8A9E', h: '#A0ACBD' },
  tail: { o: '#333B47', t: '#7D8A9E', T: '#3E4858', u: '#CFD6DF', v: '#5A6678' },
  w: '#CFD6DF',
  L: PINK_LEGS[0],
  l: PINK_LEGS[1],
}

const BREED_TABLE: Record<string, Breed> = {
  bronze: BRONZE,
  narragansett: NARRAGANSETT,
  'bourbon-red': BOURBON_RED,
  'white-holland': WHITE_HOLLAND,
  'royal-palm': ROYAL_PALM,
  slate: SLATE,
}

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

// --- the bird --------------------------------------------------------------------------------
// Pictures in the bird's own coordinates (before DY). Letters: b s h body tones, O forced
// body outline, w wing bar, n head skin, E eye, r caruncle red, y Y beak, t T u v tail, L l
// legs. '.' is empty. Everything is filled first, then every filled pixel that touches
// empty space (or, for the body, the tail) becomes the outline tone of its own part.

// The fan: feathers radiate from the rump at about (10,16), over the back and down behind
// the legs. Outer ring becomes outline, then the pale tip, the dark band, the base, with
// separators between feathers.
const TAIL: Seg[] = pic(5, [
  '.......tttt',
  '.....ttuuuutt',
  '....tuuTTTTuut',
  '...tuTTTTTTTTut',
  '..tuTTtttvttTTut',
  '.tuTTtvttvtttTTut',
  '.tuTtttvtttttttTut',
  'tuTTvttvtttttt',
  'tuTttvtttt',
  'tuTtttvttt',
  'tuTttttttt',
  'tuTvvvvttt',
  'tuTTttvttt',
  '.tuTTvttvt',
  '..tuuTTvttt',
  '....ttuTTttt',
  '......tttttt',
])

// Head, neck and body. The head is bare skin with the eye at (25,4); the beak at x28-29;
// the wattle hangs from the throat; the neck feathers start at y8 where the ribbon sits.
const BODY: Seg[] = pic(2, [
  '......................nnnnn',
  '.....................nnnnnnn',
  '.....................nnnnEnnyy',
  '.....................nnnnnnnY',
  '.....................nnnnnrr',
  '.....................nnnnrr',
  '....................bbbbbr',
  '...................bbbbbb',
  '...........bhhhhhhhhbbbbb',
  '.........bbhhhhhhhhhhbbbbb',
  '........bbbbbbbbbbbbbbbbbb',
  '........bbbbbbbbbbbbbbbbbb',
  '........bbbbbbbbbbbbbbbbbb',
  '........bbbbbbbbbbbbbbbbbb',
  '........bbbbbbbbbbbbbbbbbb',
  '.........sbbbbbbbbbbbbbbb',
  '..........ssbbbbbbbbbbbbs',
  '...........sssbbbbbbbbbss',
  '.............sssssssss',
])

// The snood: rooted on the forehead, draped over the beak, hanging in front of its tip.
// Its own group so it can wobble.
const SNOOD: Seg[] = [[28, 3, 'rr'], [30, 4, 'r'], [30, 5, 'r']]

// Two legs under the body's centre; the near one steps half a cycle off the far one. Toes
// point forward.
const LEGS = {
  near: [[13, 21, 'LL'], [13, 22, 'LL'], [13, 23, 'LL'], [13, 24, 'LL'], [13, 25, 'LLLL']] as Seg[],
  far: [[18, 21, 'll'], [18, 22, 'll'], [18, 23, 'll'], [18, 24, 'll'], [18, 25, 'llll']] as Seg[],
}

// The folded wing lies on the flank, tip pointing back and down, with barred primaries.
const WING_FOLDED: Seg[] = [
  [14, 12, 'OOOOOO'],
  [12, 13, 'OOssssssO'],
  [10, 14, 'OOsssssssO'],
  [9, 15, 'OOsssssswO'],
  [9, 16, 'OssswwwO'],
  [10, 17, 'OwwO'],
]

// The lifted wing swings forward and down to a tip at x26-27, y17-19: the anchor for held
// props, so they line up across costumes.
const WING_LIFTED: Seg[] = [
  [14, 12, 'OOOOO'],
  [13, 13, 'OsssssO'],
  [13, 14, 'OssssssO'],
  [14, 15, 'OsssssssO'],
  [16, 16, 'OssssswwO'],
  [18, 17, 'OOsswwwwww'],
  [21, 18, 'OOswwww'],
  [24, 19, 'Owww'],
]

// The wing reaching down onto a keyboard on the ground.
const WING_DOWN: Seg[] = [
  [14, 12, 'OOOOO'],
  [13, 13, 'OsssssO'],
  [13, 14, 'OssssssO'],
  [14, 15, 'OsssssssO'],
  [16, 16, 'OsssssssO'],
  [18, 17, 'OOsssssw'],
  [20, 18, 'OOsssww'],
  [22, 19, 'OOsww'],
  [23, 20, 'Owww'],
  [24, 21, 'www'],
  [24, 22, 'www'],
  [25, 23, 'ww'],
]

// The ribbon ties around the feathered neck, a gold knot at the throat, its ends trailing
// down the back.
const COLLAR: Seg[] = [[20, 8, 'AAAAA'], [19, 9, 'AAAAAA'], [24, 9, 'g'], [19, 10, 'A'], [18, 11, 'A']]

// --- costumes ------------------------------------------------------------------------------
// Layer colours: costume map first, then the fixed props below. `ground` props rest on the
// floor, so they stay out of the walking bob.
type Layer = { segs: Seg[]; g?: string; map?: Record<string, string>; ground?: boolean }
type Costume = { hold?: boolean; wing?: Seg[]; layers: Layer[]; anim: string }

const PROP: Record<string, string> = {
  k: '#3D4752', // dark prop body
  K: '#5C6875', // its lighter face
  w: '#E4E8EC', // light edge
  W: '#F3F0E9', // paper, bone
  y: '#E3B23C', // brass
  o: '#A8743E', // wood
}
const INK = '#262A32' // spectacles, eye patch

const r = (ch: string, n: number) => ch.repeat(n)

// The tier colour ('A' in a map value) tints each costume's main piece, as well as the ribbon.
const COSTUMES: Record<string, Costume> = {
  // builder: headphones + laptop; the screen flickers
  builder: {
    hold: true,
    wing: WING_DOWN,
    layers: [
      {
        // band over the crown, down the back of the head to a round cup
        map: { K: 'A' },
        segs: [[22, 1, 'kkkkk'], [21, 2, 'k'], [27, 2, 'k'], [21, 3, 'kK'], [21, 4, 'kK'], [21, 5, 'kK']],
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
    anim: '.p-turkeys .t-builder.run .cur{animation:turkeys-blink 1s steps(1) infinite}',
  },
  // tester: spectacles + a recipe card on a clipboard; the boxes check in one by one
  tester: {
    hold: true,
    layers: [
      {
        // one lens around the eye with a glint, the temple arm back across the head
        map: { k: INK, G: '#EAF2FF' },
        segs: [[24, 3, 'kkkk'], [22, 4, 'kkk'], [26, 4, 'Gk'], [24, 5, 'kkkk']],
      },
      {
        g: 'it',
        // a narrow board gripped at its left edge; a steel clip, a red recipe header, then
        // three list lines, each with a box that a check fills in
        map: { m: '#9AA0A8', P: '#F6F1E4', l: '#A9A39A', x: '#D6D0C4', r: '#C0392B', o: 'A' },
        segs: [
          [28, 15, 'mmm'],
          [27, 16, 'ooooo'],
          [27, 17, 'orrro'], [27, 18, 'oxllo'], [27, 19, 'oPPPo'], [27, 20, 'oxllo'],
          [27, 21, 'oPPPo'], [27, 22, 'oxllo'], [27, 23, 'oPPPo'], [27, 24, 'ooooo'],
        ],
      },
      { g: 'c1', map: { v: '#2E8B57' }, segs: [[28, 18, 'v']] },
      { g: 'c2', map: { v: '#2E8B57' }, segs: [[28, 20, 'v']] },
      { g: 'c3', map: { v: '#2E8B57' }, segs: [[28, 22, 'v']] },
    ],
    // one pass a second: blank, then each box checks in turn
    anim: `.p-turkeys .t-tester.run .c1{animation:turkeys-t1 1s steps(1) infinite}
.p-turkeys .t-tester.run .c2{animation:turkeys-t2 1s steps(1) infinite}
.p-turkeys .t-tester.run .c3{animation:turkeys-t3 1s steps(1) infinite}`,
  },
  // fixer: flat cap + wrench; the wrench works up and down
  fixer: {
    hold: true,
    layers: [
      {
        // the brim juts past the brow above the beak
        map: { h: 'A', H: 'A', d: '#4E4539' },
        segs: [[22, 0, r('H', 6)], [21, 1, r('h', 8)], [21, 2, r('h', 7) + 'ddd']],
      },
      {
        // an open-ended wrench held upright in the wing tip, jaw up
        g: 'it',
        map: { s: '#8C96A3', S: '#5F6874' },
        segs: [[28, 16, 's..s'], [28, 17, 's..s'], [28, 18, 'ssss'], [29, 19, 'sS'], [29, 20, 'sS'], [29, 21, 'sS'], [29, 22, 'sS'], [29, 23, 'sS'], [29, 24, 'sS']],
      },
    ],
    anim: '.p-turkeys .t-fixer.run .it{animation:turkeys-st .5s steps(1) infinite}',
  },
  // conductor: pilgrim capotain + a drumstick for a baton; the drumstick beats between two poses
  conductor: {
    hold: true,
    layers: [
      {
        // tall tapered crown, a tier-coloured band with the buckle at the front, a wide brim
        segs: [[22, -2, 'kkkkk'], [22, -1, 'kKkkk'], [21, 0, 'kKkkkkk'], [21, 1, 'AAAAAyy'], [20, 2, r('k', 9)]],
      },
      // the drumstick beats between raised and level; the bone end stays in the wing tip
      { map: { W: '#E0CFA8' }, segs: [[28, 17, 'W'], [28, 18, 'W']] },
      { g: 'pa', map: { W: '#E0CFA8', d: '#B5732F', D: '#D99A55' }, segs: [[29, 16, 'W'], [30, 15, 'W'], [30, 12, 'dd'], [29, 13, 'dDd'], [29, 14, 'ddd']] },
      { g: 'pb', map: { W: '#E0CFA8', d: '#B5732F', D: '#D99A55' }, segs: [[29, 17, 'W'], [30, 16, 'dd'], [30, 17, 'DD'], [30, 18, 'dd']] },
    ],
    anim: '',
  },
  // scout: bandana + eye patch + spyglass
  scout: {
    hold: true,
    layers: [
      {
        // tied over the crown, the knot and its tails trailing behind the head
        map: { r: 'A', W: '#F6F2EA' },
        segs: [[21, 2, r('r', 7)], [21, 3, 'rrrWrrr'], [19, 3, 'rr'], [18, 4, 'rr']],
      },
      { map: { k: INK }, segs: [[22, 4, 'kkk'], [25, 4, 'kk'], [25, 5, 'kk']] },
      // a brass spyglass held level, the wide end out front; the lens glints
      { map: { B: '#BBD2F2' }, segs: [[30, 15, 'kk'], [29, 16, 'kyy'], [28, 17, 'yyyB'], [28, 18, 'oooB'], [29, 19, 'koo'], [30, 20, 'kk']] },
      { g: 'gl', map: { G: '#FFFFFF' }, segs: [[31, 17, 'G']] },
    ],
    anim: '.p-turkeys .t-scout.run .gl{animation:turkeys-blink 1s steps(1) infinite}',
  },
  // plain: no costume; the ribbon carries the colour
  plain: { layers: [], anim: '' },
}

export const COSTUME_NAMES: readonly string[] = Object.keys(COSTUMES)

// --- render -------------------------------------------------------------------------------
type Cell = { c: string; g: string; key: string; o: string }

// Small features drawn as they are, never turned into outline: caruncles, beak, eye, legs.
const KEEP = 'ryYEL'

// The flare: the same fan one pixel higher, drawn and outlined as its own pose.
const TAIL_FLARE: Seg[] = TAIL.map(([x, y, px]): Seg => [x, y - 1, px])

// `fan` picks the fan's pose; `fanOnly` returns just that pose's fan rects.
const svgFor = (name: string, breed: Breed, accent: string, fan: Seg[] = TAIL, fanOnly = false): string => {
  const costume = COSTUMES[name]
  const { body, tail } = breed
  const grid: (Cell | null)[][] = Array.from({ length: TURKEY_H }, () => Array(TURKEY_W).fill(null))
  const inside = (x: number, y: number) => x >= 0 && x < TURKEY_W && y >= 0 && y < TURKEY_H
  // colour and outline tone for a picture letter
  const look = (ch: string): [string, string] | undefined => {
    const c = ({
      b: body.b, s: body.s, h: body.h, O: body.o, w: breed.w,
      n: SKIN.b, E: EYE, r: RED, y: BEAK, Y: BEAK_DARK, L: breed.L, l: breed.l,
      t: tail.t, T: tail.T, u: tail.u, v: tail.v,
    } as Record<string, string>)[ch]
    if (!c) return
    return [c, 'tTuv'.includes(ch) ? tail.o : ch === 'n' ? SKIN.o : body.o]
  }
  const fill = (segs: Seg[], group: string, set?: Set<string>) => {
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        const hit = look(ch)
        if (!hit || !inside(x + i, y + DY)) return
        grid[y + DY][x + i] = { c: hit[0], g: group, key: ch, o: hit[1] }
        set?.add(`${x + i},${y + DY}`)
      })
  }
  fill(fan, 'tl')
  fill(BODY, 'bd')
  if (breed.marks) fill(breed.marks, 'bd')
  if (!costume.hold) fill(WING_FOLDED, 'bd')
  fill(SNOOD, 'sn')
  fill(LEGS.far, 'lb')
  fill(LEGS.near, 'la')

  // Outline: any filled pixel that touches empty space or the edge, and the body where it
  // passes in front of the tail. Small features keep their own colour.
  const outline = (
    only?: (x: number, y: number) => boolean,
    solid: (x: number, y: number, fx: number, fy: number) => boolean = (nx, ny, fx, fy) => {
      const n = grid[ny][nx]
      return !!n && !(n.g === 'tl' && grid[fy][fx]?.g !== 'tl')
    },
  ) => {
    const edges: [number, number][] = []
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (!cell || KEEP.includes(cell.key) || (only && !only(x, y))) return
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const nx = x + dx
          const ny = y + dy
          return !inside(nx, ny) || !solid(nx, ny, x, y)
        })
        if (open) edges.push([x, y])
      }),
    )
    for (const [x, y] of edges) grid[y][x] = { ...(grid[y][x] as Cell), c: (grid[y][x] as Cell).o }
  }
  outline()

  const put = (segs: Seg[], group: string, map: Record<string, string> = {}) => {
    for (const [x, y, s] of segs)
      [...s].forEach((ch, i) => {
        const gx = x + i
        const gy = y + DY
        if (ch === '.' || !inside(gx, gy)) return
        const m = map[ch] === 'A' ? accent : map[ch]
        const c = m ?? (ch === 'A' ? accent : ch === 'g' ? '#E3B23C' : PROP[ch])
        if (c) grid[gy][gx] = { c, g: group, key: ch, o: body.o }
      })
  }
  put(COLLAR, 'bd')
  for (const layer of costume.layers) put(layer.segs, layer.g ?? 'bd', layer.map)

  // The lifted wing goes on last. It passes in front of the breast and any held prop, so
  // it is outlined against everything but itself and the body it grows from.
  if (costume.hold) {
    const wing = new Set<string>()
    fill(costume.wing ?? WING_LIFTED, 'bd', wing)
    const joined = (x: number, y: number) => {
      const cell = grid[y][x]
      if (wing.has(`${x},${y}`)) return true
      return !!cell && cell.g === 'bd' && ('bshOw'.includes(cell.key) || cell.c === body.o)
    }
    outline((x, y) => wing.has(`${x},${y}`), joined)
  }

  // One rect per horizontal run of same-colour pixels in the same group: the panel
  // redraws running rows every second, so fewer nodes matter.
  const groups = new Map<string, string[]>()
  grid.forEach((row, y) => {
    let x = 0
    while (x < TURKEY_W) {
      const cell = row[x]
      if (!cell) {
        x++
        continue
      }
      let end = x + 1
      while (end < TURKEY_W && row[end]?.g === cell.g && row[end]?.c === cell.c) end++
      const list = groups.get(cell.g) ?? []
      list.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${cell.c}"/>`)
      groups.set(cell.g, list)
      x = end
    }
  })
  if (fanOnly) return groups.get('tl')?.join('') ?? ''
  const g = (k: string) => (groups.has(k) ? `<g class="${k}">${groups.get(k)?.join('')}</g>` : '')
  const flare = `<g class="tw">${svgFor(name, breed, accent, TAIL_FLARE, true)}</g>`
  const ground = new Set(costume.layers.filter(l => l.ground).map(l => l.g ?? 'bd'))
  const props = (onGround: boolean) =>
    [...groups.keys()].filter(k => !['bd', 'la', 'lb', 'tl'].includes(k) && ground.has(k) === onGround).map(g).join('')
  // The body rects sit directly in the bobbing group, so they bob once, with the snood
  // and the held props inside it; ground props and the legs stay on the floor.
  return `<g class="bd">${g('tl')}${flare}${groups.get('bd')?.join('') ?? ''}${props(false)}</g>${props(true)}${g('la')}${g('lb')}`
}

// Legs step and the body bobs like the cats. The fan rides the bob and swaps to its flared
// pose; the snood sways a pixel.
const TURKEY_CSS = `<style>
.p-turkeys .run g{transform-box:fill-box}
.p-turkeys .run .la{animation:turkeys-st .5s steps(1) infinite}
.p-turkeys .run .lb{animation:turkeys-st .5s steps(1) infinite -.25s}
.p-turkeys .run .bd{animation:turkeys-bob .5s steps(1) infinite -.125s}
.p-turkeys .pb,.p-turkeys .tw{opacity:0}
.p-turkeys .run .pa{animation:turkeys-off .5s steps(1) infinite}
.p-turkeys .run .pb{animation:turkeys-on .5s steps(1) infinite}
.p-turkeys .run .tl{animation:turkeys-off 1s steps(1) infinite}
.p-turkeys .run .tw{animation:turkeys-on 1s steps(1) infinite}
.p-turkeys .run .sn{animation:turkeys-wobble .5s steps(1) infinite}
@keyframes turkeys-st{50%{transform:translateY(-1px)}}
@keyframes turkeys-bob{50%{transform:translateY(1px)}}
@keyframes turkeys-off{50%{opacity:0}}
@keyframes turkeys-on{50%{opacity:1}}
@keyframes turkeys-t1{0%{opacity:0}25%{opacity:1}}
@keyframes turkeys-t2{0%{opacity:0}50%{opacity:1}}
@keyframes turkeys-t3{0%{opacity:0}75%{opacity:1}}
@keyframes turkeys-wobble{50%{transform:translateX(-1px)}}
@keyframes turkeys-blink{50%{opacity:.25}}
${Object.values(COSTUMES).map(c => c.anim).filter(Boolean).join('\n')}
@media (prefers-reduced-motion: reduce){.p-turkeys .run,.p-turkeys .run g{animation:none!important}}
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

// `mirror` flips the bird inside its own box (x .. x + TURKEY_W * scale) so it faces left.
// The turkeys dress by role; the tier only reaches them through the accent colour.
const draw = (x: number, y: number, who: { role: Role; tier: Tier }, o: DrawOptions): string => {
  const name = COSTUMES[who.role] ? who.role : 'plain'
  const breed = BREED_TABLE[o.variant] ? o.variant : BREEDS[0]
  const scale = o.scale ?? 1
  const place = o.mirror ? `translate(${x + TURKEY_W * scale},${y}) scale(${-scale},${scale})` : `translate(${x},${y}) scale(${scale})`
  return `<g class="p-turkeys"><g transform="${place}" opacity="${o.dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="turkey t-${name}${o.isWalking ? ' run' : ''}">${inner(name, breed, o.accent)}</g></g></g>`
}

export const turkeys: Pack = {
  id: 'turkeys',
  name: 'Thanksgiving turkeys',
  w: TURKEY_W,
  h: TURKEY_H,
  css: TURKEY_CSS,
  roles: ROLES,
  variants: BREEDS,
  variantOf: breedOf,
  draw,
}
