import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { DEFAULT_PACK, packIds, resolvePack } from './packs'

const PLUGIN = 'relay-panel'
const PROGRESS = 'mcp__relay-panel__progress'
const band = { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} }
const pane = { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } as const

// Local time; the seasons are local. June is off season: the everyday pack (clawd by default) shows.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime()
const JUNE = at(2026, 6, 1, 12)

// A session with a flow, one running relay worker and one planned task.
// The plugin's store, kept here so a test can change it between session starts.
// `afters` records every `$.clock.after` wait the plugin asks for: there is no season timer, so none.
async function session($: Engine, on: On, store: Map<string, unknown> = new Map(), opened: string[] = [], now = JUNE, afters: number[] = []) {
  // Outer to the mock clock, so it sees each wait and passes it on.
  // (One hook per event name per `on`: the mock owns `clock.after`, so this stands on the namespace.)
  on('clock.*', async (_$, e, next) => {
    if (next.event === 'clock.after') afters.push((e as { ms: number }).ms)
    return next(e as never)
  })
  const clock = mock.clock(on, { now })
  on('store.get', (_$, e) => ({ value: store.get((e as { key: string }).key) }) as never)
  on('store.set', (_$, e) => {
    const { key, value } = e as { key: string; value: unknown }
    store.set(key, value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    store.delete((e as { key: string }).key)
    return { value: undefined } as never
  })
  mock.env(on, { LANG: 'en_US.UTF-8' })
  on('settings.read', async () => ({ value: {} }) as never)
  on('session.start', async () => ({ cwd: '/repo' }) as never)
  on('ui.open', (_$, e) => {
    const { id, title } = e as { id: string; title: string }
    opened.push(`${id}|${title}`)
    return { value: { isPlaced: true } }
  })
  on('tool.register', (_$, e) => ({ value: { tool: String((e as { name?: string }).name) } }) as never)
  on('command.register', (_$, e) => ({ value: { command: String((e as { name?: string }).name) } }) as never)
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  await $.session.start({ source: 'startup', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)
  await $.tool.call({ tool: PROGRESS, title: 'Ship it', phase: 'delegate', tasks: [{ title: 'Fix the parser bug', tier: 'medium' }, { title: 'Wire the CLI', tier: 'light' }] } as never)
  await $.agent.spawn({ tool_use_id: 't1', prompt: 'p', description: 'Fix the parser bug', subagentType: 'relay:relay-medium', provider: 'engine', parentModel: 'claude-opus-5-5', background: true, fork: false } as never)
  return clock
}

// Every Svg the band and the panel (full and compact) draw, joined.
async function drawn($: Engine): Promise<{ band: string; pane: string }> {
  const bar = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', props: band })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-agents', props: pane })
  const join = async (m: typeof ui | typeof bar) => (await m.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  const out = { band: await join(bar), pane: await join(ui) }
  await bar.unmount()
  await ui.unmount()
  return out
}

const scope = (id: string) => `<g class="p-${id}">`

test('pack: the band and the panel draw the default pack', async ($, on) => {
  await session($, on)
  const id = resolvePack(DEFAULT_PACK).id
  const { band: b, pane: p } = await drawn($)
  expect(b).toContain(scope(id))
  expect(b).toContain(resolvePack(id).css)
  expect(p).toContain(scope(id))
  expect(p).toContain(resolvePack(id).css)
})

test('pack: a stored everyday pack wins; an unknown one falls back to the default', async ($, on) => {
  const other = packIds().find(id => id !== DEFAULT_PACK)
  await session($, on, new Map([['everyday', other ?? 'no-such-pack']]))
  const { band: b } = await drawn($)
  expect(b).toContain(scope(other ?? DEFAULT_PACK))
})

// Only the plugin writes its atom; a test reaches it through the store the plugin
// loads it from. The band and the panel stay mounted: the write alone redraws them.
test('pack: writing another pack id to the atom redraws the mounted band and panel', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const other = packIds().find(id => id !== DEFAULT_PACK)
  // With one pack registered there is nothing to swap to: the default-pack test covers the drawing.
  if (!other) return
  const bar = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', props: band })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-agents', props: pane })
  const svgOf = async (m: typeof ui | typeof bar) => (await m.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  expect(await svgOf(bar)).toContain(scope(DEFAULT_PACK))
  expect(await svgOf(ui)).toContain(scope(DEFAULT_PACK))

  store.set('everyday', other)
  await $.session.start({ source: 'resume', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)

  const b = await svgOf(bar)
  const p = await svgOf(ui)
  expect(b).toContain(scope(other))
  expect(b).not.toContain(scope(DEFAULT_PACK))
  expect(p).toContain(scope(other))
  expect(p).not.toContain(scope(DEFAULT_PACK))
})

