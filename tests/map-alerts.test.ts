import { expect, test } from 'claude-code/testing'

import { checkAlerts } from '../hooks/model/alerts'
import { markStale, runsOf, toSnapshot } from '../hooks/model/contextMap'
import { emptyMeters } from '../hooks/model/meters'

const breakdown = {
  categories: [
    { name: 'System prompt', tokens: 10000, color: 'promptBorder', kind: 'used' },
    { name: 'Messages', tokens: 50000, color: 'claude', kind: 'used' },
    { name: 'Free space', tokens: 140000, color: 'inactive', kind: 'free' },
    { name: 'Empty', tokens: 0, color: 'inactive', kind: 'used' },
  ],
  totalTokens: 60000,
  rawMaxTokens: 200000,
  autoCompactThreshold: 160000,
  gridRows: [[{ color: 'promptBorder', isFilled: true }, { color: 'claude', isFilled: true }, { color: 'claude', isFilled: true }, { color: 'inactive', isFilled: false }]],
}

test('toSnapshot computes percents, compact percent, drops empty categories', () => {
  const s = toSnapshot(breakdown, 42)
  expect(s.categories.map(c => [c.name, c.percent])).toEqual([['System prompt', 5], ['Messages', 25], ['Free space', 70]])
  expect(s.autoCompactPercent).toBe(80)
  expect(s.isStale).toBe(false)
  expect(s.at).toBe(42)
})

test('runsOf merges equal neighbours', () => {
  const s = toSnapshot(breakdown, 0)
  expect(runsOf(s.grid[0] ?? []).map(r => [r.color, r.count])).toEqual([['promptBorder', 1], ['claude', 2], ['inactive', 1]])
})

test('markStale', () => {
  expect(markStale(null)).toBe(null)
  expect(markStale(toSnapshot(breakdown, 0))?.isStale).toBe(true)
})

test('ctx alert fires once and re-arms below the threshold', () => {
  const cfg = { ctxWarnPercent: 80, rateWarnPercent: 90 }
  const hot = { ...emptyMeters(), ctxPercent: 81 }
  const first = checkAlerts({ ctx: false, rate: false }, hot, cfg)
  expect(first.fire.length).toBe(1)
  expect(checkAlerts(first.next, hot, cfg).fire.length).toBe(0)
  const cool = checkAlerts(first.next, { ...hot, ctxPercent: 50 }, cfg)
  expect(cool.next.ctx).toBe(false)
})

test('rate alert reads the five_hour window only', () => {
  const cfg = { ctxWarnPercent: 80, rateWarnPercent: 90 }
  const weekly = { ...emptyMeters(), rate: [{ kind: 'seven_day', percent: 95 }] }
  expect(checkAlerts({ ctx: false, rate: false }, weekly, cfg).fire.length).toBe(0)
  const five = { ...emptyMeters(), rate: [{ kind: 'five_hour', percent: 91 }] }
  expect(checkAlerts({ ctx: false, rate: false }, five, cfg).fire[0]).toContain('5-hour')
})

test('no data never fires', () => {
  expect(checkAlerts({ ctx: false, rate: false }, emptyMeters(), { ctxWarnPercent: 80, rateWarnPercent: 90 }).fire).toEqual([])
})
