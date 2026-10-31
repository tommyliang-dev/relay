// Shrinks a sprite's markup. The pane refuses content over 100,000 characters and draws nothing,
// and a pack's runs of <rect>s are most of that. A run of sibling rects becomes one <path> per
// fill, with stacked equal-width runs joined into one taller block. Pure markup: nothing moves.
// Only whole-number rects are rewritten; any other rect is left as it is.

const RECT = /<rect x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"\/>/g
const RUN = /(?:<rect x="-?\d+" y="-?\d+" width="\d+" height="\d+" fill="[^"]+"\/>)+/g

type Block = { x: number; y: number; w: number; h: number; f: string }

// Paths for a stretch of rects that never overlap a different fill, so regrouping by fill leaves
// the picture alone.
const paths = (blocks: readonly Block[]): string => {
  const byFill = new Map<string, string>()
  for (const { x, y, w, h, f } of blocks) byFill.set(f, `${byFill.get(f) ?? ''}M${x} ${y}h${w}v${h}h-${w}`)
  return [...byFill].map(([f, d]) => `<path d="${d}" fill="${f}"/>`).join('')
}

// One run of rects as paths. A rect that lands on an earlier one of another fill (Clawd's eyes on
// its body) starts a new stretch, so paint order is kept.
const compactRun = (run: string): string => {
  let out = ''
  let owner = new Map<number, string>()
  let blocks: Block[] = []
  for (const m of run.matchAll(RECT)) {
    const b: Block = { x: +m[1], y: +m[2], w: +m[3], h: +m[4], f: m[5] }
    const covers = (j: number, i: number) => owner.get(j * 65536 + i)
    let clash = false
    for (let j = b.y; j < b.y + b.h && !clash; j++) {
      for (let i = b.x; i < b.x + b.w; i++) {
        const prior = covers(j, i)
        if (prior !== undefined && prior !== b.f) {
          clash = true
          break
        }
      }
    }
    if (clash) {
      out += paths(blocks)
      owner = new Map()
      blocks = []
    }
    for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) owner.set(j * 65536 + i, b.f)
    const below = blocks.findLast(o => o.f === b.f && o.x === b.x && o.w === b.w && o.y + o.h === b.y)
    if (below) below.h += b.h
    else blocks.push(b)
  }
  return out + paths(blocks)
}

const memo = new Map<string, string>()

export const compact = (svg: string): string => {
  let hit = memo.get(svg)
  if (hit === undefined) {
    hit = svg.replace(RUN, compactRun)
    memo.set(svg, hit)
  }
  return hit
}
