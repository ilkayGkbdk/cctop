import { expect, test } from 'claude-code/testing'

const run = (args: string) =>
  ({ command: 'cctop', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } }) as never

test('/cctop opens the panel', async ($, on) => {
  const opened: string[] = []
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } } as never
  })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 }, rateLimits: [] } }) as never)
  const out = await $.command.run(run(''))
  expect(opened).toContain('cctop')
  expect(out.text).toContain('cctop')
})
