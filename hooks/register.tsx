// cctop: htop for Claude Code. Only this file touches `$`.

import type { EngineInterface, Register } from 'claude-code'

type $ = EngineInterface

const PANE = 'cctop'

async function openPanel($: $) {
  await $.ui.open({ id: PANE, title: 'cctop', focus: true, closeOnEscape: true, rows: 30, columns: 100 })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'cctop', description: 'htop for Claude Code: context, limits, speed, cost, agents', argumentHint: '[band]' })
    return next(e)
  })

  on('command.run', { command: 'cctop' }, async $ => {
    await openPanel($)
    return { text: 'cctop opened.' }
  })
}
