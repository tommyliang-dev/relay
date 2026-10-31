import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { DEFAULT_PACK, PACKS, packById, packIds, resolvePack } from './packs'
import {
  OFF_SEASON,
  SEASONS,
  SHUFFLE,
  isHoliday,
  nextSeasonAt,
  pickShuffle,
  resolvePack as resolveShowing,
  seasonEndAt,
  seasonKey,
  shuffleCandidates,
} from './packs/seasons'
import type { MonthDay, Resolved, Season } from './packs/seasons'
import { TASK_ROLES } from './packs/types'
import type { Pack, Role, Tier } from './packs/types'
import type { AgentRun, Flow, Panel, Phase, PlannedTask } from '../types'

// The sprite pack showing now (packs/seasons.ts resolvePack). Every drawing reads it while it draws, so a write
// redraws the band and the panel at once.
const pack = atom({ plugin: 'relay-panel', key: 'pack' } as const, DEFAULT_PACK)
const flow = atom({ plugin: 'relay-panel', key: 'flow' } as const, null)
const agents = atom({ plugin: 'relay-panel', key: 'agents' } as const, [])
const panel = atom({ plugin: 'relay-panel', key: 'panel' } as const, {
  isCompact: false,
  isDoneCollapsed: false,
  autoOpenedFor: '',
})
const now = atom({ plugin: 'relay-panel', key: 'now' } as const, 0)

const TOOL = 'mcp__relay-panel__progress'
const STEP_TOOL = 'mcp__relay-panel__step'
const PACK_TOOL = 'mcp__relay-panel__pack'
// Added to the end of each relay worker's brief. Their system prompt words step
// reporting as a condition ("if the step tool appears among your tools") and they
// skip it even with the tool listed; the same request in the brief is followed.
const STEP_BRIEF = `

Progress reporting: before any other work, call \`${STEP_TOOL}\` with \`total\` (your plan in 3-8 steps) and \`done: 0\`; call it again with \`done\` and a few-word \`note\` as each step finishes. It only draws a progress bar.`
const PANE = 'relay-agents'
const PHASES: readonly Phase[] = ['plan', 'design', 'delegate', 'review', 'close']
const TIERS: readonly string[] = ['expert', 'heavy', 'careful', 'medium', 'light']
// The expert tier's former name: still accepted as input and as an agent type (`relay-fable`), read as `expert`.
const TIER_ALIAS: Readonly<Record<string, string>> = { fable: 'expert' }
// The tools' schemas are advice to the model, not a check: what a call may ask
// the band and the panel to draw is bounded here.
const MAX_TASKS = 200
const MAX_AFTER = 20
const MAX_TITLE = 120
const ACCENT = '#8f8cf4'
const DONE = '#5fbf8f'

type ProgressInput = {
  title?: string
  total?: number
  done?: number
  phase?: Phase
  finished?: boolean
  tasks?: { title?: string; tier?: string; role?: string; after?: number[] }[]
}

// ---------------------------------------------------------------------------
// Language: the `language` option, else Claude Code's `language` setting, else the
// process locale; English when nothing says Hebrew or Russian.

type Lang = 'en' | 'ru' | 'he'

// Month names for the gallery's holiday dates (sentence case; Russian days take the genitive).
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const RU_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const RU_OF = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

