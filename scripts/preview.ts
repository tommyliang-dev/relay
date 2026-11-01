// Renders the sprite pack galleries into docs/preview/ (gitignored): one page per pack, a
// gallery of every pack, and a crew at panel scale. Run: bun scripts/preview.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { PACKS, allPackCss } from '../plugins/relay-panel/hooks/packs/index'
import { ROLES, type Pack, type Role, type Tier } from '../plugins/relay-panel/hooks/packs/types'

const OUT = new URL('../docs/preview/', import.meta.url)
// The panel's tier colours (register.tsx TIER_COLOR).
const TIER_COLOR: Record<Tier, string> = { expert: '#7F77DD', heavy: '#D85A30', careful: '#BA7517', medium: '#378ADD', light: '#1D9E75', other: '#888780' }
// One tier per role, as the gallery card draws them.
const CREW: readonly { role: Role; tier: Tier }[] = [
  { role: 'conductor', tier: 'other' },
  { role: 'builder', tier: 'medium' },
  { role: 'fixer', tier: 'heavy' },
  { role: 'tester', tier: 'light' },
  { role: 'scout', tier: 'careful' },
  { role: 'plain', tier: 'other' },
]

const sprite = (p: Pack, who: { role: Role; tier: Tier }, seed: number, scale: number): string =>
  `<svg width="${p.w * scale}" height="${p.h * scale}" viewBox="0 0 ${p.w * scale} ${p.h * scale}">${p.draw(0, 0, who, { seed, accent: TIER_COLOR[who.tier], isWalking: true, scale, mirror: false, dim: false })}</svg>`
// A role has random looks when seeds 0..5 draw different art once the v-<look> class is removed.
const SEEDS = [0, 1, 2, 3, 4, 5]
const hasLooks = (p: Pack, who: { role: Role; tier: Tier }): boolean =>
  new Set(SEEDS.map(s => sprite(p, who, s, 1).replace(/\bv-[\w-]+/g, ''))).size > 1

const page = (title: string, body: string, css: string): string => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{margin:0;font:13px system-ui,sans-serif;color:#1f1f1f;background:#fff}h1{font-size:18px;margin:16px}h2{font-size:14px;margin:12px 16px 4px}p{margin:0 16px 8px;color:#6b6b68}
.band{padding:10px 16px;overflow-x:auto}.light{background:#fff}.dark{background:#1f1f1e;color:#ececec}
table{border-collapse:collapse}td,th{padding:4px 8px;text-align:center;font-weight:400;font-size:11px;white-space:nowrap}th.r{text-align:left}
.row{display:flex;gap:14px;align-items:flex-end}
</style>${css}</head><body>${body}</body></html>`

mkdirSync(OUT, { recursive: true })

// Per pack: every role at 3× (plus seeds 0..5 for roles with random looks) on a light and a dark row, then each role at 1×.
for (const p of PACKS) {
  const rows = ROLES.map(r => ({ label: r, who: CREW.find(c => c.role === r) ?? { role: r, tier: 'other' as Tier } }))
  const looks = rows.map(r => hasLooks(p, r.who))
  const table = (cls: string) =>
    `<div class="band ${cls}"><table><tr><th></th><th>role</th>${SEEDS.map(s => `<th>seed ${s}</th>`).join('')}</tr>${rows
      .map((r, i) => `<tr><th class="r">${r.label}</th><td>${sprite(p, r.who, 0, 3)}</td>${SEEDS.map(s => `<td>${looks[i] ? sprite(p, r.who, s, 3) : ''}</td>`).join('')}</tr>`)
      .join('')}</table></div>`
  const oneX = (cls: string) => `<div class="band ${cls}"><div class="row">${rows.map(r => sprite(p, r.who, 0, 1)).join('')}</div></div>`
  const note = `Role picks the character; ${looks.filter(Boolean).length} characters have random looks.`
  writeFileSync(new URL(`${p.id}.html`, OUT), page(p.name, `<h1>${p.name}</h1><p>${note}</p>${table('light')}${table('dark')}<h2>Panel scale</h2>${oneX('light')}${oneX('dark')}`, p.css))
}

// Gallery: one crew per pack at 2×, as /relay-pack preview draws it.
const card = (p: Pack, cls: string) =>
  `<div class="band ${cls}"><h2 style="margin:0 0 6px">${p.name} <span style="color:#9a9a96;font-weight:400">· ${p.id}</span></h2><div class="row">${CREW.map(w => sprite(p, w, 0, 2)).join('')}</div></div>`
writeFileSync(new URL('gallery.html', OUT), page('Sprite packs', `<h1>Sprite packs</h1><p>Every role, in tier colours.</p>${PACKS.map(p => card(p, 'light') + card(p, 'dark')).join('')}`, allPackCss()))

// Live: a crew of eight at panel scale (1×).
const crew8: readonly { role: Role; tier: Tier }[] = [...CREW, { role: 'builder', tier: 'expert' }, { role: 'tester', tier: 'careful' }]
const live = (p: Pack, cls: string) =>
  `<div class="band ${cls}"><div class="row">${crew8.map((w, i) => sprite(p, w, i, 1)).join('')}<span style="margin-left:8px">${p.name}</span></div></div>`
writeFileSync(new URL('live.html', OUT), page('Sprite packs, live', `<h1>Sprite packs, live</h1><p>A crew of eight at panel scale (1×).</p>${PACKS.map(p => live(p, 'light') + live(p, 'dark')).join('')}`, allPackCss()))