// --- swapping packs: the `pack` tool, /relay-pack and the gallery pane.

const PACK = 'mcp__relay-panel__pack'
const other = (): string | undefined => packIds().find(id => id !== DEFAULT_PACK)
const nameOf = (id: string) => resolvePack(id).name
const DEC = at(2026, 12, 10, 12)
const NOV = at(2026, 11, 20, 12)
const listOf = async ($: Engine): Promise<string[]> => ((await $.tool.call({ tool: PACK, action: 'list' } as never)) as { result: string }).result.split('\n')
const firstLine = async ($: Engine): Promise<string> => (await listOf($))[0]
const resume = ($: Engine) => $.session.start({ source: 'resume', cwd: '/repo', surface: 'desktop', isInteractive: true } as never)

const variantsOf = (id: string) => {
  const n = resolvePack(id).variants.length
  return `${n} ${n === 1 ? 'variant' : 'variants'}`
}

test('pack tool: list heads with the settings line, then every pack, the one showing marked', async ($, on) => {
  await session($, on)
  const [head, ...lines] = await listOf($)
  expect(head).toBe(`everyday: ${DEFAULT_PACK} · seasons on · showing: ${DEFAULT_PACK} · next: turkeys Nov 15`)
  expect(lines.length).toBe(packIds().length)
  for (const id of packIds()) {
    const p = resolvePack(id)
    const line = lines.find(l => l.startsWith(`${id}: `))
    expect(line).toBe(`${id}: ${p.name} (${p.variants.length} ${p.variants.length === 1 ? 'variant' : 'variants'})${id === DEFAULT_PACK ? ' (active)' : ''}`)
  }
  // A one-variant pack reads in the singular.
  expect(lines.find(l => l.startsWith('clawd: '))).toContain('(1 variant)')
})

test('pack tool: set stores the everyday pack and redraws the band and the panel', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const id = other()
  if (!id) return
  const bar = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', props: band })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-agents', props: pane })
  const svgOf = async (m: typeof ui | typeof bar) => (await m.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  expect(await svgOf(bar)).toContain(scope(DEFAULT_PACK))

  const r = await $.tool.call({ tool: PACK, action: 'set', id } as never)
  expect(r).toMatchObject({ result: `ok: everyday pack is ${nameOf(id)}` })
  expect(store.get('everyday')).toBe(id)
  // Out of season nothing is skipped.
  expect(store.has('skipSeason')).toBe(false)
  expect(await svgOf(bar)).toContain(scope(id))
  expect(await svgOf(bar)).not.toContain(scope(DEFAULT_PACK))
  expect(await svgOf(ui)).toContain(scope(id))
  expect(await svgOf(ui)).not.toContain(scope(DEFAULT_PACK))
  const lines = await listOf($)
  expect(lines[0]).toBe(`everyday: ${id} · seasons on · showing: ${id} · next: turkeys Nov 15`)
  expect(lines).toContain(`${id}: ${nameOf(id)} (${resolvePack(id).variants.length} ${resolvePack(id).variants.length === 1 ? 'variant' : 'variants'}) (active)`)
  await bar.unmount()
  await ui.unmount()
})

test('pack tool: an unknown id is refused, names the valid ids and stores nothing', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const r = (await $.tool.call({ tool: PACK, action: 'set', id: 'dragons' } as never)) as { deny: string }
  expect(r.deny).toContain('dragons')
  for (const id of ['auto', 'shuffle', ...packIds()]) expect(r.deny).toContain(id)
  expect(store.has('everyday')).toBe(false)
  const { band: b } = await drawn($)
  expect(b).toContain(scope(DEFAULT_PACK))
})

test('pack tool: preview opens the gallery pane', async ($, on) => {
  const opened: string[] = []
  await session($, on, new Map(), opened)
  const r = (await $.tool.call({ tool: PACK, action: 'preview' } as never)) as { result: string }
  expect(r.result).toContain('gallery')
  expect(opened).toContain('relay-packs|Sprite packs')
})

