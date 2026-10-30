import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import { DEFAULT_PACK, packIds, resolvePack } from './packs'

const PLUGIN = 'relay-panel'
const PROGRESS = 'mcp__relay-panel__progress'
const band = { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} }
const pane = { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } as const

// A session with a flow, one running relay worker and one planned task.
// The plugin's store, kept here so a test can change it between session starts.
async function session($: Engine, on: On, store: Map<string, unknown> = new Map(), opened: string[] = []) {
  mock.clock(on)
  on('store.get', (_$, e) => ({ value: store.get((e as { key: string }).key) }) as never)
  on('store.set', (_$, e) => {
    const { key, value } = e as { key: string; value: unknown }
    store.set(key, value)
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

test('pack: a stored pack id wins; an unknown one falls back to the default', async ($, on) => {
  const other = packIds().find(id => id !== DEFAULT_PACK)
  await session($, on, new Map([['pack', other ?? 'no-such-pack']]))
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

  store.set('pack', other)
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

test('pack tool: list names every pack and marks the active one', async ($, on) => {
  await session($, on)
  const r = (await $.tool.call({ tool: PACK, action: 'list' } as never)) as { result: string }
  const lines = r.result.split('\n')
  expect(lines.length).toBe(packIds().length)
  for (const id of packIds()) {
    const p = resolvePack(id)
    const line = lines.find(l => l.startsWith(`${id}: `))
    expect(line).toBe(`${id}: ${p.name} (${p.variants.length} variants)${id === DEFAULT_PACK ? ' (active)' : ''}`)
  }
})

test('pack tool: set stores the id and redraws the band and the panel', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const id = other()
  if (!id) return
  const bar = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'AbovePrompt', props: band })
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-agents', props: pane })
  const svgOf = async (m: typeof ui | typeof bar) => (await m.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  expect(await svgOf(bar)).toContain(scope(DEFAULT_PACK))

  const r = await $.tool.call({ tool: PACK, action: 'set', id } as never)
  expect(r).toMatchObject({ result: `ok: active pack is ${resolvePack(id).name}` })
  expect(store.get('pack')).toBe(id)
  expect(await svgOf(bar)).toContain(scope(id))
  expect(await svgOf(bar)).not.toContain(scope(DEFAULT_PACK))
  expect(await svgOf(ui)).toContain(scope(id))
  expect(await svgOf(ui)).not.toContain(scope(DEFAULT_PACK))
  const listed = (await $.tool.call({ tool: PACK, action: 'list' } as never)) as { result: string }
  expect(listed.result).toContain(`${id}: ${resolvePack(id).name} (${resolvePack(id).variants.length} variants) (active)`)
})

test('pack tool: an unknown id is refused, names the valid ids and stores nothing', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const r = (await $.tool.call({ tool: PACK, action: 'set', id: 'dragons' } as never)) as { deny: string }
  expect(r.deny).toContain('dragons')
  for (const id of packIds()) expect(r.deny).toContain(id)
  expect(store.has('pack')).toBe(false)
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

  const bad = await $.command.run({ command: 'relay-pack', args: 'dragons' } as never)
  expect(bad.text).toContain('unknown pack "dragons"')
  expect(store.has('pack')).toBe(false)

  const id = other()
  if (id) {
    const set = await $.command.run({ command: 'relay-pack', args: id } as never)
    expect(set.text).toBe(`ok: active pack is ${resolvePack(id).name}`)
    expect(store.get('pack')).toBe(id)
  }

  const prev = await $.command.run({ command: 'relay-pack', args: 'preview' } as never)
  expect(prev.text).toContain('gallery')
  expect(opened).toContain('relay-packs|Sprite packs')
})

test('/relay-pack: a stored pack that is gone is mentioned once', async ($, on) => {
  await session($, on, new Map([['pack', 'dodos']]))
  const first = await $.command.run({ command: 'relay-pack' } as never)
  expect(first.text).toContain(`stored pack "dodos" is gone; using ${DEFAULT_PACK}`)
  const second = await $.command.run({ command: 'relay-pack' } as never)
  expect(second.text).not.toContain('is gone')
})

test('gallery: one card per pack, Active on the active one, Use swaps', async ($, on) => {
  const store = new Map<string, unknown>()
  await session($, on, store)
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-packs', props: pane })
  const cards = async () => (await ui.findAll({ type: 'Svg' })).map(el => ({ alt: String(el.props.alt), source: String(el.props.source) }))
  let c = await cards()
  expect(c.length).toBe(packIds().length)
  for (const id of packIds()) {
    const card = c.find(x => x.source.includes(scope(id)))
    expect(card).toBeDefined()
    // Seven sprites, one per costume.
    expect(card?.source.split(scope(id)).length).toBe(8)
    expect(card?.alt.endsWith(', Active')).toBe(id === DEFAULT_PACK)
  }
  const id = other()
  if (!id) return
  expect(await ui.find({ key: `use-${DEFAULT_PACK}` })).toBeUndefined()
  await ui.press({ key: `use-${id}` })
  expect(store.get('pack')).toBe(id)
  c = await cards()
  expect(c.find(x => x.source.includes(scope(id)))?.alt.endsWith(', Active')).toBe(true)
  expect(c.find(x => x.source.includes(scope(DEFAULT_PACK)))?.alt.endsWith(', Active')).toBe(false)
  expect(await ui.find({ key: `use-${DEFAULT_PACK}` })).toBeDefined()
  await ui.unmount()
})
