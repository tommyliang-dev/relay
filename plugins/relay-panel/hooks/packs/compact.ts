// Shrinks a sprite's markup. The pane draws nothing above 100,000 characters, and a pack's runs of
// <rect>s are most of that. Each run of sibling rects is rewritten as <path>s with the same picture.
//  - Painter order: rects paint in document order, so an opaque pixel shows the LAST opaque rect over
//    it. For a stretch of opaque rects we work out who finally owns each pixel: buried pixels are
//    never drawn and each colour becomes one path (the outline of its pixels). A colour may also
//    cover pixels that a colour drawn after it repaints anyway, when that simplifies its outline.
//  - Why other fills split runs: a translucent fill blends with what is under it, so it cannot be
//    reordered. It ends the opaque stretch; equal translucent rects share a path only if disjoint.
//  - Canonicalised: opaque hex fills (#rgb, #rrggbb) are lowercased and shortened; zero-size rects
//    are dropped, as they paint nothing.
//  - Left exactly as written: every other fill string (#rrggbbaa, rgba(), names), rects that are not
//    plain whole numbers, ones with huge coordinates or area, and all non-rect markup. Never throws.

const RECT = /<rect x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"\/>/g
const RUN = /(?:<rect x="-?\d+" y="-?\d+" width="\d+" height="\d+" fill="[^"]+"\/>)+/g
const OPAQUE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

type Rect = { x: number; y: number; w: number; h: number; f: string }
type Pt = readonly [number, number]
type Edge = { to: number; dir: number; used: boolean }

// Pixels and lattice points are keyed by one number; coordinates must stay inside +-LIM.
const LIM = 1 << 13
const SPAN = 1 << 14
const key = (x: number, y: number) => (y + LIM) * SPAN + x + LIM
const keyX = (k: number) => (k % SPAN) - LIM
const keyY = (k: number) => Math.floor(k / SPAN) - LIM

// Same colour, shortest spelling: #AABBCC is #abc. Only used for opaque hex fills.
const colour = (f: string): string => {
  const c = f.toLowerCase()
  return c.length === 7 && c[1] === c[2] && c[3] === c[4] && c[5] === c[6] ? `#${c[1]}${c[3]}${c[5]}` : c
}

const DX = [1, 0, -1, 0]
const DY = [0, 1, 0, -1]

// The outlines of a pixel set, as closed loops of corner points with the filled side on the right
// (outer edges clockwise, holes anticlockwise), so a nonzero fill paints exactly the set.
const outlines = (pixels: ReadonlySet<number>): Pt[][] => {
  const out = new Map<number, Edge[]>()
  const add = (x: number, y: number, dir: number) => {
    const from = key(x, y)
    const e = { to: key(x + DX[dir], y + DY[dir]), dir, used: false }
    const list = out.get(from)
    if (list) list.push(e)
    else out.set(from, [e])
  }
  for (const k of pixels) {
    const x = keyX(k)
    const y = keyY(k)
    if (!pixels.has(key(x, y - 1))) add(x, y, 0)
    if (!pixels.has(key(x + 1, y))) add(x + 1, y, 1)
    if (!pixels.has(key(x, y + 1))) add(x + 1, y + 1, 2)
    if (!pixels.has(key(x - 1, y))) add(x, y + 1, 3)
  }
  const loops: Pt[][] = []
  for (const [from, list] of out) {
    for (const first of list) {
      if (first.used) continue
      first.used = true
      const pts: Pt[] = [[keyX(from), keyY(from)]]
      let at = first.to
      let dir = first.dir
      while (at !== from || out.get(at)!.some(e => !e.used)) {
        // Where two pixels only touch at a corner, turn left so they stay in one loop.
        const next = [3, 0, 1].map(t => out.get(at)!.find(e => !e.used && e.dir === (dir + t) % 4)).find(Boolean)!
        next.used = true
        pts.push([keyX(at), keyY(at)])
        at = next.to
        dir = next.dir
      }
      // Keep only the corners.
      const n = pts.length
      const corners = pts.filter((p, i) => {
        const a = pts[(i + n - 1) % n]
        const b = pts[(i + 1) % n]
        return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0])
      })
      loops.push(corners)
    }
  }
  return loops
}

const pair = (a: number, b: number) => `${a}${b < 0 ? '' : ' '}${b}`