test('/relay-pack: no args lists, <id> sets, an unknown id is refused, preview opens the gallery', async ($, on) => {
  const store = new Map<string, unknown>()
  const opened: string[] = []
  await session($, on, store, opened)
  const list = await $.command.run({ command: 'relay-pack' } as never)
  expect(list.text).toContain(`${DEFAULT_PACK}: `)
  expect(list.text).toContain('(active)')
  expect(list.text?.split('\n')[0]).toBe(`everyday: ${DEFAULT_PACK} · seasons on · showing: ${DEFAULT_PACK} · next: turkeys Nov 15`)

  const bad = await $.command.run({ command: 'relay-pack', args: 'dragons' } as never)
  expect(bad.text).toContain('unknown pack "dragons"')
  expect(store.has('everyday')).toBe(false)

  const id = other()
  if (id) {
    const set = await $.command.run({ command: 'relay-pack', args: id } as never)
    expect(set.text).toBe(`ok: everyday pack is ${nameOf(id)}`)
    expect(store.get('everyday')).toBe(id)
  }

  const usage = await $.command.run({ command: 'relay-pack', args: 'seasons maybe' } as never)
  expect(usage.text).toBe('usage: /relay-pack seasons on|off')

  const prev = await $.command.run({ command: 'relay-pack', args: 'preview' } as never)
  expect(prev.text).toContain('gallery')
  expect(opened).toContain('relay-packs|Sprite packs')
})

test('/relay-pack: a stored pack that is gone is mentioned once', async ($, on) => {
  await session($, on, new Map([['everyday', 'dodos']]))
  const first = await $.command.run({ command: 'relay-pack' } as never)
  expect(first.text).toContain(`stored pack "dodos" is gone; using ${DEFAULT_PACK}`)
  const second = await $.command.run({ command: 'relay-pack' } as never)
  expect(second.text).not.toContain('is gone')
})

// --- migration from 0.2.x: the store key `pack` held `auto` or a pinned id.

test('migration: an old pin becomes the everyday pack with seasons on, and the old key goes', async ($, on) => {
  const store = new Map<string, unknown>([['pack', 'cats']])
  await session($, on, store, [], NOV)
  expect(store.has('pack')).toBe(false)
  expect(store.get('everyday')).toBe('cats')
  expect(store.get('seasons')).toBe(true)
  // Seasons on: turkeys show in season, cats the rest of the year.
  expect((await drawn($)).band).toContain(scope('turkeys'))
  expect(await firstLine($)).toBe('everyday: cats · seasons on · showing: turkeys · next: christmas Dec 1')
})

test('migration: an old pin shows all year out of season, and runs once', async ($, on) => {
  const store = new Map<string, unknown>([['pack', 'cats']])
  await session($, on, store)
  expect((await drawn($)).band).toContain(scope('cats'))
  // A later choice is not undone by a second session start.
  await $.command.run({ command: 'relay-pack', args: 'dogs' } as never)
  await resume($)
  expect(store.get('everyday')).toBe('dogs')
  expect((await drawn($)).band).toContain(scope('dogs'))
})

test('migration: an old `auto` sets nothing and leaves the options in charge', { options: { pack: 'dogs' } }, async ($, on) => {
  const store = new Map<string, unknown>([['pack', 'auto']])
  await session($, on, store)
  expect(store.has('pack')).toBe(false)
  expect(store.has('everyday')).toBe(false)
  expect(store.has('seasons')).toBe(false)
  expect((await drawn($)).band).toContain(scope('dogs'))
  expect(await firstLine($)).toBe('everyday: dogs · seasons on · showing: dogs · next: turkeys Nov 15')
})

test('migration: an old pin whose pack is gone is mentioned once', async ($, on) => {
  const store = new Map<string, unknown>([['pack', 'dodos']])
  await session($, on, store)
  expect(store.has('pack')).toBe(false)
  expect(store.has('everyday')).toBe(false)
  const first = await $.command.run({ command: 'relay-pack' } as never)
  expect(first.text).toContain(`stored pack "dodos" is gone; using ${DEFAULT_PACK}`)
})

