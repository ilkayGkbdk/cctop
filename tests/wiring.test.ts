import { expect, mock, test } from 'claude-code/testing'

const usage = (extra: object = {}) =>
  ({ value: { startedAt: 0, context: { window: 200000, tokens: 50000, percent: 25 }, rateLimits: [{ kind: 'five_hour', percentUsed: 30 }], cost: { usd: 1 }, ...extra } }) as never

test('measure toasts at the threshold; spawn and tool calls pass through', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  const toasts: string[] = []
  on('ui.toast', ($, e) => {
    toasts.push(String((e as { text?: unknown }).text ?? JSON.stringify(e)))
    return { value: undefined } as never
  })
  on('session.usage', () => usage())
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'ag-1' }))
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }) as never)

  await $.session.measure({ context: { window: 200000, tokens: 170000, percent: 85 }, rateLimits: [], cost: { usd: 2 }, changed: ['context'] } as never)
  expect(toasts.some(t => t.includes('context 85%'))).toBe(true)

  const spawned = await $.agent.spawn({ prompt: 'find', description: 'find jwt', subagentType: 'Explore' } as never)
  expect((spawned as { agentId?: string }).agentId).toBe('ag-1')

  const ran = await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(ran.deny).toBe(undefined)
})