// One loop written from corner `r`, as the shortest of absolute and relative commands. The last
// side is left out: filling closes the loop. `from` is where the pen is, or null at the start.
const trace = (loop: readonly Pt[], r: number, from: Pt | null): { d: string; end: Pt } => {
  const n = loop.length
  const at = (i: number) => loop[(r + i) % n]
  const start = at(0)
  const abs = `M${pair(start[0], start[1])}`
  let d = abs
  if (from) {
    const rel = `m${pair(start[0] - from[0], start[1] - from[1])}`
    if (rel.length < abs.length) d = rel
  }
  for (let i = 1; i < n; i++) {
    const p = at(i)
    const q = at(i - 1)
    const horizontal = p[1] === q[1]
    const rel = `${horizontal ? 'h' : 'v'}${horizontal ? p[0] - q[0] : p[1] - q[1]}`
    const absolute = `${horizontal ? 'H' : 'V'}${horizontal ? p[0] : p[1]}`
    d += absolute.length < rel.length ? absolute : rel
  }
  return { d, end: at(n - 1) }
}

// All loops of one fill as a single path, cheapest start corner and order found greedily.
const pathData = (loops: Pt[][]): string => {
  let d = ''
  let pen: Pt | null = null
  const left = [...loops]
  while (left.length) {
    let best: { d: string; end: Pt } | null = null
    let bestAt = 0
    left.forEach((loop, i) => {
      for (let r = 0; r < loop.length; r++) {
        const t = trace(loop, r, pen)
        if (!best || t.d.length < best.d.length) {
          best = t
          bestAt = i
        }
      }
    })
    left.splice(bestAt, 1)
    d += best!.d
    pen = best!.end
  }
  return d
}

// Corners the outline of a pixel set has at the lattice point (x, y): where one or three of the
// four pixels around it are in, or two diagonal ones (two corners).
const cornersAt = (s: ReadonlySet<number>, x: number, y: number): number => {
  const a = s.has(key(x - 1, y - 1))
  const b = s.has(key(x, y - 1))
  const c = s.has(key(x - 1, y))
  const d = s.has(key(x, y))
  const n = +a + +b + +c + +d
  return n === 1 || n === 3 ? 1 : n === 2 && a === d ? 2 : 0
}

// Corners in the whole outline of a pixel set: a rough measure of how long its path will be.
const corners = (s: ReadonlySet<number>): number => {
  const spots = new Set<number>()
  for (const k of s) for (const o of [0, 1, SPAN, SPAN + 1]) spots.add(k + o)
  let n = 0
  for (const p of spots) n += cornersAt(s, keyX(p), keyY(p))
  return n
}

// What adding pixels to a set does to its corner count (negative is better).
const gain = (s: Set<number>, add: readonly number[]): number => {
  const spots = new Set<number>()
  for (const k of add) for (const o of [0, 1, SPAN, SPAN + 1]) spots.add(k + o)
  let before = 0
  for (const p of spots) before += cornersAt(s, keyX(p), keyY(p))
  const fresh = add.filter(k => !s.has(k))
  for (const k of fresh) s.add(k)
  let after = 0
  for (const p of spots) after += cornersAt(s, keyX(p), keyY(p))
  for (const k of fresh) s.delete(k)
  return after - before
}

// The pixels a colour must have plus any spare ones (pixels a later colour paints over anyway)
// that make its outline simpler: connected patches of spare pixels, straight stretches of them, or
// single ones, as long as they touch what is already there.
const grow = (own: ReadonlySet<number>, spare: ReadonlySet<number>): Set<number> => {
  const s = new Set(own)
  const free = (k: number) => spare.has(k) && !s.has(k)
  for (;;) {
    const open = [...spare].filter(k => !s.has(k))
    const touches = (k: number) => s.has(k + 1) || s.has(k - 1) || s.has(k + SPAN) || s.has(k - SPAN)
    const moves: number[][] = open.filter(touches).map(k => [k])
    const seen = new Set<number>()
    for (const k of open) {
      if (seen.has(k)) continue
      const patch = [k]
      seen.add(k)
      for (let i = 0; i < patch.length; i++) {
        for (const n of [patch[i] + 1, patch[i] - 1, patch[i] + SPAN, patch[i] - SPAN]) {
          if (free(n) && !seen.has(n)) {
            seen.add(n)
            patch.push(n)
          }
        }
      }
      if (patch.length > 1 && patch.some(touches)) moves.push(patch)
    }
    for (const k of open) {
      for (const step of [1, SPAN]) {
        if (free(k - step)) continue
        const run = [k]
        while (free(k + step * run.length)) run.push(k + step * run.length)
        if (run.length > 1 && run.some(touches)) moves.push(run)
      }
    }
    let best: number[] | null = null
    let bestGain = 0
    for (const m of moves) {
      const g = gain(s, m)
      if (g < bestGain) {
        bestGain = g
        best = m
      }
    }
    if (!best) return s
    for (const k of best) s.add(k)
  }
}