test('options: the everyday pack option, and seasons off keeps it in December', { options: { pack: 'cats', seasons: 'off' } }, async ($, on) => {
  const afters: number[] = []
  await session($, on, new Map(), [], DEC, afters)
  expect((await drawn($)).band).toContain(scope('cats'))
  expect(afters.length).toBe(0)
  expect(await firstLine($)).toBe('everyday: cats · seasons off · showing: cats')
})

test('options: the store wins over the options', { options: { pack: 'cats', seasons: 'off' } }, async ($, on) => {
  const afters: number[] = []
  await session($, on, new Map<string, unknown>([['everyday', 'dogs'], ['seasons', true]]), [], DEC, afters)
  expect((await drawn($)).band).toContain(scope('christmas'))
  expect(afters.length).toBe(0)
  expect(await firstLine($)).toBe('everyday: dogs · seasons on · showing: christmas · next: turkeys Nov 15')
})

// --- seasons: holiday packs replace the everyday pack in season. The date is checked at
// session start and when a new flow starts; no timer, nothing per render or tick.

const newFlow = ($: Engine, title = 'Next thing') => $.tool.call({ tool: PROGRESS, title, phase: 'delegate', total: 1 } as never)

test('seasons: the faked clock picks the season, and no timer is armed', async ($, on) => {
  const afters: number[] = []
  await session($, on, new Map(), [], NOV, afters)
  const { band: b, pane: p } = await drawn($)
  expect(b).toContain(scope('turkeys'))
  expect(p).toContain(scope('turkeys'))
  expect(afters.length).toBe(0)
  expect(await firstLine($)).toBe(`everyday: ${DEFAULT_PACK} · seasons on · showing: turkeys · next: christmas Dec 1`)
})

test('seasons: a session started Nov 14 shows the everyday pack; a new flow on Nov 15 shows turkeys', async ($, on) => {
  const afters: number[] = []
  const clock = await session($, on, new Map(), [], at(2026, 11, 14, 23, 59), afters)
  const bar = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', props: band })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-agents', props: pane })
  const svgOf = async (m: typeof ui | typeof bar) => (await m.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  expect(await svgOf(bar)).toContain(scope(DEFAULT_PACK))

  // The season starts; the clock ticking and redraws change nothing.
  await clock.set(at(2026, 11, 15, 0, 5))
  await clock.settle()
  expect(await svgOf(bar)).toContain(scope(DEFAULT_PACK))

  // The same flow's later progress calls do not re-resolve.
  expect(await $.tool.call({ tool: PROGRESS, done: 1 } as never)).toMatchObject({ result: 'ok: Tasks 1/2' })
  expect(await $.tool.call({ tool: PROGRESS, title: 'Ship it', phase: 'review' } as never)).toMatchObject({ result: 'ok: Review 1/2' })
  expect(await svgOf(bar)).toContain(scope(DEFAULT_PACK))
  expect(await svgOf(ui)).toContain(scope(DEFAULT_PACK))

  // A new flow re-resolves: the band and the panel swap to turkeys.
  expect(await newFlow($)).toMatchObject({ result: 'ok: Tasks 0/1' })
  expect(await svgOf(bar)).toContain(scope('turkeys'))
  expect(await svgOf(bar)).not.toContain(scope(DEFAULT_PACK))
  expect(await svgOf(ui)).toContain(scope('turkeys'))
  expect(afters.length).toBe(0)
  await bar.unmount()
  await ui.unmount()
})

test('seasons: the first call after a finished flow is a new flow and re-resolves', async ($, on) => {
  const clock = await session($, on, new Map(), [], at(2026, 11, 30, 23, 59))
  expect((await drawn($)).band).toContain(scope('turkeys'))
  await $.tool.call({ tool: PROGRESS, finished: true } as never)
  await clock.set(at(2026, 12, 1, 0, 1))
  await clock.settle()
  expect((await drawn($)).band).toContain(scope('turkeys'))
  await $.tool.call({ tool: PROGRESS, phase: 'plan' } as never)
  expect((await drawn($)).band).toContain(scope('christmas'))
})

test('seasons: a progress call from a worker never re-resolves', async ($, on) => {
  const clock = await session($, on, new Map(), [], at(2026, 11, 14, 23, 59))
  await clock.set(at(2026, 11, 15, 0, 1))
  const r = await $.tool.call({ tool: PROGRESS, title: 'Hijack', agentId: 'a1' } as never)
  expect(r).toMatchObject({ result: 'ignored: only the main session reports the flow' })
  expect((await drawn($)).band).toContain(scope(DEFAULT_PACK))
})

