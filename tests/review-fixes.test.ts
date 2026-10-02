// Regression tests for the final-review findings.

import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'cctop', props: { title: 'cctop', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 40, contentRows: 40 } } as never, viewport: { columns: 140, rows: 45 } } as const
const run = (args: string) => ({ command: 'cctop', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 140 } }) as never
const BREAKDOWN = { categories: [{ name: 'Messages', tokens: 85000, color: 'claude', kind: 'used' }], totalTokens: 85000, rawMaxTokens: 200000, gridRows: [[{ color: 'claude', isFilled: true }]] }

type UsageMode = 'ok' | 'reject' | 'none'

const setup = (on: On, mode: () => UsageMode, seenColumns: number[] = []) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.cwd', () => ({ value: '/work/api' }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.focus', () => ({}) as never)
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'ag-1' }))
  on('session.usage', ($, e) => {
    const args = e as { breakdown?: string; columns?: number }
    if (args.breakdown !== undefined) {
      seenColumns.push(args.columns ?? -1)
      if (mode() === 'reject') throw new Error('unavailable')
      if (mode() === 'none') return { value: { startedAt: 1, context: { window: 200000 }, rateLimits: [] } } as never
    }
    return { value: { startedAt: 1, context: { window: 200000, tokens: 50000, percent: 25, ...(args.breakdown !== undefined ? { breakdown: BREAKDOWN } : {}) }, rateLimits: [] } } as never
  })
  return clock
}

test('the map asks for the wide grid (>= 80 columns)', async ($, on) => {
  const seen: number[] = []
  setup(on, () => 'ok', seen)
  await $.command.run(run(''))
  expect(seen.length > 0).toBe(true)
  expect(seen.every(c => c >= 80)).toBe(true)
})

test('first open with no breakdown shows measuring…', async ($, on) => {
  setup(on, () => 'none')
  await $.command.run(run(''))
  const ui = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...PANE })
  expect(await ui.find({ text: /measuring…/ })).toBeDefined()
  await ui.unmount()
})

for (const failure of ['reject', 'none'] as const) {
  test(`map turns stale when the breakdown is ${failure === 'reject' ? 'rejected' : 'missing'}`, async ($, on) => {
    let mode: UsageMode = 'ok'
    const clock = setup(on, () => mode)
    await $.command.run(run(''))
    const ui = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...PANE })
    expect(await ui.find({ text: /Messages/ })).toBeDefined()
    mode = failure
    await clock.advance(2100)
    expect(await ui.find({ text: /\(stale\)/ })).toBeDefined()
    expect(await ui.find({ text: /Messages/ })).toBeDefined()
    await ui.unmount()
  })
}

test('focusing a row with Tab selects it', async ($, on) => {
  const clock = setup(on, () => 'ok')
  await $.agent.spawn({ prompt: 'p', description: 'd', subagentType: 'Explore' } as never)
  await $.command.run(run(''))
  await clock.advance(300)
  const ui = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...PANE })
  await $.ui.focus({ component: 'Pane', requestId: 'cctop', plugin: 'cctop', element: 'row-ag-1', origin: { kind: 'person' } } as never)
  await ui.press({ key: 'stop' })
  expect(await ui.find({ key: 'yes' })).toBeDefined()
  await ui.unmount()
})

const STEP = { turnId: 't1', index: 0, model: 'opus', messageCount: 1 } as never

test('turn.step forwards every chunk and returns the result; tool input counts toward tok/s', async ($, on) => {
  const clock = setup(on, () => 'ok')
  const chunks = [
    { kind: 'tool', index: 0, id: 'tu1', name: 'Write' },
    { kind: 'input', index: 0, json: '{"content":"' + 'x'.repeat(400) + '"}' },
    { kind: 'stop', stopReason: 'tool_use', usage: { input_tokens: 10, output_tokens: 120, cache_read_input_tokens: 900, cache_creation_input_tokens: 0, model: 'opus' } },
  ]
  const result = { turnId: 't1', index: 0, answer: '', toolUses: [], stopReason: 'tool_use', usage: null }
  on('turn.step', async function* () {
    for (const c of chunks) yield c as never
    return result as never
  })
  const stream = $.turn.step(STEP) as unknown as AsyncGenerator<unknown, unknown>
  const seen: unknown[] = []
  let out = await stream.next()
  while (out.done !== true) {
    seen.push(out.value)
    out = await stream.next()
  }
  expect(seen).toEqual(chunks)
  expect(out.value).toEqual(result)
  await $.command.run(run(''))
  await clock.advance(300)
  const ui = await $.ui.mount({ plugin: 'cctop', surface: 'terminal', ...PANE })
  expect(await ui.find({ text: /[1-9]\d* tok\/s/ })).toBeDefined()
  expect(await ui.find({ text: /1\.0k/ })).toBeDefined()
  await ui.unmount()
})

test('closing the turn.step stream early closes the stream beneath', async ($, on) => {
  setup(on, () => 'ok')
  let closed = false
  on('turn.step', async function* () {
    try {
      yield { kind: 'text', index: 0, text: 'a' } as never
      yield { kind: 'text', index: 0, text: 'b' } as never
      return { turnId: 't1', index: 0, answer: 'ab', toolUses: [], stopReason: 'end_turn', usage: null } as never
    } finally {
      closed = true
    }
  })
  const stream = $.turn.step(STEP) as unknown as AsyncGenerator<unknown, unknown>
  await stream.next()
  await stream.return(undefined)
  expect(closed).toBe(true)
})
