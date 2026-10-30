import { expect, mock, test } from 'claude-code/testing'

const PLUGIN = 'relay-panel'
const PROGRESS = 'mcp__relay-panel__progress'

const band = { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} }
const pane = { title: '', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } as const

const plan = {
  tool: PROGRESS,
  title: 'Ship the thing',
  phase: 'delegate',
  tasks: [
    { title: 'Write the parser', tier: 'careful' },
    { title: 'Wire the CLI', tier: 'light', after: [1] },
  ],
} as const

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: the band shows what the flow reports`, async ($, on) => {
    // Reporting a plan opens the panel by itself, once per flow.
    const opened: string[] = []
    on('ui.open', (_$, e) => {
      opened.push(e.id)
      return { value: { isPlaced: true } }
    })

    const reported = await $.tool.call(plan as never)
    expect(reported).toMatchObject({ result: 'ok: Tasks 0/2' })

    const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: band })
    // Two planned tasks, none started: the crew button counts both.
    expect((await ui.find({ key: 'relay-agents' }))?.props.label).toBe('×2')

    await $.tool.call({ tool: PROGRESS, done: 1 } as never)
    expect(opened).toEqual(['relay-agents'])
    expect(await $.tool.call({ tool: PROGRESS, finished: true } as never)).toMatchObject({ result: 'ok: Done' })
  })

  // The schema's enum and bounds are advice to the model: a call outside them must still draw.
  test(`${surface}: input outside the tool's schema cannot break the drawing`, async ($, on) => {
    on('ui.open', () => ({ value: { isPlaced: true } }))
    const tasks = [
      { title: 'Odd one', tier: '__proto__' },
      { title: 'Odd two', tier: 'constructor' },
      ...Array.from({ length: 500 }, (_, i) => ({ title: `Task ${i}`, tier: 'light' })),
    ]
    const reported = await $.tool.call({ tool: PROGRESS, title: 'Odd input', phase: 'delegate', tasks, total: 1e9 } as never)
    expect(reported).toMatchObject({ result: 'ok: Tasks 0/200' })

    const bar = await $.ui.mount({ plugin: PLUGIN, surface, component: 'AbovePrompt', props: band })
    expect((await bar.find({ key: 'relay-agents' }))?.props.label).toBe('×200')

    const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane', requestId: 'relay-agents', props: pane })
    expect(await ui.find({ text: /Planned · 200/ })).toBeDefined()
    const drawn = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
    expect(drawn).not.toContain('native code')
    expect(drawn).not.toContain('[object')
  })

  // The stored title is clipped, so the incoming one is clipped before the two are compared.
  test(`${surface}: a title past the cap is still the same flow`, async ($, on) => {
    on('ui.open', () => ({ value: { isPlaced: true } }))
    const long = 'L'.repeat(500)

    const first = await $.tool.call({ tool: PROGRESS, title: long, phase: 'delegate', total: 4, done: 2 } as never)
    expect(first).toMatchObject({ result: 'ok: Tasks 2/4' })

    // Repeating the long title keeps the counters instead of starting over at 0/0.
    expect(await $.tool.call({ tool: PROGRESS, title: long } as never)).toMatchObject({ result: 'ok: Tasks 2/4' })

    const started = await $.tool.call({ tool: PROGRESS, title: 'Another flow', phase: 'delegate', total: 3 } as never)
    expect(started).toMatchObject({ result: 'ok: Tasks 0/3' })
  })
}

// Every panel row draws a British Shorthair; no crab survives in the drawing.
test('desktop: a running relay worker draws as a cat in its costume', async ($, on) => {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('turn.complete', () => ({ text: '' }) as never)
  on('turn.step', async function* () {
    return { turnId: 'turn', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage: null } as never
  })
  await $.agent.spawn({ tool_use_id: 't1', prompt: 'p', description: 'Fix the parser bug', subagentType: 'relay:relay-medium', provider: 'engine', parentModel: 'claude-opus-5-5', background: true, fork: false } as never)

  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'relay-agents', props: pane })
  const drawn = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  expect(drawn).toContain('class="c-developer run"')
  expect(drawn).toContain('@keyframes cats-swish')
  // The crab stylesheet's fencing keyframes and class names are gone.
  expect(drawn).not.toMatch(/crab|@keyframes fence/i)
})