test('seasons: December draws christmas', async ($, on) => {
  await session($, on, new Map(), [], DEC)
  expect((await drawn($)).band).toContain(scope('christmas'))
})

test('seasons off: shows the everyday pack in December; auto turns them on again; the store keeps it', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store, [], DEC)
  const off = await $.tool.call({ tool: PACK, action: 'seasons', on: false } as never)
  expect(off).toMatchObject({ result: `ok: seasons off; showing ${nameOf(DEFAULT_PACK)}` })
  expect(store.get('seasons')).toBe(false)
  expect((await drawn($)).band).toContain(scope(DEFAULT_PACK))
  expect(await firstLine($)).toBe(`everyday: ${DEFAULT_PACK} · seasons off · showing: ${DEFAULT_PACK}`)

  const auto = await $.command.run({ command: 'relay-pack', args: 'auto' } as never)
  expect(auto.text).toBe(`ok: seasons on; showing ${nameOf('christmas')}`)
  expect(store.get('seasons')).toBe(true)
  expect((await drawn($)).band).toContain(scope('christmas'))

  const offCmd = await $.command.run({ command: 'relay-pack', args: 'seasons off' } as never)
  expect(offCmd.text).toBe(`ok: seasons off; showing ${nameOf(DEFAULT_PACK)}`)
  // Stored: the next session keeps seasons off.
  await resume($)
  expect(await firstLine($)).toBe(`everyday: ${DEFAULT_PACK} · seasons off · showing: ${DEFAULT_PACK}`)
})

test('seasons off: the season start passes and a new flow keeps the everyday pack', async ($, on) => {
  const clock = await session($, on, new Map(), [], at(2026, 11, 14, 23, 59))
  await $.command.run({ command: 'relay-pack', args: 'seasons off' } as never)
  await clock.set(at(2026, 11, 15, 0, 1))
  await clock.settle()
  await newFlow($)
  expect((await drawn($)).band).toContain(scope(DEFAULT_PACK))
})

// --- picking a pack in season skips that season, this year only.

test('set during a season shows the pick now and skips the season until it ends', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store, [], DEC)
  expect((await drawn($)).band).toContain(scope('christmas'))
  const r = await $.command.run({ command: 'relay-pack', args: 'cats' } as never)
  expect(r.text).toBe(`ok: ${nameOf('cats')} now; ${nameOf('christmas')} skipped until Dec 31`)
  expect(store.get('everyday')).toBe('cats')
  expect(store.get('skipSeason')).toBe('christmas:2026')
  expect((await drawn($)).band).toContain(scope('cats'))
  expect(await firstLine($)).toBe('everyday: cats · seasons on · showing: cats · christmas skipped until Dec 31 · next: turkeys Nov 15')
})

test('a skip holds in a later session of the same season', async ($, on) => {
  const store = new Map<string, unknown>([['everyday', 'cats'], ['skipSeason', 'christmas:2026']])
  await session($, on, store, [], at(2026, 12, 20, 12))
  expect((await drawn($)).band).toContain(scope('cats'))
  expect(store.get('skipSeason')).toBe('christmas:2026')
})

test('a stale skip is ignored and cleared at session start', async ($, on) => {
  // Next year's Christmas shows again.
  const store = new Map<string, unknown>([['everyday', 'cats'], ['skipSeason', 'christmas:2026']])
  await session($, on, store, [], at(2027, 12, 2, 12))
  expect((await drawn($)).band).toContain(scope('christmas'))
  expect(store.has('skipSeason')).toBe(false)
})

test('a skip from a season that is over is cleared out of season too', async ($, on) => {
  const store = new Map<string, unknown>([['everyday', 'cats'], ['skipSeason', 'christmas:2026']])
  await session($, on, store, [], at(2027, 6, 1, 12))
  expect((await drawn($)).band).toContain(scope('cats'))
  expect(store.has('skipSeason')).toBe(false)
})

test('set during turkeys skips turkeys only: Christmas still comes on Dec 1', async ($, on) => {
  const store = new Map<string, unknown>()
  const clock = await session($, on, store, [], at(2026, 11, 30, 23, 59))
  const r = (await $.tool.call({ tool: PACK, action: 'set', id: 'dogs' } as never)) as { result: string }
  expect(r.result).toBe(`ok: ${nameOf('dogs')} now; ${nameOf('turkeys')} skipped until Nov 30`)
  expect((await drawn($)).band).toContain(scope('dogs'))
  await clock.set(at(2026, 12, 1))
  await clock.settle()
  await newFlow($)
  expect((await drawn($)).band).toContain(scope('christmas'))
})

