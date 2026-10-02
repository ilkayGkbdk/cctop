import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'cctop', props: { title: 'cctop', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 40, contentRows: 40 } } as never, viewport: { columns: 140, rows: 45 } } as const
const NARROW = { ...PANE, props: { ...(PANE.props as object), bodyColumns: 60 } as never }
const BAND = { component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4, contentRows: 1 }, view: {} } as never, viewport: { columns: 100, rows: 40 } } as const

const setup = (on: On, withRates: boolean) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.cwd', () => ({ value: '/work/api' }) as never)
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: {
        window: 200000, tokens: 112000, percent: 56,
        breakdown: { categories: [{ name: 'Messages', tokens: 85000, color: 'claude', kind: 'used' }, { name: 'Free space', tokens: 88000, color: 'inactive', kind: 'free' }], totalTokens: 112000, rawMaxTokens: 200000, gridRows: [[{ color: 'claude', isFilled: true }, { color: 'inactive', isFilled: false }]], autoCompactThreshold: 160000 },
      },
      rateLimits: withRates ? [{ kind: 'five_hour', percentUsed: 27 }, { kind: 'seven_day', percentUsed: 41 }] : [],
      ...(withRates ? { cost: { usd: 3.42 } } : {}),
    },
  }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'ag-1' }))
  return clock
}

const run = (args: string) => ({ command: 'cctop', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 140 } }) as never
const measure = (withRates: boolean) =>
  ({ context: { window: 200000, tokens: 112000, percent: 56 }, rateLimits: withRates ? [{ kind: 'five_hour', percentUsed: 27 }, { kind: 'seven_day', percentUsed: 41 }] : [], ...(withRates ? { cost: { usd: 3.42 } } : {}), changed: ['context'] }) as never

test('panel shows meters, map, agents on terminal and desktop', async ($, on) => {
  const clock = setup(on, true)
  await $.session.measure(measure(true))
  await $.agent.spawn({ prompt: 'p', description: 'find jwt', subagentType: 'Explore' } as never)
  await $.command.run(run(''))
  await clock.advance(300)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'cctop', surface, ...PANE })
    expect(await ui.find({ text: /CTX/ })).toBeDefined()
    expect(await ui.find({ text: /56%/ })).toBeDefined()
    expect(await ui.find({ text: /5H/ })).toBeDefined()
    expect(await ui.find({ text: /\$3\.42/ })).toBeDefined()
    expect(await ui.find({ text: /Messages/ })).toBeDefined()
    expect(await ui.find({ text: /Explore/ })).toBeDefined()
    await ui.unmount()
  }
})

test('no subscription hides rate rows and cost', async ($, on) => {
  const clock = setup(on, false)
  await $.session.measure(measure(false))
  await $.command.run(run(''))
  const ui = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...PANE })
  expect(await ui.find({ text: /5H/ })).toBe(undefined)
  expect(await ui.find({ text: /\$/ })).toBe(undefined)
  expect(await ui.find({ text: /undefined|NaN/ })).toBe(undefined)
  await ui.unmount()
  const band = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /CTX 56%/ })).toBeDefined()
  expect(await band.find({ text: /5H/ })).toBe(undefined)
  await band.unmount()
})

test('narrow panel hides the grid but keeps the legend', async ($, on) => {
  const clock = setup(on, true)
  await $.session.measure(measure(true))
  await $.command.run(run(''))
  const ui = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...NARROW })
  expect(await ui.find({ text: /█/ })).toBe(undefined)
  expect(await ui.find({ text: /Messages/ })).toBeDefined()
  await ui.unmount()
})

test('x on main toasts instead of confirming; stop flow on a subagent', async ($, on) => {
  const clock = setup(on, true)
  await $.session.measure(measure(true))
  await $.agent.spawn({ prompt: 'p', description: 'find jwt', subagentType: 'Explore' } as never)
  await $.command.run(run(''))
  await clock.advance(300)
  const ui = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...PANE })
  await ui.press({ key: 'stop' })
  expect(await ui.find({ text: /Stop a1\?/ })).toBe(undefined)
  await ui.press({ key: 'row-ag-1' })
  await ui.press({ key: 'stop' })
  expect(await ui.find({ text: /Stop a1/ })).toBeDefined()
  await ui.press({ key: 'yes' })
  await clock.advance(300)
  expect(await ui.find({ text: /stopped/ })).toBeDefined()
  await ui.unmount()
})

test('band mini bar uses glyphs common terminal fonts have', async ($, on) => {
  const clock = setup(on, true)
  await $.session.measure(measure(true))
  await clock.advance(10)
  const band = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /[▮▯]/ })).toBe(undefined)
  expect(await band.find({ text: /CTX 56% █+░+/ })).toBeDefined()
  await band.unmount()
})

test('wide panel shows full category names', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('session.cwd', () => ({ value: '/work/api' }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('session.usage', () => ({ value: { startedAt: 1, context: { window: 200000, tokens: 1000, percent: 1, breakdown: { categories: [{ name: 'MCP server instructions', tokens: 1200, color: 'claude', kind: 'used' }], totalTokens: 1200, rawMaxTokens: 200000, gridRows: [[{ color: 'claude', isFilled: true }]] } }, rateLimits: [] } }) as never)
  await $.command.run(run(''))
  const ui = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...PANE })
  expect(await ui.find({ text: /MCP server instructions/ })).toBeDefined()
  await ui.unmount()
})
