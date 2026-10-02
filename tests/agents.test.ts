import { expect, test } from 'claude-code/testing'

import { MAIN, STOP_MESSAGE, canStop, clearsFinished, denyFor, labelOf, mainRow, reduce, sortRows, targetOf } from '../hooks/model/agents'
import type { AgentRow } from '../types'

const spawned = (): AgentRow[] =>
  reduce([mainRow(0)], { type: 'spawn', id: 'ag-1', subagentType: 'Explore', description: 'find jwt', model: 'haiku', at: 1000 })

test('spawn adds a running row after main', () => {
  const rows = spawned()
  expect(rows.map(r => r.id)).toEqual([MAIN, 'ag-1'])
  expect(rows[1]?.state).toBe('run')
  expect(rows[1]?.type).toBe('Explore')
})

test('tool updates now, count and history; toolDone sets wait', () => {
  let rows = reduce(spawned(), { type: 'tool', id: 'ag-1', entry: { id: 't1', tool: 'Grep', target: 'JwtOptions', at: 2000 } })
  expect(rows[1]?.now).toBe('Grep JwtOptions')
  expect(rows[1]?.tools).toBe(1)
  rows = reduce(rows, { type: 'toolDone', id: 'ag-1' })
  expect(rows[1]?.state).toBe('wait')
})

test('history keeps the last 20', () => {
  let rows = spawned()
  for (let i = 0; i < 25; i++) rows = reduce(rows, { type: 'tool', id: 'ag-1', entry: { id: `t${i}`, tool: 'Read', target: `f${i}`, at: i } })
  expect(rows[1]?.history.length).toBe(20)
  expect(rows[1]?.history[0]?.target).toBe('f5')
})

test('an unknown agent is created lazily (tool before spawn)', () => {
  const rows = reduce([mainRow(0)], { type: 'tool', id: 'ag-x', entry: { id: 't', tool: 'Read', target: 'a.ts', at: 5 } })
  expect(rows.map(r => r.id)).toEqual([MAIN, 'ag-x'])
  expect(rows[1]?.type).toBe('agent')
})

test('a later spawn fills in a lazily created row', () => {
  let rows = reduce([mainRow(0)], { type: 'tool', id: 'ag-x', entry: { id: 't', tool: 'Read', target: 'a.ts', at: 5 } })
  rows = reduce(rows, { type: 'spawn', id: 'ag-x', subagentType: 'Plan', description: 'plan', at: 4 })
  expect(rows.length).toBe(2)
  expect(rows[1]?.type).toBe('Plan')
  expect(rows[1]?.tools).toBe(1)
})

test('complete: subagent done, main waits', () => {
  let rows = reduce(spawned(), { type: 'complete', id: 'ag-1', at: 9000 })
  expect(rows[1]?.state).toBe('done')
  expect(rows[1]?.endedAt).toBe(9000)
  rows = reduce(rows, { type: 'step', id: MAIN, at: 9500 })
  rows = reduce(rows, { type: 'complete', id: MAIN, at: 9600 })
  expect(rows[0]?.state).toBe('wait')
})

test('stop marks stopped and complete keeps it stopped', () => {
  let rows = reduce(spawned(), { type: 'stop', id: 'ag-1', at: 3000 })
  rows = reduce(rows, { type: 'complete', id: 'ag-1', at: 4000 })
  expect(rows[1]?.state).toBe('stopped')
})

test('prompt drops finished subagents and keeps running ones', () => {
  let rows = reduce(spawned(), { type: 'spawn', id: 'ag-2', subagentType: 'Plan', description: 'p', at: 1 })
  rows = reduce(rows, { type: 'complete', id: 'ag-2', at: 2 })
  rows = reduce(rows, { type: 'prompt', at: 3 })
  expect(rows.map(r => r.id)).toEqual([MAIN, 'ag-1'])
  expect(rows[0]?.state).toBe('run')
})

test('usage sets tokens; step sets run and thinking', () => {
  let rows = reduce(spawned(), { type: 'usage', id: 'ag-1', tokens: 12700 })
  rows = reduce(rows, { type: 'step', id: 'ag-1', at: 10 })
  expect(rows[1]?.tokens).toBe(12700)
  expect(rows[1]?.now).toBe('thinking…')
})

test('sortRows keeps main first', () => {
  let rows = spawned()
  rows = reduce(rows, { type: 'spawn', id: 'ag-2', subagentType: 'Plan', description: 'p', at: 500 })
  rows = reduce(rows, { type: 'usage', id: 'ag-2', tokens: 99 })
  expect(sortRows(rows, 'start', 0).map(r => r.id)).toEqual([MAIN, 'ag-2', 'ag-1'])
  expect(sortRows(rows, 'tokens', 0).map(r => r.id)).toEqual([MAIN, 'ag-2', 'ag-1'])
})

test('labelOf numbers subagents by spawn order', () => {
  const rows = reduce(spawned(), { type: 'spawn', id: 'ag-2', subagentType: 'Plan', description: 'p', at: 2000 })
  expect(labelOf(rows, MAIN)).toBe('main')
  expect(labelOf(rows, 'ag-2')).toBe('a2')
})

test('canStop only for running/waiting subagents', () => {
  const rows = spawned()
  expect(canStop(rows[0])).toBe(false)
  expect(canStop(rows[1])).toBe(true)
  expect(canStop(reduce(rows, { type: 'complete', id: 'ag-1', at: 1 })[1])).toBe(false)
  expect(canStop(undefined)).toBe(false)
})

test('denyFor only denies stopped subagents', () => {
  expect(denyFor(['ag-1'], 'ag-1')).toBe(STOP_MESSAGE)
  expect(denyFor(['ag-1'], 'ag-2')).toBe(undefined)
  expect(denyFor(['ag-1'], undefined)).toBe(undefined)
})

test('targetOf', () => {
  expect(targetOf('Read', { file_path: '/a/b.ts' })).toBe('/a/b.ts')
  expect(targetOf('Bash', { command: 'npm test' })).toBe('npm test')
  expect(targetOf('Grep', { pattern: 'Jwt' })).toBe('"Jwt"')
  expect(targetOf('mcp__x__y', {})).toBe('')
})

test('prompt keeps stopped subagents until they complete', () => {
  let rows = reduce(spawned(), { type: 'stop', id: 'ag-1', at: 2 })
  rows = reduce(rows, { type: 'prompt', at: 3 })
  expect(rows.find(r => r.id === 'ag-1')?.state).toBe('stopped')
})

test('a stopped subagent leaves the list once it has completed', () => {
  let rows = reduce(spawned(), { type: 'stop', id: 'ag-1', at: 2 })
  rows = reduce(rows, { type: 'complete', id: 'ag-1', at: 3 })
  rows = reduce(rows, { type: 'prompt', at: 4 })
  expect(rows.map(r => r.id)).toEqual([MAIN])
})

test('only prompts a person sends clear finished agents', () => {
  expect(clearsFinished({ kind: 'composer' })).toBe(true)
  expect(clearsFinished({ kind: 'sdk' })).toBe(true)
  expect(clearsFinished({ kind: 'task-notification' })).toBe(false)
})