// The colours of a stretch drawn back to front. The biggest go first, so the small ones on top can
// leave holes unmade; neighbours that swap places are kept when that saves corners. The pixels a
// colour may borrow depend only on which colours come after it, so those are worked out once.
const layers = (byFill: ReadonlyMap<string, ReadonlySet<number>>): string => {
  const fills = [...byFill]
  const cache = new Map<number, Set<number>>()
  const stack = (order: readonly number[]) => {
    const later = new Set<number>()
    let mask = 0
    let cost = 0
    const drawn: Set<number>[] = []
    for (let n = order.length - 1; n >= 0; n--) {
      const i = order[n]
      const id = mask * 32 + i
      let s = fills.length < 24 ? cache.get(id) : undefined
      if (!s) {
        s = grow(fills[i][1], later)
        if (fills.length < 24) cache.set(id, s)
      }
      cost += corners(s)
      drawn[n] = s
      mask |= 1 << i
      for (const k of fills[i][1]) later.add(k)
    }
    return { cost, drawn }
  }
  let order = fills.map((_, i) => i).sort((p, q) => fills[q][1].size - fills[p][1].size)
  let best = stack(order)
  for (let again = fills.length > 1 && fills.length < 24; again; ) {
    again = false
    for (let n = 0; n + 1 < order.length; n++) {
      const swapped = order.slice()
      swapped[n] = order[n + 1]
      swapped[n + 1] = order[n]
      const t = stack(swapped)
      if (t.cost < best.cost) {
        order = swapped
        best = t
        again = true
      }
    }
  }
  return order.map((i, n) => element(best.drawn[n], fills[i][0])).join('')
}

// A pixel set as one <path> (nonzero fill, so the loops in outlines() paint exactly the set).
const element = (pixels: ReadonlySet<number>, fill: string) =>
  `<path d="${pathData(outlines(pixels))}" fill="${fill}"/>`

// Adds the pixels of a rect to a set.
const pixelsOf = (r: Rect, into: Set<number>) => {
  for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) into.add(key(i, j))
}

// One run of rects as paths, painted in the same order: a stretch of opaque rects is drawn as the
// pixels each colour finally owns (so nothing under a later rect is drawn at all, and every colour
// is one path); any other fill, which may show what is under it, is drawn on its own in turn.
// Zero-size rects are dropped. A run with out-of-range or huge rects is returned unchanged.
const compactRun = (run: string): string => {
  const rects: Rect[] = []
  for (const m of run.matchAll(RECT)) {
    const r = { x: +m[1], y: +m[2], w: +m[3], h: +m[4], f: m[5] }
    if (r.w === 0 || r.h === 0) continue
    if (Math.abs(r.x) + r.w >= LIM || Math.abs(r.y) + r.h >= LIM || r.w * r.h > 40000) return run
    rects.push(r)
  }
  let out = ''
  for (let i = 0; i < rects.length; ) {
    const solid = OPAQUE.test(rects[i].f)
    let j = i
    while (j < rects.length && (solid ? OPAQUE.test(rects[j].f) : rects[j].f === rects[i].f)) j++
    const seg = rects.slice(i, j)
    i = j
    if (solid) {
      const owner = new Map<number, string>()
      for (const r of seg) {
        const f = colour(r.f)
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) owner.set(key(x, y), f)
      }
      const byFill = new Map<string, Set<number>>()
      for (const [k, f] of owner) {
        const set = byFill.get(f)
        if (set) set.add(k)
        else byFill.set(f, new Set([k]))
      }
      out += layers(byFill)
    } else {
      // Equal translucent rects add up where they overlap, so only disjoint ones share a path.
      const all = new Set<number>()
      let area = 0
      for (const r of seg) {
        pixelsOf(r, all)
        area += r.w * r.h
      }
      if (all.size === area) out += element(all, seg[0].f)
      else
        for (const r of seg) {
          const one = new Set<number>()
          pixelsOf(r, one)
          out += element(one, r.f)
        }
    }
  }
  return out
}

// Sprites repeat across cards, and the work above is not cheap, so each markup is done once.
const memo = new Map<string, string>()

// Rewrites every run of plain rects in `svg`; the rest of the markup passes through untouched.
export const compact = (svg: string): string => {
  let hit = memo.get(svg)
  if (hit === undefined) {
    hit = svg.replace(RUN, compactRun)
    memo.set(svg, hit)
  }
  return hit
}