test('seasons on lifts a skip, so the season shows again', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store, [], DEC)
  await $.command.run({ command: 'relay-pack', args: 'cats' } as never)
  expect((await drawn($)).band).toContain(scope('cats'))
  const r = await $.command.run({ command: 'relay-pack', args: 'seasons on' } as never)
  expect(r.text).toBe(`ok: seasons on; showing ${nameOf('christmas')}`)
  expect(store.has('skipSeason')).toBe(false)
  expect((await drawn($)).band).toContain(scope('christmas'))
})

test('set with seasons off in December skips nothing', async ($, on) => {
  const store = new Map<string, unknown>([['seasons', false]])
  await session($, on, store, [], DEC)
  const r = await $.command.run({ command: 'relay-pack', args: 'cats' } as never)
  expect(r.text).toBe(`ok: everyday pack is ${nameOf('cats')}`)
  expect(store.has('skipSeason')).toBe(false)
})

// --- shuffle: one pick per session, never a holiday pack, never the same twice running.
// The plugin picks with Math.random; packs/seasons.test.ts pins the draw. Here every
// assertion holds whatever the draw.

const EVERYDAY = ['cats', 'clawd', 'dogs']

test('shuffle: one pick per session; consecutive sessions differ; a new flow does not re-pick', async ($, on) => {
  // Dec 31 with Christmas skipped: the shuffle pick shows.
  const store = new Map<string, unknown>([['everyday', 'shuffle'], ['skipSeason', 'christmas:2026']])
  const clock = await session($, on, store, [], at(2026, 12, 31, 23, 58))
  const first = String(store.get('lastShuffle'))
  expect(EVERYDAY).toContain(first)
  expect((await drawn($)).band).toContain(scope(first))
  expect(await firstLine($)).toBe(`everyday: shuffle (cats, clawd, dogs) · seasons on · showing: ${first} · christmas skipped until Dec 31 · next: turkeys Nov 15`)

  // Next session: last session's pick is left out.
  await resume($)
  const second = String(store.get('lastShuffle'))
  expect(EVERYDAY).toContain(second)
  expect(second).not.toBe(first)
  expect((await drawn($)).band).toContain(scope(second))

  // Past midnight, new flows re-resolve without a new pick. Nor does a redraw pick.
  await clock.set(at(2027, 1, 1, 0, 1))
  await clock.settle()
  await newFlow($)
  await newFlow($, 'And another')
  expect(store.get('lastShuffle')).toBe(second)
  expect((await drawn($)).band).toContain(scope(second))
  expect((await drawn($)).band).toContain(scope(second))
  expect(store.get('lastShuffle')).toBe(second)
})

test('shuffle [ids]: stores the list, picks now, and a second shuffle picks the other', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const r = await $.command.run({ command: 'relay-pack', args: 'shuffle cats dogs' } as never)
  const first = String(store.get('lastShuffle'))
  expect(['cats', 'dogs']).toContain(first)
  expect(r.text).toBe(`ok: shuffling cats, dogs; ${nameOf(first)} now`)
  expect(store.get('everyday')).toBe('shuffle')
  expect(store.get('shuffleList')).toEqual(['cats', 'dogs'])
  expect((await drawn($)).band).toContain(scope(first))
  expect(await firstLine($)).toBe(`everyday: shuffle (cats, dogs) · seasons on · showing: ${first} · next: turkeys Nov 15`)

  const again = (await $.tool.call({ tool: PACK, action: 'shuffle', ids: ['cats', 'dogs'] } as never)) as { result: string }
  const second = first === 'cats' ? 'dogs' : 'cats'
  expect(again.result).toBe(`ok: shuffling cats, dogs; ${nameOf(second)} now`)
  expect((await drawn($)).band).toContain(scope(second))

  // `set shuffle` shuffles every non-holiday pack.
  const all = (await $.tool.call({ tool: PACK, action: 'set', id: 'shuffle' } as never)) as { result: string }
  expect(all.result).toMatch(/^ok: shuffling cats, clawd, dogs; .+ now$/)
  expect(store.get('shuffleList')).toEqual([])
  expect(store.get('lastShuffle')).not.toBe(second)
})