const STRINGS = {
  en: {
    pane: 'Agents',
    cost: 'Cost',
    tokens: 'Tokens',
    time: 'Time',
    collapse: 'Collapse',
    expand: 'Expand',
    running: 'Running',
    finished: 'Finished',
    planned: 'Planned',
    empty: 'No subagents yet.',
    round: 'round',
    failed: 'error',
    after: 'after',
    tokensWord: 'tokens',
    agentsCount: 'agents',
    isRunning: 'running',
    isFinished: 'finished',
    isPlanned: 'planned',
    opened: 'Agents panel opened.',
    closed: 'Agents panel closed.',
    done: 'Done',
    plan: 'Plan',
    design: 'Design',
    tasks: 'Tasks',
    review: 'Review',
    busy: 'running',
    ctx: 'ctx',
    packs: 'Sprite packs',
    showing: 'Showing',
    everyday: 'Everyday',
    holiday: 'Holiday',
    month: (m: number) => EN_MONTHS[m - 1],
    day: (m: number, d: number) => `${EN_SHORT[m - 1]} ${d}`,
    days: (m: number, a: number, b: number) => `${EN_SHORT[m - 1]} ${a}-${b}`,
    use: 'Use',
    variants: (n: number) => `${n} ${n === 1 ? 'variant' : 'variants'}`,
    tier: { light: 'light', medium: 'medium', careful: 'careful', heavy: 'heavy', expert: 'expert', other: 'other' },
    effort: { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
  },
  ru: {
    pane: 'Агенты',
    cost: 'Стоимость',
    tokens: 'Токены',
    time: 'Время',
    collapse: 'Свернуть',
    expand: 'Развернуть',
    running: 'Работают',
    finished: 'Завершены',
    planned: 'Запланированы',
    empty: 'Субагентов пока нет.',
    round: 'раунд',
    failed: 'ошибка',
    after: 'после',
    tokensWord: 'токенов',
    agentsCount: 'агентов',
    isRunning: 'работает',
    isFinished: 'завершён',
    isPlanned: 'запланирована',
    opened: 'Панель агентов открыта.',
    closed: 'Панель агентов закрыта.',
    done: 'Готово',
    plan: 'План',
    design: 'Дизайн',
    tasks: 'Задачи',
    review: 'Ревью',
    busy: 'в работе',
    ctx: 'ctx',
    packs: 'Наборы спрайтов',
    showing: 'Сейчас',
    everyday: 'Повседневный',
    holiday: 'Праздник',
    month: (m: number) => RU_MONTHS[m - 1],
    day: (m: number, d: number) => `${d} ${RU_OF[m - 1]}`,
    days: (m: number, a: number, b: number) => `${a}-${b} ${RU_OF[m - 1]}`,
    use: 'Выбрать',
    variants: (n: number) => `вариантов: ${n}`,
    tier: { light: 'light', medium: 'medium', careful: 'careful', heavy: 'heavy', expert: 'expert', other: 'other' },
    effort: { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
  },
  he: {
    pane: 'סוכנים',
    cost: 'עלות',
    tokens: 'טוקנים',
    time: 'זמן',
    collapse: 'כיווץ',
    expand: 'הרחבה',
    running: 'פועלים',
    finished: 'הסתיימו',
    planned: 'מתוכננים',
    empty: 'עדיין אין סוכנים.',
    round: 'סבב',
    failed: 'שגיאה',
    after: 'אחרי',
    tokensWord: 'טוקנים',
    agentsCount: 'סוכנים',
    isRunning: 'פועל',
    isFinished: 'הסתיים',
    isPlanned: 'מתוכנן',
    opened: 'חלונית הסוכנים נפתחה.',
    closed: 'חלונית הסוכנים נסגרה.',
    done: 'הושלם',
    plan: 'תכנון',
    design: 'עיצוב',
    tasks: 'משימות',
    review: 'בדיקה',
    busy: 'בעבודה',
    ctx: 'הקשר',
    packs: 'ערכות דמויות',
    showing: 'מוצגת',
    everyday: 'יומיומית',
    holiday: 'חג',
    month: (m: number) => HE_MONTHS[m - 1],
    day: (m: number, d: number) => `${d} ב${HE_MONTHS[m - 1]}`,
    days: (m: number, a: number, b: number) => `${a}-${b} ב${HE_MONTHS[m - 1]}`,
    use: 'בחירה',
    variants: (n: number) => `גרסאות: ${n}`,
    tier: { light: 'קל', medium: 'בינוני', careful: 'זהיר', heavy: 'כבד', expert: 'מומחה', other: 'אחר' },
    effort: { low: 'נמוך', medium: 'בינוני', high: 'גבוה', xhigh: 'גבוה מאוד', max: 'מקסימלי' },
  },
} as const

// Module scope is fine here: session.start sets it again on every (re)load.
let lang: Lang = 'en'
const tr = () => STRINGS[lang]

// Hebrew draws every row mirrored: cat and title on the right, numbers on the left.
const isRtl = () => lang === 'he'

// Tier and effort words as shown; anything unknown shows as it came.
const tierWord = (tier: string): string => (tr().tier as Record<string, string>)[tier] ?? tier
const effortWord = (effort: string): string => (tr().effort as Record<string, string>)[effort] ?? effort

const isRussian = (v: unknown): boolean => typeof v === 'string' && /^(ru|russian|рус)/i.test(v.trim())
const isHebrew = (v: unknown): boolean => typeof v === 'string' && /^(he|iw|hebrew|עברית)/i.test(v.trim())
const langOf = (v: unknown): Lang => (isHebrew(v) ? 'he' : isRussian(v) ? 'ru' : 'en')

async function detectLang($: EngineInterface, option: unknown): Promise<Lang> {
  if (option === 'en' || option === 'ru' || option === 'he') return option
  try {
    const settings = (await $.settings.read()) as Record<string, unknown>
    if (typeof settings.language === 'string' && settings.language.trim()) return langOf(settings.language)
  } catch {
    // No settings: fall through to the locale.
  }
  const locale = (await $.env.get('LC_ALL')) || (await $.env.get('LC_MESSAGES')) || (await $.env.get('LANG'))
  return langOf(locale)
}

const blank = (): Flow => ({
  title: 'relay',
  total: 0,
  done: 0,
  running: 0,
  phase: 'plan',
  isFinished: false,
  tasks: [],
})

const isNewFlow = (prev: Flow | null, input: ProgressInput): boolean =>
  !prev || prev.isFinished || (input.title !== undefined && clip(input.title.trim(), MAX_TITLE) !== prev.title)

// Only a known tier is kept: the name is later a key into the tier tables. `fable` reads as `expert`.
const tierName = (v: string): string => {
  const raw = v.replace(/^relay-/, '').trim().toLowerCase()
  const t = Object.hasOwn(TIER_ALIAS, raw) ? TIER_ALIAS[raw] : raw
  return TIERS.includes(t) ? t : ''
}

// Only a task role is kept; anything else is '' and draws as a builder.
const roleName = (v: string): string => {
  const r = v.trim().toLowerCase()
  return (TASK_ROLES as readonly string[]).includes(r) ? r : ''
}

const cleanTasks = (tasks: ProgressInput['tasks']): PlannedTask[] | undefined =>
  tasks
    ?.filter(t => t.title?.trim())
    .slice(0, MAX_TASKS)
    .map(t => ({
      title: (t.title ?? '').trim(),
      tier: tierName(t.tier ?? ''),
      role: roleName(t.role ?? ''),
      after: (t.after ?? []).filter(n => Number.isInteger(n) && n > 0).slice(0, MAX_AFTER),
    }))

const merge = (prev: Flow | null, input: ProgressInput): Flow => {
  // A new title means a new flow: never carry counters over from an earlier one.
  const base = isNewFlow(prev, input) || !prev ? blank() : { ...blank(), ...prev }
  const tasks = cleanTasks(input.tasks) ?? base.tasks
  const total = Math.min(MAX_TASKS, Math.max(0, Math.round(input.total ?? (input.tasks ? tasks.length : base.total))))
  const done = Math.min(total || Infinity, Math.max(0, Math.round(input.done ?? base.done)))
  const phase = input.phase && PHASES.includes(input.phase) ? input.phase : base.phase
  return {
    ...base,
    title: clip(input.title?.trim() || base.title, MAX_TITLE),
    total,
    done,
    phase: input.finished ? 'close' : phase,
    isFinished: input.finished === true,
    tasks,
  }
}

const label = (f: Flow): string => {
  const s = tr()
  if (f.isFinished) return s.done
  if (f.phase === 'plan') return s.plan
  if (f.phase === 'design') return s.design
  const count = f.total ? `${f.done}/${f.total}` : `${f.running} ${s.busy}`
  return `${f.phase === 'review' ? s.review : s.tasks} ${count}`
}

const ratio = (f: Flow): number => (f.isFinished ? 1 : f.total ? f.done / f.total : 0)

// Deterministic noise so the dither does not shimmer between redraws.
const noise = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// The whole row is one SVG: the desktop wraps sibling elements onto new lines,
// so title, bar, percent and the cat live in one drawing; only the count and
// the dismiss are Buttons beside it.
const H = 22
const BAR_H = 16
const CELL = 3

// The band's sprite: at most 3/4 size and no taller than the row less a pixel, standing
// on that line. Its slot is the sprite plus 2px (a 32x28 cat: 24x21 in a 26px slot).
const bandFit = (p: Pack) => {
  const scale = Math.min(0.75, (H - 1) / p.h)
  const w = p.w * scale
  return { scale, w, y: H - 1 - p.h * scale, slot: Math.ceil(w) + 2 }
}

// A panel sprite: full size up to a 36x32 box, scaled down past it.
const PANEL_MAX_W = 36
const PANEL_MAX_H = 32
const panelFit = (p: Pack) => {
  const scale = Math.min(1, PANEL_MAX_W / p.w, PANEL_MAX_H / p.h)
  const w = p.w * scale
  const h = p.h * scale
  // Text starts 10px past the sprite; compact icons sit 4px apart.
  return { scale, w, h, textX: Math.ceil(w) + 10, pitch: Math.ceil(w) + 4 }
}
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

const clip = (s: string, max: number): string => (s.length > max ? s.slice(0, Math.max(1, max - 1)) + '…' : s)

// CJK, fullwidth forms and emoji advance about 1em; at 0.56em a Chinese title was sized at half its width and the bar drew over it.
// 中日韩文字、全角标点和 emoji 约占 1em；按 0.56em 算时中文标题宽度被低估近一半，进度条会压到标题上。
const WIDE =
  /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA960-\uA97F\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF01-\uFF60\uFFE0-\uFFE6\u{1F300}-\u{1FAFF}\u{20000}-\u{3FFFD}]/u

// Rough advance of system UI text, in em; good enough to size the title's slot.
const charEm = (ch: string): number =>
  WIDE.test(ch) ? 1 : /[\s.,:;'|!il1()[\]]/.test(ch) ? 0.3 : /[A-ZА-ЯЁmwшщжюМШЩЖЮ@%]/.test(ch) ? 0.72 : 0.56

const textWidth = (s: string, size: number): number => [...s].reduce((w, ch) => w + charEm(ch) * size, 0)

// Cuts `s` to fit `maxW` pixels, with an ellipsis when it had to cut.
const fitText = (s: string, size: number, maxW: number): string => {
  if (textWidth(s, size) <= maxW) return s
  let out = ''
  for (const ch of s) {
    if (textWidth(out + ch + '…', size) > maxW) break
    out += ch
  }
  return out + '…'
}

const rowSvg = (f: Flow, W: number, isWorking: boolean, p: Pack): string => {
  const fit = bandFit(p)
  const CAT_SLOT = fit.slot
  // The title takes what it needs, up to 40% of the row; the bar takes the rest.
  const title = fitText(f.title, 13, Math.max(60, W * 0.4))
  const BAR_X = Math.round(16 + textWidth(title, 13) + 12)
  const BAR_W = Math.max(60, W - BAR_X - 46 - CAT_SLOT)
  const color = f.isFinished ? DONE : ACCENT
  const y0 = (H - BAR_H) / 2
  const fillW = Math.round(BAR_W * ratio(f))
  const runW = f.total ? Math.round((BAR_W * Math.min(f.total, f.done + f.running)) / f.total) : 0
  const dots: string[] = []
  // Positions are worked out left to right; right to left mirrors each box
  // inside the bar (`bx`) and across the row (`rx`). Text is never mirrored.
  const rtl = isRtl()
  const bx = (x: number, w: number): number => (rtl ? BAR_W - x - w : x)
  const rx = (x: number, w: number): number => (rtl ? W - x - w : x)

  // Dithered fill: sparse at the start, dense toward the head.
  const cols = Math.floor(fillW / CELL)
  const rows = Math.floor(BAR_H / CELL)
  for (let c = 0; c < cols; c++) {
    const density = 0.35 + 0.6 * Math.pow(c / Math.max(1, cols), 1.2)
    for (let r = 0; r < rows; r++) {
      if (noise(c, r) < density) dots.push(`<rect class="t${Math.floor(noise(r, c) * 4)}" x="${bx(c * CELL + 1, 2)}" y="${r * CELL + 1}" width="2" height="2"/>`)
    }
  }
  // Handed to workers, not yet accepted: a faint second layer.
  const faint: string[] = []
  for (let c = cols; c < Math.floor(runW / CELL); c++) {
    for (let r = 0; r < rows; r++) {
      if (noise(c + 7, r + 3) < 0.2) faint.push(`<rect class="t${Math.floor(noise(r + 5, c) * 4)}" x="${bx(c * CELL + 1, 1.7)}" y="${r * CELL + 1}" width="1.7" height="1.7"/>`)
    }
  }

  const ticks: string[] = []
  for (let i = 1; i < f.total; i++) {
    const x = Math.round((BAR_W * i) / f.total)
    if (x > fillW + 4) ticks.push(`<rect x="${bx(x, 1.5)}" y="${BAR_H / 2 - 4}" width="1.5" height="8" rx="0.75"/>`)
  }

  const text = label(f)
  const pillW = Math.round(18 + text.length * 6.6)
  const pillX = bx(Math.max(0, Math.min(BAR_W - pillW, fillW - pillW)), pillW)
  const percent = `${Math.round(ratio(f) * 100)}%`
  // `direction="rtl"` puts Hebrew words and numbers in reading order; `start` is then the right edge.
  const titleAt = rtl ? `x="${W - 16}" direction="rtl" text-anchor="start"` : 'x="16"'
  const percentAt = rtl ? `x="${CAT_SLOT + 6}" y="${H / 2 + 4.5}"` : `x="${W - CAT_SLOT - 6}" y="${H / 2 + 4.5}" text-anchor="end"`
  // The band's sprite is the conductor, in the pack's first pick ('' gives the cats' blue coat).
  const sprite = p.draw(rx(W - CAT_SLOT + 1, fit.w), fit.y, { role: 'conductor', tier: 'other' }, {
    variant: p.variantOf(''),
    accent: '#7F77DD',
    isWalking: isWorking,
    scale: fit.scale,
    mirror: rtl,
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
.t{fill:#1f1f1f}.m{fill:#8a8a8a}.k{fill:#e4e4e2}.tk{fill:#b4b4b0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.m{fill:#9a9a9a}.k{fill:#2c2c2c}.tk{fill:#5a5a5a}}
/* Pixels twinkle in four out-of-phase groups; a finished bar settles to a slow glow. */
.t0,.t1,.t2,.t3{animation:tw ${f.isFinished ? 3.2 : 2.2}s ease-in-out infinite}
.t1{animation-duration:${f.isFinished ? 3.8 : 2.8}s;animation-delay:-.7s}.t2{animation-duration:${f.isFinished ? 4.4 : 1.9}s;animation-delay:-1.3s}.t3{animation-duration:${f.isFinished ? 3.5 : 3.3}s;animation-delay:-.4s}
@keyframes tw{0%,100%{opacity:1}50%{opacity:${f.isFinished ? 0.8 : 0.3}}}
@media (prefers-reduced-motion: reduce){.t0,.t1,.t2,.t3{animation:none}}
</style>
<defs><clipPath id="c"><rect x="0" y="0" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/></clipPath></defs>
<circle cx="${rtl ? W - 5 : 5}" cy="${H / 2}" r="4" fill="${color}"/>
<text class="t" ${titleAt} y="${H / 2 + 4.5}" font-family="${FONT}" font-size="13" font-weight="500">${xml(title)}</text>
<g transform="translate(${rx(BAR_X, BAR_W)},${y0})">
<rect class="k" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/>
<g clip-path="url(#c)">
<g fill="${color}">${dots.join('')}</g>
<g fill="${color}" opacity="0.45">${faint.join('')}</g>
<g class="tk">${ticks.join('')}</g>
</g>
<rect x="${pillX}" width="${pillW}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${color}"/>
<text x="${pillX + pillW / 2}" y="${BAR_H / 2 + 4}" text-anchor="middle"${rtl ? ' direction="rtl"' : ''} font-family="${FONT}" font-size="11" font-weight="600" fill="#ffffff">${xml(text)}</text>
</g>
<text class="m" ${percentAt} font-family="${FONT}" font-size="12.5" font-variant-numeric="tabular-nums">${percent}</text>
${p.css}${sprite}
</svg>`
}

const barText = (f: Flow, width: number): string => {
  const filled = Math.round(width * ratio(f))
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
}

// ---------------------------------------------------------------------------
// Agents panel: every subagent of the session, plus the tasks the flow planned.

const TIER_COLOR: Record<string, string> = {
  expert: '#7F77DD',
  heavy: '#D85A30',
  careful: '#BA7517',
  medium: '#378ADD',
  light: '#1D9E75',
  other: '#888780',
}

// What each relay tier runs on, for planned tasks that have no run yet.
const colorOf = (tier: string): string => TIER_COLOR[tier] ?? '#888780'

const TIER_MODEL: Record<string, [model: string, effort: string]> = {
  expert: ['Opus', 'xhigh'],
  heavy: ['Opus', 'xhigh'],
  careful: ['Opus', 'high'],
  medium: ['Opus', 'medium'],
  light: ['Opus', 'low'],
}

// "Opus · xhigh", with the effort word in the panel's language; '' for an unknown tier.
const tierModel = (tier: string): string => {
  const m = TIER_MODEL[tier]
  return m ? `${m[0]} · ${effortWord(m[1])}` : ''
}

// "Opus 5.5 · low" for a run, or just the model when no effort was seen.
const runModel = (a: AgentRun): string => (a.effort ? `${modelName(a.model)} · ${effortWord(a.effort)}` : modelName(a.model))

// USD per million tokens: input, output, cache read, cache write. The first row that
// matches a model id wins, so a release sits above its family.
// The engine reports tokens, not money, so the panel's cost is an estimate. It reports
// one cache-write count with no split by lifetime; writes are priced at the 1-hour
// rate (2x input), which is what Claude Code writes on a subscription.
type Price = [input: number, output: number, cacheRead: number, cacheWrite: number]

const PRICES: [RegExp, Price][] = [
  [/(fable|mythos)-5-1/, [10, 50, 0.25, 20]],
  [/fable|mythos/, [10, 50, 1, 20]],
  [/opus-5-5/, [4, 20, 0.2, 8]],
  [/opus/, [5, 25, 0.5, 10]],
  [/sonnet-5-5/, [2, 10, 0.1, 4]],
  [/sonnet-5/, [2, 10, 0.2, 4]],
  [/sonnet/, [3, 15, 0.3, 6]],
  [/haiku-5-5/, [0.1, 0.5, 0.01, 0.2]],
  [/haiku/, [1, 5, 0.1, 2]],
]

// Haiku 5.5 is priced by prompt length: a request whose prompt (input, cache reads and
// cache writes together) is over 100,000 tokens pays these prices instead.
const HAIKU_LONG_PROMPT = 100_000
const HAIKU_LONG: Price = [0.5, 2.5, 0.05, 1]

type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

const priceOf = (model: string, prompt: number): Price => {
  const id = model.toLowerCase()
  if (prompt > HAIKU_LONG_PROMPT && /haiku-5-5/.test(id)) return HAIKU_LONG
  return PRICES.find(([re]) => re.test(id))?.[1] ?? [4, 20, 0.2, 8]
}

// `isRequest` says the usage is one model request, which is what a prompt-length price
// is set by; a turn's sum is priced at the model's ordinary prices.
const costOf = (model: string, u: Usage, isRequest: boolean): number => {
  const prompt = isRequest ? (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) : 0
  const [i, o, r, w] = priceOf(model, prompt)
  return (
    ((u.input_tokens || 0) * i +
      (u.output_tokens || 0) * o +
      (u.cache_read_input_tokens || 0) * r +
      (u.cache_creation_input_tokens || 0) * w) /
    1e6
  )
}

// Haiku 4.5 and the Claude 3 models have a 200K window; the rest, Haiku 5.5 included, 1M.
const windowOf = (model: string): number => (/haiku-4|claude-3/i.test(model) ? 200_000 : 1_000_000)

// `relay-careful`, or `relay:relay-careful` when the agents ship in a plugin. Only
// relay workers are tiered: the stock workers' runs belong to the stock panel and show as other.
const isWorker = (type: string): boolean => type.replace(/^[^:]*:/, '').startsWith('relay-')

// `relay-fable` (older installs) is the expert tier under its former name.
const tierOf = (type: string): Tier => {
  const bare = type.replace(/^[^:]*:/, '')
  const raw = bare.replace(/^relay-/, '').toLowerCase()
  const t = Object.hasOwn(TIER_ALIAS, raw) ? TIER_ALIAS[raw] : raw
  return Object.hasOwn(TIER_COLOR, t) && bare.startsWith('relay-') ? (t as Tier) : 'other'
}

const modelName = (id: string): string => {
  const m = /(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(id)
  const [, family = '', major = '', minor] = m ?? []
  if (!family) return id.replace(/^claude-/, '').replace(/\[.*\]$/, '') || '—'
  return `${family.charAt(0).toUpperCase()}${family.slice(1).toLowerCase()} ${major}${minor ? '.' + minor : ''}`
}

const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

const fmtTokens = (n: number): string =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`

const fmtCost = (usd: number): string => `$${usd < 10 ? usd.toFixed(2) : usd.toFixed(1)}`

const fmtTime = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

const elapsed = (a: AgentRun, at: number): number => (a.endedAt ?? Math.max(at, a.startedAt)) - a.startedAt

type Planned = PlannedTask & { n: number }

const plannedOf = (f: Flow | null, list: AgentRun[]): Planned[] => {
  if (!f || f.isFinished) return []
  const started = new Set(list.map(a => norm(a.description)))
  return (f.tasks ?? []).map((t, i) => ({ ...t, n: i + 1 })).filter(t => !started.has(norm(t.title)))
}

const totals = (list: AgentRun[], at: number) => {
  const cost = list.reduce((s, a) => s + a.costUsd, 0)
  const tokens = list.reduce((s, a) => s + a.tokens, 0)
  const start = Math.min(...list.map(a => a.startedAt))
  const end = Math.max(...list.map(a => a.endedAt ?? Math.max(at, a.startedAt)))
  return { cost, tokens, time: list.length ? end - start : 0 }
}

// --- desktop drawings: each row is one SVG, as the band above the prompt is.

// The pane's backdrop: a dotted grid as tall as the content laid over it; the
// row SVGs are transparent, so it shows through between their marks.
const GRID_STEP = 16
// A Text or Button row on the desktop is about 20px; the grid errs taller.
const LINE_H = 24
// The engine refuses an Svg taller than 4096px, so a long grid is stacked from
// tiles of at most this height; a multiple of GRID_STEP keeps the dots aligned.
const GRID_TILE = 4096
const gridTiles = (H: number) => Array.from({ length: Math.ceil(H / GRID_TILE) }, (_, i) => Math.min(GRID_TILE, H - i * GRID_TILE))
const gridSvg = (W: number, H: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>.d{fill:#d9d8d4}@media (prefers-color-scheme: dark){.d{fill:#3a3a38}}</style>
<defs><pattern id="g" width="${GRID_STEP}" height="${GRID_STEP}" patternUnits="userSpaceOnUse"><circle class="d" cx="${GRID_STEP / 2}" cy="${GRID_STEP / 2}" r="1"/></pattern></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
</svg>`

const PANE_CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.m{fill:#9a9a96}.k{fill:#ecebe8}.ln{stroke:#e4e4e1}.tile{fill:#f4f3f0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.m{fill:#7d7d79}.k{fill:#2c2c2b}.ln{stroke:#333331}.tile{fill:#262625}}
.live{animation:p 1.6s ease-in-out infinite}@keyframes p{50%{opacity:.3}}
@media (prefers-reduced-motion: reduce){.live{animation:none}}
</style>`

// Brand clay, used by the terminal text.
const CLAY = '#D97757'

// Roles: the orchestrator sets each planned task's role; a task without one is a builder.
// A relay worker takes the role of the task whose title matches its description.
const taskRole = (t?: PlannedTask): Role => (t?.role as Role) || 'builder'

const roleOfTask = (f: Flow | null, title: string): Role => taskRole(f?.tasks?.find(p => norm(p.title) === norm(title)))

// Anything that is not a relay worker is plain; Explore is a scout.
const costumeOf = (f: Flow | null, type: string, text = ''): Role => {
  if (type === 'Explore') return 'scout'
  if (tierOf(type) === 'other') return 'plain'
  return roleOfTask(f, text)
}

const statusMark = (x: number, y: number, status: string, color: string): string => {
  if (status === 'running') return `<circle class="live" cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`
  if (status === 'done') return `<path d="M${x - 5} ${y}l3.5 3.5 6.5-7" fill="none" stroke="#3B9C5F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  if (status === 'failed') return `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="#D0453F" stroke-width="1.8" stroke-linecap="round"/>`
  return `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#9a9a96" stroke-width="1.4"/><path d="M${x} ${y - 2.5}v2.8l1.8 1.2" fill="none" stroke="#9a9a96" stroke-width="1.4" stroke-linecap="round"/>`
}

// Panel rows are laid out left to right; in Hebrew each box mirrors across the
// row (`mx`) and text hugs the mirrored side. `words` text may hold Hebrew and
// takes `direction="rtl"` (whose `start` is the right edge); numbers stay
// left to right so "≈$0.25" keeps its order.
const mx = (W: number, x: number, w = 0): number => (isRtl() ? W - x - w : x)

// Text that starts at x: left-aligned, or right-aligned at the mirrored x.
const startText = (W: number, x: number, y: number, words = true): string =>
  !isRtl()
    ? `x="${x}" y="${y}"`
    : `x="${W - x}" y="${y}"${words ? ' direction="rtl" text-anchor="start"' : ' text-anchor="end"'}`

// Text that ends at x: right-aligned, or left-aligned at the mirrored x.
const endText = (W: number, x: number, y: number, words = false): string =>
  !isRtl() ? `x="${x}" y="${y}" text-anchor="end"` : `x="${W - x}" y="${y}"${words ? ' direction="rtl" text-anchor="end"' : ''}`

// A panel sprite at x in a row of width W: on the mirrored side and facing left in Hebrew.
// `variantKey` picks the variant, so the same task keeps the same look across redraws.
// `cy` is the line the sprite is centred on.
const rowCat = (
  p: Pack,
  W: number,
  x: number,
  cy: number,
  who: { role: Role; tier: Tier },
  variantKey: string,
  dim = false,
  isWalking = false,
  accent = colorOf(who.tier),
): string => {
  const fit = panelFit(p)
  return p.draw(mx(W, x, fit.w), Math.max(0, cy - fit.h / 2), who, {
    variant: p.variantOf(variantKey),
    accent,
    dim,
    isWalking,
    scale: fit.scale,
    mirror: isRtl(),
  })
}

// The compact strip's height: room for a sprite up to 32px tall.
const COMPACT_H = 32

const svg = (p: Pack, W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${PANE_CSS}${p.css}${body}</svg>`

// The pane's own title already says "Agents": the header names the flow, if any.
const headerSvg = (pk: Pack, W: number, title: string, t: ReturnType<typeof totals>): string => {
  const s = tr()
  const gap = 6
  const tw = (W - gap * 2) / 3
  const top = title ? 28 : 0
  const tile = (i: number, k: string, v: string) =>
    `<rect class="tile" x="${mx(W, i * (tw + gap), tw)}" y="${top}" width="${tw}" height="40" rx="8"/>
<text class="s" ${startText(W, i * (tw + gap) + 9, top + 16)} font-family="${FONT}" font-size="11">${k}</text>
<text class="t" ${startText(W, i * (tw + gap) + 9, top + 33, false)} font-family="${FONT}" font-size="15" font-weight="600" font-variant-numeric="tabular-nums">${v}</text>`
  return svg(
    pk,
    W,
    headerHeight(title),
    `${title ? `<text class="t" ${startText(W, 0, 15)} font-family="${FONT}" font-size="14" font-weight="600">${xml(fitText(title, 14, W))}</text>` : ''}
${tile(0, s.cost, '≈' + fmtCost(t.cost))}${tile(1, s.tokens, fmtTokens(t.tokens))}${tile(2, s.time, fmtTime(t.time))}`,
  )
}

const headerHeight = (title: string): number => (title ? 72 : 44)

// The task's own progress when the worker reports steps; a finished run is full.
const progressOf = (a: AgentRun): number | null => {
  if (a.status === 'done') return 1
  if (a.stepTotal) return Math.min(1, (a.stepDone ?? 0) / a.stepTotal)
  return null
}

const ctxOf = (a: AgentRun): number => (a.contextMax ? Math.min(100, Math.round((a.contextTokens / a.contextMax) * 100)) : 0)

const agentSvg = (pk: Pack, W: number, f: Flow | null, a: AgentRun, at: number): string => {
  const s = tr()
  const tier = tierOf(a.type)
  const color = colorOf(tier)
  const ctx = ctxOf(a)
  const TX = panelFit(pk).textX
  const textW = W - TX - 22
  const meta = [runModel(a)]
  if (a.round > 1) meta.push(`${s.round} ${a.round}`)
  if (a.status === 'failed') meta.push(s.failed)
  const barW = textW
  const progress = progressOf(a)
  const stats = `${s.ctx} ${ctx}% · ${fmtTokens(a.contextTokens)}  ≈${fmtCost(a.costUsd)}  ${fmtTime(elapsed(a, at))}`
  const steps = a.stepTotal ? `${a.stepDone ?? 0}/${a.stepTotal}${a.stepNote ? ' · ' + a.stepNote : ''}` : ''
  const stepsW = Math.max(0, barW - textWidth(stats, 11) - 12)
  // Without reported steps the bar falls back to the context, drawn grey.
  const fillW = Math.round(barW * (progress ?? ctx / 100))
  return svg(
    pk,
    W,
    66,
    `${rowCat(pk, W, 0, 28, { role: costumeOf(f, a.type, a.description), tier }, a.description || a.id, false, a.status === 'running', color)}
<text class="t" ${startText(W, TX, 18)} font-family="${FONT}" font-size="13" font-weight="600">${xml(fitText(a.description || a.type, 13, textW))}</text>
<text ${startText(W, TX, 34)} font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(tier === 'other' ? a.type : tierWord(tier))}</tspan><tspan class="s">  ${xml(meta.join('  ·  '))}</tspan></text>
${steps && stepsW > 30 ? `<text class="t" ${startText(W, TX, 49)} font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${xml(fitText(steps, 11, stepsW))}</text>` : ''}
<text class="s" ${endText(W, TX + barW, 49, true)} font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${stats}</text>
<rect class="k" x="${mx(W, TX, barW)}" y="55" width="${barW}" height="4" rx="2"/><rect${progress === null ? ' class="m"' : ''} x="${mx(W, TX, fillW)}" y="55" width="${fillW}" height="4" rx="2"${progress === null ? '' : ` fill="${color}"`}/>
${statusMark(mx(W, W - 8), 16, a.status, color)}
<line class="ln" x1="0" y1="65.5" x2="${W}" y2="65.5"/>`,
  )
}

const plannedSvg = (pk: Pack, W: number, p: Planned): string => {
  const tier: Tier = p.tier in TIER_COLOR ? (p.tier as Tier) : 'other'
  const color = colorOf(tier)
  const TX = panelFit(pk).textX
  const textW = W - TX - 22
  const meta = [tierModel(tier)]
  if (p.after.length) meta.push(`${tr().after} ${p.after.join(', ')}`)
  return svg(
    pk,
    W,
    46,
    `${rowCat(pk, W, 0, 20, { role: taskRole(p), tier }, p.title, true, false, color)}
<text class="s" ${startText(W, TX, 18)} font-family="${FONT}" font-size="13" font-weight="600">${xml(fitText(`${p.n}. ${p.title}`, 13, textW))}</text>
<text ${startText(W, TX, 34)} font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(tierWord(tier))}</tspan><tspan class="m">  ${xml(meta.filter(Boolean).join('  ·  '))}</tspan></text>
${statusMark(mx(W, W - 8), 16, 'planned', color)}
<line class="ln" x1="0" y1="45.5" x2="${W}" y2="45.5"/>`,
  )
}

const compactSvg = (pk: Pack, W: number, f: Flow | null, list: AgentRun[], planned: Planned[], t: ReturnType<typeof totals>): string => {
  const plannedTier = (tier: string): Tier => (tier in TIER_COLOR ? (tier as Tier) : 'other')
  const icons = [
    ...list.filter(a => a.status === 'running').map(a => ({ k: costumeOf(f, a.type, a.description), tier: tierOf(a.type), coat: a.description || a.id, c: colorOf(tierOf(a.type)), s: 'running', dim: false })),
    ...list.filter(a => a.status !== 'running').map(a => ({ k: costumeOf(f, a.type, a.description), tier: tierOf(a.type), coat: a.description || a.id, c: colorOf(tierOf(a.type)), s: a.status, dim: false })),
    ...planned.map(p => ({ k: taskRole(p), tier: plannedTier(p.tier), coat: p.title, c: colorOf(p.tier), s: 'planned', dim: true })),
  ]
  const { pitch, w: spriteW, h: spriteH } = panelFit(pk)
  const fit = Math.max(1, Math.floor((W - 150) / pitch))
  const shown = icons.slice(0, fit)
  const more = icons.length - shown.length
  // Sprites sit on the line 28px down (a cat fills 0..28); the running dot is at the sprite's top right.
  const cy = Math.max(spriteH / 2, 28 - spriteH / 2)
  const body = shown
    .map((ic, i) => rowCat(pk, W, i * pitch, cy, { role: ic.k, tier: ic.tier }, ic.coat, ic.dim, ic.s === 'running', ic.c) + (ic.s === 'running' ? `<circle class="live" cx="${mx(W, i * pitch + spriteW)}" cy="4" r="3" fill="${ic.c}"/>` : ''))
    .join('')
  const x = shown.length * pitch + (more ? 4 : 0)
  return svg(
    pk,
    W,
    COMPACT_H,
    `${body}${more ? `<text class="s" ${startText(W, x, 21, false)} font-family="${FONT}" font-size="12">+${more}</text>` : ''}
<text class="s" ${endText(W, W, 21)} font-family="${FONT}" font-size="12" font-variant-numeric="tabular-nums">≈${fmtCost(t.cost)} · ${fmtTokens(t.tokens)} · ${fmtTime(t.time)}</text>`,
  )
}

// --- the pack gallery: one card per pack, every costume in a row, walking.

// One (role, tier) per costume, so each card shows all of a pack's sprites in their tier colours.
const GALLERY: readonly { role: Role; tier: Tier }[] = [
  { role: 'conductor', tier: 'other' },
  { role: 'builder', tier: 'medium' },
  { role: 'fixer', tier: 'heavy' },
  { role: 'tester', tier: 'light' },
  { role: 'scout', tier: 'careful' },
  { role: 'plain', tier: 'other' },
]
const CARD_H = 84
const CARD_PAD = 12

// A season's dates in the gallery: a whole month by name ("December"), else a day range ("Nov 15-30").
const seasonDates = (from: MonthDay, to: MonthDay): string => {
  const s = tr()
  const [fm, fd] = from
  const [tm, td] = to
  if (fm === tm && fd === 1 && td === new Date(2001, tm, 0).getDate()) return s.month(fm)
  return fm === tm ? s.days(fm, fd, td) : `${s.day(fm, fd)} - ${s.day(tm, td)}`
}

// A card's labels, in order: the holiday dates, Everyday, Showing. `isOn` draws it in green.
type CardLabel = { text: string; isOn: boolean }
const labelText = (labels: readonly CardLabel[]): string => labels.map(l => l.text).join(' · ')

const packCardSvg = (p: Pack, W: number, labels: readonly CardLabel[]): string => {
  const s = tr()
  const fit = panelFit(p)
  const inner = W - CARD_PAD * 2
  // The row fits the card: past its width the sprites step closer, never smaller.
  const pitch = Math.min(fit.pitch, (inner - fit.w) / (GALLERY.length - 1))
  const label = labelText(labels)
  const activeW = label ? textWidth(label, 11) + 12 : 0
  const nameW = inner - activeW
  const count = s.variants(p.variants.length)
  const sprites = GALLERY.map((who, i) =>
    p.draw(mx(W, CARD_PAD + i * pitch, fit.w), 54 - fit.h / 2, who, {
      variant: p.variantOf(who.role),
      accent: colorOf(who.tier),
      isWalking: true,
      scale: fit.scale,
      mirror: isRtl(),
    }),
  ).join('')
  return svg(
    p,
    W,
    CARD_H,
    `<rect class="tile" x="0" y="0" width="${W}" height="${CARD_H}" rx="8"/>
<text ${startText(W, CARD_PAD, 22)} font-family="${FONT}" font-size="13"><tspan class="t" font-weight="600">${xml(fitText(p.name, 13, Math.max(40, nameW - textWidth(count, 11) - 12)))}</tspan><tspan class="s" font-size="11">  ·  ${xml(count)}</tspan></text>
${label ? `<text ${endText(W, W - CARD_PAD, 22, true)} font-family="${FONT}" font-size="11" font-weight="600">${labels.map((l, i) => `${i ? '<tspan class="s"> · </tspan>' : ''}${l.isOn ? `<tspan fill="#3B9C5F">${xml(l.text)}</tspan>` : `<tspan class="s">${xml(l.text)}</tspan>`}`).join('')}</text>` : ''}
${sprites}`,
  )
}

// --- terminal drawing: the same rows in text.

const ctxBar = (pct: number, width: number): string => {
  const filled = Math.round((width * pct) / 100)
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
}

const STATUS_GLYPH: Record<string, string> = { running: '●', done: '✓', failed: '✗', planned: '◷' }

// Opens the agents pane, or closes it when it is up; true when it ends up open.
async function togglePane($: EngineInterface): Promise<boolean> {
  const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  if (isOpen) {
    await $.ui.close({ id: PANE })
    return false
  }
  const at = await $.clock.now()
  await update($, now, () => at)
  await $.ui.open({ id: PANE, title: tr().pane })
  return true
}

async function autoOpen($: EngineInterface, key: string): Promise<void> {
  const p = await read($, panel)
  if (p.autoOpenedFor === key) return
  await update($, panel, prev => ({ ...prev, autoOpenedFor: key }))
  void $.ui.open({ id: PANE, title: tr().pane })
}

// Which pack shows: the everyday pack (a pack id, or `shuffle` for one picked per session)
// unless seasons are on and a season holds (packs/seasons.ts resolvePack). Read at session.start
// from the store keys `everyday`, `shuffleList`, `seasons`, `skipSeason` and `lastShuffle`, then
// the `pack` and `seasons` options. The store wins. The date is checked at session start and
// when a new /relay flow starts (the `progress` call isNewFlow treats as new); no timer, and
// nothing per render or tick.
const AUTO = 'auto'
const isRegistered = (id: string) => packById(id) !== undefined
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthDay = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`
const SEASONS_BY_ID = new Map(SEASONS.map(s => [s.id, s]))

type PackSettings = {
  everyday: string
  shuffleList: string[]
  seasons: boolean
  skipSeason?: string
  lastShuffle?: string
}

// Module scope is fine: session.start sets them again on every (re)load.
let cfg: PackSettings = { everyday: OFF_SEASON, shuffleList: [], seasons: true }
// This session's shuffle pick: made at session.start or by `shuffle`, never by a new flow or a redraw.
let shuffled: string | undefined

const everydayOf = (v: unknown): string | undefined => (v === SHUFFLE || (typeof v === 'string' && isRegistered(v)) ? v : undefined)

async function storeGet($: EngineInterface, key: string): Promise<unknown> {
  try {
    return await $.store.get(key)
  } catch {
    return undefined
  }
}

async function storeSet($: EngineInterface, key: string, value: unknown): Promise<void> {
  try {
    if (value === undefined) await $.store.delete(key)
    else await $.store.set(key, value as never)
  } catch {
    // No store: the change still holds for this session.
  }
}

async function resolveNow($: EngineInterface): Promise<Resolved & { now: Date }> {
  const now = new Date(await $.clock.now())
  return { now, ...resolveShowing({ now, ...cfg, shuffled, registered: packIds(), fallback: DEFAULT_PACK, random: Math.random }) }
}

// The pack that shows now, with this session's shuffle pick (never a new one); writes the
// atom only when the id changes. Run at session start, on a settings change and on a new flow.
async function applyPack($: EngineInterface): Promise<Resolved & { now: Date }> {
  const r = await resolveNow($)
  if ((await read($, pack)) !== r.id) await update($, pack, () => r.id)
  return r
}

// A fresh shuffle pick, remembered so the next one differs.
async function shuffleNow($: EngineInterface): Promise<string> {
  shuffled = pickShuffle({ shuffleList: cfg.shuffleList, registered: packIds(), lastShuffle: cfg.lastShuffle, random: Math.random })
  cfg.lastShuffle = shuffled
  await storeSet($, 'lastShuffle', shuffled)
  return shuffled
}

// Resolves the settings and the pack that shows at session.start. Returns that pack's id.
export async function loadActivePack($: EngineInterface, options: { pack?: unknown; seasons?: unknown }): Promise<string> {
  goneNote = ''
  let gone = ''
  // Before 0.3.0 the store key `pack` held the mode: `auto`, or a pinned id. A pin becomes the
  // everyday pack with seasons on; `auto` leaves the options in charge. Then the key goes.
  const legacy = await storeGet($, 'pack')
  if (legacy !== undefined) {
    if (typeof legacy === 'string' && legacy && legacy !== AUTO) {
      if (isRegistered(legacy)) {
        await storeSet($, 'everyday', legacy)
        await storeSet($, 'seasons', true)
      } else gone = legacy
    }
    await storeSet($, 'pack', undefined)
  }

  const everyday = await storeGet($, 'everyday')
  if (typeof everyday === 'string' && everyday && !everydayOf(everyday)) gone = everyday
  const seasons = await storeGet($, 'seasons')
  const list = await storeGet($, 'shuffleList')
  const skip = await storeGet($, 'skipSeason')
  const last = await storeGet($, 'lastShuffle')
  cfg = {
    // A legacy option value `auto` is not an id: it reads as the default.
    everyday: everydayOf(everyday) ?? everydayOf(options.pack) ?? OFF_SEASON,
    seasons: typeof seasons === 'boolean' ? seasons : options.seasons !== 'off' && options.seasons !== false,
    shuffleList: Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [],
    skipSeason: typeof skip === 'string' && skip ? skip : undefined,
    lastShuffle: typeof last === 'string' && last ? last : undefined,
  }

  // A skip whose season is over is cleared.
  const r0 = await resolveNow($)
  if (cfg.skipSeason && !r0.isSkipped) {
    cfg.skipSeason = undefined
    await storeSet($, 'skipSeason', undefined)
  }
  shuffled = undefined
  if (cfg.everyday === SHUFFLE) await shuffleNow($)

  const r = await applyPack($)
  // A stored id whose pack is no longer registered: said once, in the next list reply.
  if (gone) goneNote = `stored pack "${gone}" is gone; using ${r.id}`
  return r.id
}

// Set by loadActivePack, cleared by the first list reply that carries it.
let goneNote = ''

const PACKS_PANE = 'relay-packs'

// The settings line that heads every list reply:
// `everyday: cats · seasons on · showing: cats · next: turkeys Nov 15`.
async function settingsLine($: EngineInterface): Promise<string> {
  const r = await resolveNow($)
  const candidates = shuffleCandidates(cfg.shuffleList, packIds())
  const parts = [
    `everyday: ${cfg.everyday === SHUFFLE ? `shuffle (${candidates.length ? candidates.join(', ') : 'none'})` : cfg.everyday}`,
    cfg.seasons ? 'seasons on' : 'seasons off',
    `showing: ${r.id}`,
  ]
  if (r.isSkipped && r.season) parts.push(`${r.season.id} skipped until ${monthDay(seasonEndAt(r.season, r.now))}`)
  if (cfg.seasons) {
    const next = nextSeasonAt(r.now, isRegistered)
    if (next) parts.push(`next: ${next.id} ${monthDay(next.from)}`)
  }
  return parts.join(' · ')
}

// The settings, then every registered pack, one line each, the one showing marked.
async function packList($: EngineInterface): Promise<string> {
  const active = await read($, pack)
  const lines = PACKS.map(p => `${p.id}: ${p.name} (${p.variants.length} ${p.variants.length === 1 ? 'variant' : 'variants'})${p.id === active ? ' (active)' : ''}`)
  lines.unshift(await settingsLine($))
  if (goneNote) {
    lines.unshift(goneNote)
    goneNote = ''
  }
  return lines.join('\n')
}

type Reply = { ok: boolean; text: string }

// Picking an everyday pack while a season shows skips that season, so the pick shows now.
// Returns the reply's tail: `; Christmas skipped until Dec 31`, or ''.
async function skipShowingSeason($: EngineInterface, before: Resolved & { now: Date }, id?: string): Promise<string> {
  const season: Season | undefined = before.isSeasonal ? before.season : undefined
  if (!season || season.id === id) return ''
  cfg.skipSeason = seasonKey(season, before.now)
  await storeSet($, 'skipSeason', cfg.skipSeason)
  return `; ${resolvePack(season.id).name} skipped until ${monthDay(seasonEndAt(season, before.now))}`
}

// Everything that changes the settings ends here: the atom the band, the panel and the
// gallery read, and the gallery's labels.
async function settled($: EngineInterface): Promise<Resolved & { now: Date }> {
  const r = await applyPack($)
  $.ui.invalidate('ui.render')
  return r
}

// A fixed everyday pack. Any registered id, holiday packs included.
async function setEveryday($: EngineInterface, id: string): Promise<Reply> {
  if (!isRegistered(id)) return { ok: false, text: `unknown pack "${id}"; valid ids: ${[...packIds(), SHUFFLE, AUTO].join(', ')}` }
  const before = await resolveNow($)
  cfg.everyday = id
  shuffled = undefined
  await storeSet($, 'everyday', id)
  const skipped = await skipShowingSeason($, before, id)
  const r = await settled($)
  const name = resolvePack(r.id).name
  return { ok: true, text: skipped ? `ok: ${name} now${skipped}` : `ok: everyday pack is ${name}` }
}

// Shuffle the everyday pack among `ids` (none = every non-holiday pack), with a fresh pick now.
async function setShuffle($: EngineInterface, ids: readonly string[]): Promise<Reply> {
  const valid = shuffleCandidates([], packIds())
  const bad = ids.filter(id => !valid.includes(id))
  if (bad.length) {
    const why = bad.map(id => `"${id}" (${isHoliday(id) && isRegistered(id) ? 'holiday pack' : 'unknown'})`).join(', ')
    return { ok: false, text: `cannot shuffle ${why}; valid ids: ${valid.join(', ')}` }
  }
  const before = await resolveNow($)
  cfg.everyday = SHUFFLE
  cfg.shuffleList = [...new Set(ids)]
  await storeSet($, 'everyday', SHUFFLE)
  await storeSet($, 'shuffleList', cfg.shuffleList)
  await shuffleNow($)
  const skipped = await skipShowingSeason($, before)
  const r = await settled($)
  return { ok: true, text: `ok: shuffling ${shuffleCandidates(cfg.shuffleList, packIds()).join(', ')}; ${resolvePack(r.id).name} now${skipped}` }
}

// Seasons on or off. Turning them on also lifts a skip, so a season holding now shows again.
async function setSeasons($: EngineInterface, on: boolean): Promise<Reply> {
  cfg.seasons = on
  await storeSet($, 'seasons', on)
  if (on && cfg.skipSeason) {
    cfg.skipSeason = undefined
    await storeSet($, 'skipSeason', undefined)
  }
  const r = await settled($)
  return { ok: true, text: `ok: seasons ${on ? 'on' : 'off'}; showing ${resolvePack(r.id).name}` }
}

// The words /relay-pack and the tool's `set` take: a pack id, `shuffle`, or `auto` (seasons on).
async function setByWord($: EngineInterface, word: string): Promise<Reply> {
  if (word === AUTO) return setSeasons($, true)
  if (word === SHUFFLE) return setShuffle($, [])
  return setEveryday($, word)
}

// The gallery's labels for one card.
function cardLabels(p: Pack, active: string): CardLabel[] {
  const s = tr()
  const labels: CardLabel[] = []
  const season = SEASONS_BY_ID.get(p.id)
  if (season) labels.push({ text: `${s.holiday} · ${seasonDates(season.from, season.to)}`, isOn: false })
  const everyday = cfg.everyday === SHUFFLE ? shuffled : cfg.everyday
  if (p.id === everyday) labels.push({ text: s.everyday, isOn: false })
  if (p.id === active) labels.push({ text: s.showing, isOn: true })
  return labels
}

async function openGallery($: EngineInterface): Promise<string> {
  await $.ui.open({ id: PACKS_PANE, title: tr().packs })
  return 'Sprite pack gallery opened.'
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    lang = await detectLang($, options.language)
    await loadActivePack($, { pack: options.pack, seasons: options.seasons })
    await $.tool.register({
      name: 'progress',
      description:
        'Report /relay progress to the progress bar above the prompt and the agents panel. ' +
        'Call it after presenting the plan (title, total, tasks, phase "delegate"), each time a task is accepted (done), ' +
        'when switching phase or re-planning (tasks), and once at the end with finished: true. Fields left out keep their previous value. ' +
        'For the main session only: a call from a subagent is ignored (workers report with `step`).',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short name of the overall task, a few words.' },
          total: { type: 'integer', minimum: 0, description: 'Number of planned worker tasks.' },
          done: { type: 'integer', minimum: 0, description: 'Number of tasks accepted after review.' },
          phase: { type: 'string', enum: [...PHASES] },
          finished: { type: 'boolean', description: 'True once the flow is closed.' },
          tasks: {
            type: 'array',
            description:
              'The planned worker tasks in order, numbered from 1. Each title must equal the Agent tool `description` the task will be delegated with, so the panel can match runs to tasks.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'A few words; reused verbatim as the Agent description.' },
                tier: { type: 'string', enum: [...TIERS] },
                role: {
                  type: 'string',
                  enum: [...TASK_ROLES],
                  description: 'The job, drawn as the sprite costume: builder (features, changes), fixer (debugging, root cause), tester (builds, tests, checks), scout (searching, reading code).',
                },
                after: { type: 'array', items: { type: 'integer' }, description: 'Numbers of the tasks this one waits for.' },
              },
              required: ['title', 'tier', 'role'],
            },
          },
        },
      },
    })
    await $.tool.register({
      name: 'step',
      description:
        'For relay workers: report progress on your own task to the agents panel. ' +
        'Right after reading the brief, call it with `total` (your plan in 3-8 steps) and `done: 0`; ' +
        'call it again as each step finishes. Cheap and silent: it only draws a bar.',
      inputSchema: {
        type: 'object',
        properties: {
          done: { type: 'integer', minimum: 0, description: 'Steps finished so far.' },
          total: { type: 'integer', minimum: 1, description: 'Steps planned; may change if the plan changes.' },
          note: { type: 'string', description: 'The step in progress, a few words.' },
        },
        required: ['done'],
      },
      // In every agent's tool list, not behind ToolSearch: workers do not go looking for it.
      isDeferred: false,
    })
    await $.command.register({
      name: 'relay-agents',
      description: 'Show or hide the panel of subagents: running, finished and planned, with model, context, cost and time',
    })
    await $.tool.register({
      name: 'pack',
      description:
        'List, preview or switch the sprite pack drawn in the relay agents panel and the progress bar. ' +
        'The everyday pack shows all year; with seasons on, holiday packs (turkeys Nov 15-30, christmas in December) replace it. ' +
        '`list`: the settings line (everyday pack, seasons, what shows now, the next season), then the packs, the one showing marked. ' +
        '`set` with `id`: make that pack the everyday pack (it shows at once; during a season that season is skipped this year); ' +
        '`id: "shuffle"` shuffles every non-holiday pack; `id: "auto"` turns seasons on. ' +
        '`shuffle` with optional `ids`: a random everyday pack each session, from those ids (default: every non-holiday pack). ' +
        '`seasons` with `on`: holiday packs on or off. ' +
        '`preview`: open a gallery pane showing every pack.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'set', 'shuffle', 'seasons', 'preview'] },
          id: { type: 'string', description: 'For `set`: a pack id as `list` prints it, `shuffle`, or `auto` (seasons on).' },
          ids: { type: 'array', items: { type: 'string' }, description: 'For `shuffle`: non-holiday pack ids to shuffle; empty or left out = all of them.' },
          on: { type: 'boolean', description: 'For `seasons`: true shows holiday packs in season, false keeps the everyday pack all year.' },
        },
        required: ['action'],
      },
    })
    await $.command.register({
      name: 'relay-pack',
      description:
        'List the sprite packs, set the everyday pack with /relay-pack <id>, shuffle with /relay-pack shuffle [ids], turn holiday packs on or off with /relay-pack seasons on|off, or open the gallery with /relay-pack preview',
    })

    // Ticks the running agents' clocks; quiet when nothing runs.
    $.clock.every(1000, () => {
      void (async () => {
        const list = await read($, agents)
        if (!list.some(a => a.status === 'running')) return
        const at = await $.clock.now()
        await update($, now, () => at)
      })()
    })
    return started
  })

  on('command.run', { command: 'relay-agents' }, async ($, e) => {
    // `/relay-agents open` opens the panel, or brings it forward from behind another tab, without toggling it.
    if ((e.args ?? '').trim() === 'open') {
      const at = await $.clock.now()
      await update($, now, () => at)
      await $.ui.open({ id: PANE, title: tr().pane })
      return { text: tr().opened }
    }
    const isOpen = await togglePane($)
    return { text: isOpen ? tr().opened : tr().closed }
  })

  on('command.run', { command: 'relay-pack' }, async ($, e) => {
    const arg = (e.args ?? '').trim()
    if (!arg || arg === 'list') return { text: await packList($) }
    if (arg === 'preview') return { text: await openGallery($) }
    const [word = '', ...rest] = arg.split(/[\s,]+/).filter(Boolean)
    if (word === 'shuffle') return { text: (await setShuffle($, rest)).text }
    if (word === 'seasons') {
      if (rest.length === 1 && (rest[0] === 'on' || rest[0] === 'off')) return { text: (await setSeasons($, rest[0] === 'on')).text }
      return { text: 'usage: /relay-pack seasons on|off' }
    }
    return { text: (await setByWord($, arg)).text }
  })

  on('tool.call', { tool: PACK_TOOL }, async ($, e) => {
    const input = e as unknown as { action?: string; id?: string; ids?: unknown; on?: unknown }
    if (input.action === 'list') return { result: await packList($) }
    if (input.action === 'preview') return { result: await openGallery($) }
    let r: Reply | undefined
    if (input.action === 'set') r = await setByWord($, String(input.id ?? '').trim())
    if (input.action === 'shuffle') {
      const ids = Array.isArray(input.ids) ? input.ids.map(x => String(x).trim()).filter(Boolean) : []
      r = await setShuffle($, ids)
    }
    if (input.action === 'seasons') {
      const isOn = input.on === true || input.on === 'on' || input.on === 'true'
      const isOff = input.on === false || input.on === 'off' || input.on === 'false'
      if (!isOn && !isOff) return { deny: 'seasons needs `on`: true or false' }
      r = await setSeasons($, isOn)
    }
    if (!r) return { deny: `unknown action "${String(input.action)}"; use list, set, shuffle, seasons or preview` }
    return r.ok ? { result: r.text } : { deny: r.text }
  })

  on('ui.render', { component: 'Pane', requestId: PACKS_PANE }, async ($, e) => {
    const s = tr()
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const active = resolvePack(await read($, pack)).id
    // Use sets the everyday pack: on every card but the fixed everyday one.
    const hasUse = (p: Pack) => p.id !== cfg.everyday
    const use = (p: Pack) => <Button key={`use-${p.id}`} label={s.use} onPress={() => void setEveryday($, p.id)} />
    const align = isRtl() ? 'flex-end' : undefined

    if (e.surface !== 'terminal' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      return (
        <Box flexDirection="column" gap={1} alignItems={align}>
          {PACKS.map(p => {
            const labels = cardLabels(p, active)
            return (
              <Box key={p.id} flexDirection="column" gap={1} alignItems={align}>
                <Svg
                  key={`card-${p.id}`}
                  source={packCardSvg(p, W, labels)}
                  alt={`${p.name}: ${s.variants(p.variants.length)}${labels.length ? `, ${labelText(labels)}` : ''}`}
                  width={W}
                  height={CARD_H}
                />
                {hasUse(p) && use(p)}
              </Box>
            )
          })}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        {PACKS.map(p => {
          const labels = cardLabels(p, active)
          return (
            <Box key={p.id} flexDirection="row" gap={1}>
              <Text bold>{p.name}</Text>
              <Text dimColor>{s.variants(p.variants.length)}</Text>
              {labels.map(l => (
                <Text key={l.text} color={l.isOn ? DONE : undefined} dimColor={!l.isOn}>
                  {l.text}
                </Text>
              ))}
              {hasUse(p) && use(p)}
            </Box>
          )
        })}
      </Box>
    )
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    // The flow is the main session's: a call from a worker's loop carries its agentId
    // and changes nothing, or any subagent could rename, finish or reset the flow.
    if (e.agentId) return { result: 'ignored: only the main session reports the flow' }
    const input = e as unknown as ProgressInput
    const prev = await read($, flow)
    const isNew = isNewFlow(prev, input)
    if (isNew && input.title !== undefined) {
      // A new flow starts with a clean list; agents still running stay.
      await update($, agents, list => list.filter(a => a.status === 'running'))
    }
    // A new flow is the one other moment the date is checked: a season that began since
    // session start shows now. No new shuffle pick; the same flow's later calls do not re-resolve.
    // A clock or store that fails keeps the pack showing: the report itself must still land.
    if (isNew) await applyPack($).catch(() => undefined)
    const next = await update($, flow, p => merge(p, input))
    if (next && input.tasks?.length) await autoOpen($, next.title)
    return { result: `ok: ${label(next ?? blank())}` }
  })

  // A worker's own progress: the call runs in the worker's loop, so agentId names it.
  on('tool.call', { tool: STEP_TOOL }, async ($, e) => {
    const input = e as unknown as { done?: number; total?: number; note?: string }
    const agentId = e.agentId
    if (!agentId) return { result: 'ignored: only subagents report steps' }
    let matched = false
    await update($, agents, list =>
      list.map(a => {
        if (a.agentId !== agentId) return a
        matched = true
        const total = Math.max(0, Math.round(input.total ?? a.stepTotal ?? 0))
        const done = Math.max(0, Math.round(input.done ?? a.stepDone ?? 0))
        return { ...a, stepTotal: total, stepDone: total ? Math.min(total, done) : done, stepNote: input.note?.trim() || undefined }
      }),
    )
    return { result: matched ? 'ok' : `ignored: no panel row for agent ${agentId}` }
  })

  // Safety net: worker launches move the faint layer even if the orchestrator forgets to report.
  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const type = String(e.subagent_type ?? '')
    if (!isWorker(type)) return next(e)

    await update($, flow, prev => {
      const base = prev && !prev.isFinished ? { ...blank(), ...prev } : blank()
      return { ...base, running: base.running + 1, phase: base.phase === 'plan' ? 'delegate' : base.phase }
    })
    try {
      return await next(e)
    } finally {
      await update($, flow, prev => (prev ? { ...prev, running: Math.max(0, prev.running - 1) } : prev))
    }
  })

  on('agent.spawn', async ($, e, next) => {
    const isUnbriefed = isWorker(e.subagentType) && !e.prompt.includes(STEP_TOOL)
    const started = await next(isUnbriefed ? { ...e, prompt: e.prompt + STEP_BRIEF } : e)
    if (started.deny !== undefined) return started

    const at = await $.clock.now()
    await update($, agents, list => {
      const round = 1 + list.filter(a => norm(a.description) === norm(e.description) && e.description).length
      const run: AgentRun = {
        id: started.agentId ?? e.tool_use_id,
        agentId: started.agentId,
        type: e.subagentType,
        description: e.description,
        model: started.model,
        status: 'running',
        startedAt: at,
        contextTokens: 0,
        contextMax: windowOf(started.model),
        tokens: 0,
        costUsd: 0,
        steps: 0,
        round,
      }
      return [...list.filter(a => a.id !== run.id), run].slice(-200)
    })
    await update($, now, () => at)
    if (isWorker(e.subagentType)) {
      const f = await read($, flow)
      await autoOpen($, f && !f.isFinished ? f.title : 'relay')
    } else if (options.autoOpen === 'any') {
      await autoOpen($, 'any-agent')
    }
    return started
  })

  // Each model request of a subagent: live context, tokens and cost.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const agentId = e.agentId
    const usage = result.usage
    if (!agentId || !usage) return result

    const model = usage.model || e.model
    await update($, agents, list =>
      list.map((a): AgentRun =>
        a.agentId !== agentId
          ? a
          : {
              ...a,
              model,
              effort: typeof e.effort === 'string' ? e.effort : a.effort,
              status: 'running',
              endedAt: undefined,
              contextTokens:
                (usage.input_tokens || 0) +
                (usage.cache_read_input_tokens || 0) +
                (usage.cache_creation_input_tokens || 0) +
                (usage.output_tokens || 0),
              contextMax: windowOf(model),
              tokens:
                a.tokens +
                (usage.input_tokens || 0) +
                (usage.output_tokens || 0) +
                (usage.cache_read_input_tokens || 0) +
                (usage.cache_creation_input_tokens || 0),
              costUsd: a.costUsd + costOf(model, usage, true),
              steps: a.steps + 1,
            },
      ),
    )
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const agentId = e.agentId
    if (agentId) {
      const at = await $.clock.now()
      await update($, agents, list =>
        list.map((a): AgentRun => {
          if (a.agentId !== agentId) return a
          // A run whose steps went unseen still gets the turn's own sum.
          const fallback = a.steps === 0 && e.usage
          return {
            ...a,
            status: e.reason === 'answer' ? 'done' : 'failed',
            endedAt: at,
            ...(fallback && e.usage
              ? {
                  model: e.usage.model || a.model,
                  tokens:
                    e.usage.input_tokens +
                    e.usage.output_tokens +
                    e.usage.cache_read_input_tokens +
                    e.usage.cache_creation_input_tokens,
                  costUsd: costOf(e.usage.model || a.model, e.usage, false),
                }
              : {}),
          }
        }),
      )
      await update($, now, () => at)
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = tr()
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, agents)
    const f = await read($, flow)
    const p: Panel = await read($, panel)
    const pk = resolvePack(await read($, pack))
    const at = Math.max(await read($, now), ...list.map(a => a.startedAt), 0)

    const running = list.filter(a => a.status === 'running').reverse()
    const finished = list.filter(a => a.status !== 'running').reverse()
    const planned = plannedOf(f, list)
    const t = totals(list, at)
    // The pane's title says "Agents"; inside, only the flow's own name.
    const title = f && !f.isFinished ? f.title : ''

    const toggleCompact = (
      <Button
        key="compact"
        label={p.isCompact ? s.expand : s.collapse}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isCompact: !prev.isCompact }))}
      />
    )
    const toggleDone = (
      <Button
        key="done"
        label={`${p.isDoneCollapsed ? (isRtl() ? '◂' : '▸') : '▾'} ${s.finished} · ${finished.length}`}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isDoneCollapsed: !prev.isDoneCollapsed }))}
      />
    )
    const isEmpty = list.length === 0 && planned.length === 0
    const summary = `≈${fmtCost(t.cost)}, ${fmtTokens(t.tokens)} ${s.tokensWord}, ${fmtTime(t.time)}`

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      const section = (key: string, text: string) => (
        <Text key={key} dimColor>
          {text}
        </Text>
      )

      // In Hebrew the column hugs the right edge: section heads and buttons right-aligned.
      const align = isRtl() ? 'flex-end' : undefined
      if (p.isCompact) {
        return (
          <Box flexDirection="column" gap={1} alignItems={align}>
            <Svg source={compactSvg(pk, W, f, list, planned, t)} alt={`${list.length} ${s.agentsCount}, ${summary}`} width={W} height={COMPACT_H} />
            {toggleCompact}
          </Box>
        )
      }
      const shownDone = p.isDoneCollapsed ? 0 : finished.length
      const lines = 1 + (isEmpty ? 1 : 0) + (running.length > 0 ? 1 : 0) + (finished.length > 0 ? 1 : 0) + (planned.length > 0 ? 1 : 0)
      const gridH = headerHeight(title) + lines * LINE_H + (running.length + shownDone) * 66 + planned.length * 46
      return (
        <Box flexDirection="column">
          {/* The grid sizes the pane; the content is placed over it, as an
              absolute Box paints over the siblings before it. */}
          {gridTiles(gridH).map((tileH, i) => (
            <Svg key={`grid-${i}`} source={gridSvg(W, tileH)} alt="dotted grid" width={W} height={tileH} />
          ))}
          <Box flexDirection="column" position="absolute" top={0} left={0} right={0} alignItems={align}>
            <Svg source={headerSvg(pk, W, title, t)} alt={title ? `${title}: ${summary}` : summary} width={W} height={headerHeight(title)} />
            {toggleCompact}
            {isEmpty && <Text dimColor>{s.empty}</Text>}
            {running.length > 0 && section('h-run', `${s.running} · ${running.length}`)}
            {running.map(a => (
              <Svg key={a.id} source={agentSvg(pk, W, f, a, at)} alt={`${a.description}: ${modelName(a.model)}, ${s.isRunning}`} width={W} height={66} />
            ))}
            {finished.length > 0 && toggleDone}
            {!p.isDoneCollapsed &&
              finished.map(a => (
                <Svg key={a.id} source={agentSvg(pk, W, f, a, at)} alt={`${a.description}: ${modelName(a.model)}, ${s.isFinished}`} width={W} height={66} />
              ))}
            {planned.length > 0 && section('h-plan', `${s.planned} · ${planned.length}`)}
            {planned.map(pl => (
              <Svg key={`plan-${pl.n}`} source={plannedSvg(pk, W, pl)} alt={`${pl.n}. ${pl.title}: ${s.isPlanned}`} width={W} height={46} />
            ))}
          </Box>
        </Box>
      )
    }

    // Terminal: the same content in text rows.
    const cols = Math.max(24, e.props.bodyColumns || 40)
    const barW = Math.max(6, Math.min(20, cols - 34))
    const row = (a: AgentRun) => {
      const tier = tierOf(a.type)
      const color = colorOf(tier)
      const ctx = ctxOf(a)
      const progress = progressOf(a)
      const model = runModel(a)
      const steps = a.stepTotal ? `${a.stepDone ?? 0}/${a.stepTotal}${a.stepNote ? ' ' + a.stepNote : ''} · ` : ''
      return (
        <Box key={a.id} flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={color}>▣</Text>
            <Text bold wrap="truncate-end">
              {a.description || a.type}
            </Text>
            <Text color={a.status === 'failed' ? 'red' : a.status === 'done' ? 'green' : color}>{STATUS_GLYPH[a.status]}</Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            {'  '}
            {tier === 'other' ? a.type : tierWord(tier)} · {model}
            {a.round > 1 ? ` · ${s.round} ${a.round}` : ''}
          </Text>
          <Text wrap="truncate-end">
            {'  '}
            {progress === null ? <Text dimColor>{ctxBar(ctx, barW)}</Text> : <Text color={color}>{ctxBar(progress * 100, barW)}</Text>}
            <Text dimColor>
              {' '}
              {steps}{s.ctx} {ctx}% · {fmtTokens(a.contextTokens)} ≈{fmtCost(a.costUsd)} {fmtTime(elapsed(a, at))}
            </Text>
          </Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold wrap="truncate-end">
            {title}
          </Text>
          {toggleCompact}
        </Box>
        <Text dimColor>
          ≈{fmtCost(t.cost)} · {fmtTokens(t.tokens)} {s.tokensWord} · {fmtTime(t.time)}
        </Text>
        {p.isCompact ? (
          <Text wrap="truncate-end">
            {[...running, ...finished].map(a => (
              <Text key={a.id} color={colorOf(tierOf(a.type))}>
                {STATUS_GLYPH[a.status]}{' '}
              </Text>
            ))}
            {planned.map(pl => (
              <Text key={`plan-${pl.n}`} dimColor>
                ◷{' '}
              </Text>
            ))}
          </Text>
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {isEmpty && <Text dimColor>{s.empty}</Text>}
            {running.length > 0 && <Text dimColor>{s.running} · {running.length}</Text>}
            {running.map(row)}
            {finished.length > 0 && toggleDone}
            {!p.isDoneCollapsed && finished.map(row)}
            {planned.length > 0 && <Text dimColor>{s.planned} · {planned.length}</Text>}
            {planned.map(pl => {
              const tier = pl.tier in TIER_COLOR ? pl.tier : 'other'
              return (
                <Box key={`plan-${pl.n}`} flexDirection="column" marginBottom={1}>
                  <Text dimColor wrap="truncate-end">
                    <Text color={colorOf(tier)}>▢</Text> {pl.n}. {pl.title} ◷
                  </Text>
                  <Text dimColor wrap="truncate-end">
                    {'  '}
                    {tierWord(tier)} · {tierModel(tier)}
                    {pl.after.length ? ` · ${s.after} ${pl.after.join(', ')}` : ''}
                  </Text>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const f = await read($, flow)
    if (f === null || e.props.hasSurvey) return next(e)
    // Draw this row with the other mods' bands beneath it. Claude Code's own placeholder ({ type: 'engine' }) is
    // never nested: the desktop drops a band that nests it.
    const drawn = await Promise.resolve(next(e)).catch(() => null)
    const below = drawn && typeof drawn === 'object' && (drawn as { type?: string }).type !== 'engine' ? drawn : null

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, agents)
    const crew = list.length + plannedOf(f, list).length
    const isWorking = list.some(a => a.status === 'running')
    const crewButton = (
      <Button key="relay-agents" label={`×${crew}`} plain onPress={() => void togglePane($)} />
    )
    const percent = `${Math.round(ratio(f) * 100)}%`
    const dismiss = (
      <Button
        key="relay-dismiss"
        label="✕"
        plain
        role="dismiss"
        onPress={() => update($, flow, () => null)}
      />
    )

    // The terminal's element table is completed with an `Svg` that draws nothing: test the surface too.
    if (e.surface !== 'terminal' && 'Svg' in ui) {
      const { Svg } = ui
      // About 8 CSS px per reported column; the rest is the count, the dismiss
      // and their gaps. No floor above the slot: a row wider than it would wrap.
      const width = Math.max(180, Math.min(1600, (e.props.bodyColumns || 100) * 8 - 96))
      const pk = resolvePack(await read($, pack))
      return (
        <Box flexDirection="column">
          <Box flexDirection={isRtl() ? 'row-reverse' : 'row'} alignItems="center" gap={1}>
            <Svg source={rowSvg(f, width, isWorking, pk)} alt={`${f.title}: ${label(f)}, ${percent}`} width={width} height={H} />
            {crewButton}
            {dismiss}
          </Box>
          {below}
        </Box>
      )
    }

    const cols = e.props.bodyColumns
    const titleW = Math.max(8, Math.min(30, f.title.length + 2, Math.floor(cols / 3)))
    const width = Math.max(6, Math.min(40, cols - titleW - 32))
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={2}>
          <Box width={titleW} flexShrink={0}>
            <Text color={f.isFinished ? DONE : ACCENT}>● </Text>
            <Text wrap="truncate-end">{f.title}</Text>
          </Box>
          <Text color={f.isFinished ? DONE : ACCENT}>{barText(f, width)}</Text>
          <Text bold>{label(f)}</Text>
          <Text dimColor>{percent}</Text>
          <Text color={CLAY}>▣</Text>
          {crewButton}
          {dismiss}
        </Box>
        {below}
      </Box>
    )
  })
}