test('shuffle: holiday and unknown ids are refused, naming the valid ones; nothing is stored', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const r = await $.command.run({ command: 'relay-pack', args: 'shuffle turkeys dragons' } as never)
  expect(r.text).toBe('cannot shuffle "turkeys" (holiday pack), "dragons" (unknown); valid ids: cats, clawd, dogs')
  const t = (await $.tool.call({ tool: PACK, action: 'shuffle', ids: ['christmas'] } as never)) as { deny: string }
  expect(t.deny).toContain('"christmas" (holiday pack)')
  expect(store.has('everyday')).toBe(false)
  expect(store.has('shuffleList')).toBe(false)
})

test('shuffle during a season skips it, like set', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store, [], DEC)
  const r = (await $.tool.call({ tool: PACK, action: 'shuffle' } as never)) as { result: string }
  const pick = String(store.get('lastShuffle'))
  expect(EVERYDAY).toContain(pick)
  expect(r.result).toBe(`ok: shuffling cats, clawd, dogs; ${nameOf(pick)} now; ${nameOf('christmas')} skipped until Dec 31`)
  expect(store.get('skipSeason')).toBe('christmas:2026')
  expect((await drawn($)).band).toContain(scope(pick))
})

// --- the gallery: holiday dates, Everyday, Showing; Use sets the everyday pack.

test('gallery: one card per pack, labelled; Use sets the everyday pack', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-packs', props: pane })
  const cards = async () => (await ui.findAll({ type: 'Svg' })).map(el => ({ alt: String(el.props.alt), source: String(el.props.source) }))
  const altOf = (c: { alt: string; source: string }[], id: string) => c.find(x => x.source.includes(scope(id)))?.alt
  let c = await cards()
  expect(c.length).toBe(packIds().length)
  for (const id of packIds()) {
    const card = c.find(x => x.source.includes(scope(id)))
    expect(card).toBeDefined()
    // Six sprites, one per role.
    expect(card?.source.split(scope(id)).length).toBe(7)
  }
  expect(altOf(c, DEFAULT_PACK)?.endsWith(', Everyday · Showing')).toBe(true)
  expect(altOf(c, 'turkeys')?.endsWith(', Holiday · Nov 15-30')).toBe(true)
  expect(altOf(c, 'christmas')?.endsWith(', Holiday · December')).toBe(true)
  expect(altOf(c, 'cats')).toBe(`${nameOf('cats')}: ${variantsOf('cats')}`)

  expect(await ui.find({ key: `use-${DEFAULT_PACK}` })).toBeUndefined()
  await ui.press({ key: 'use-cats' })
  expect(store.get('everyday')).toBe('cats')
  c = await cards()
  expect(altOf(c, 'cats')?.endsWith(', Everyday · Showing')).toBe(true)
  expect(altOf(c, DEFAULT_PACK)).toBe(`${nameOf(DEFAULT_PACK)}: ${variantsOf(DEFAULT_PACK)}`)
  expect(await ui.find({ key: `use-${DEFAULT_PACK}` })).toBeDefined()
  expect(await ui.find({ key: 'use-cats' })).toBeUndefined()
  await ui.unmount()
})

test('gallery: in December the holiday card is Showing and the everyday card Everyday', async ($, on) => {
  await session($, on, new Map(), [], DEC)
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-packs', props: pane })
  const c = (await ui.findAll({ type: 'Svg' })).map(el => ({ alt: String(el.props.alt), source: String(el.props.source) }))
  const altOf = (id: string) => c.find(x => x.source.includes(scope(id)))?.alt
  expect(altOf('christmas')?.endsWith(', Holiday · December · Showing')).toBe(true)
  expect(altOf(DEFAULT_PACK)?.endsWith(', Everyday')).toBe(true)
  await ui.unmount()
})

test('options: a legacy `auto` option reads as the default everyday pack', { options: { pack: 'auto' } }, async ($, on) => {
  await session($, on)
  expect((await drawn($)).band).toContain(scope(DEFAULT_PACK))
  expect(await firstLine($)).toBe(`everyday: ${DEFAULT_PACK} · seasons on · showing: ${DEFAULT_PACK} · next: turkeys Nov 15`)
})
