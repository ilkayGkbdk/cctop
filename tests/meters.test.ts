import { expect, test } from 'claude-code/testing'

import { configOf } from '../hooks/model/config'
import { bar, fmtDuration, fmtReset, fmtTokens, fmtUsd, rateLabel, shortModel, shortPath } from '../hooks/model/format'
import { applyMeasure, emptyMeters, levelOf } from '../hooks/model/meters'

test('fmtTokens', () => {
  expect(fmtTokens(950)).toBe('950')
  expect(fmtTokens(9800)).toBe('9.8k')
  expect(fmtTokens(112000)).toBe('112k')
  expect(fmtTokens(1_250_000)).toBe('1.3M')
})

test('fmtDuration', () => {
  expect(fmtDuration(41_000)).toBe('0:41')
  expect(fmtDuration(724_000)).toBe('12:04')
  expect(fmtDuration(2_537_000)).toBe('42:17')
  expect(fmtDuration(3_725_000)).toBe('1:02:05')
})

test('fmtReset', () => {
  const now = Date.UTC(2026, 9, 2, 12, 0, 0)
  expect(fmtReset(new Date(now + 2 * 3_600_000 + 14 * 60_000).toISOString(), now)).toBe('2h14m')
  expect(fmtReset(new Date(now + 45 * 60_000).toISOString(), now)).toBe('45m')
  expect(fmtReset(new Date(now + 3 * 86_400_000).toISOString(), now)).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
  expect(fmtReset(undefined, now)).toBe('')
})

test('fmtUsd and bar', () => {
  expect(fmtUsd(3.4199)).toBe('$3.42')
  expect(bar(50, 10)).toBe('|||||     ')
  expect(bar(0, 4)).toBe('    ')
  expect(bar(150, 4)).toBe('||||')
})

test('rateLabel', () => {
  expect(rateLabel('five_hour')).toBe('5H')
  expect(rateLabel('seven_day')).toBe('WEEK')
  expect(rateLabel('spend_limit')).toBe('SPEND')
})

test('levelOf uses 60 and the warn threshold', () => {
  expect(levelOf(59, 80)).toBe('ok')
  expect(levelOf(60, 80)).toBe('warn')
  expect(levelOf(80, 80)).toBe('crit')
})

test('configOf fills defaults and clamps', () => {
  expect(configOf({})).toEqual({ band: true, ctxWarnPercent: 80, rateWarnPercent: 90, mapPollMs: 2000 })
  expect(configOf({ band: false, ctxWarnPercent: 150, mapPollMs: 10 })).toEqual({ band: false, ctxWarnPercent: 100, rateWarnPercent: 90, mapPollMs: 500 })
})

test('applyMeasure with subscription data', () => {
  const m = applyMeasure(emptyMeters(), {
    context: { tokens: 112000, window: 200000, percent: 56 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 27, resetsAt: '2026-10-02T14:00:00Z' }],
    cost: { usd: 3.42 },
  })
  expect(m.ctxPercent).toBe(56)
  expect(m.rate).toEqual([{ kind: 'five_hour', percent: 27, resetsAt: '2026-10-02T14:00:00Z' }])
  expect(m.costUsd).toBe(3.42)
})

test('applyMeasure without subscription or ledger keeps fields absent', () => {
  const m = applyMeasure(emptyMeters(), { context: { window: 200000 }, rateLimits: [] })
  expect(m.rate).toEqual([])
  expect(m.costUsd).toBe(undefined)
  expect(m.ctxPercent).toBe(undefined)
  expect(m.ctxWindow).toBe(200000)
})

test('shortModel drops the vendor prefix and date suffix', () => {
  expect(shortModel('claude-haiku-4-5-20251001')).toBe('haiku-4-5')
  expect(shortModel('claude-opus-5-5')).toBe('opus-5-5')
  expect(shortModel('gpt-x')).toBe('gpt-x')
})

test('shortPath keeps the last two folders', () => {
  expect(shortPath('/Users/me/Development/Projects/claude-mods/playground')).toBe('…/claude-mods/playground')
  expect(shortPath('/Users/me/api')).toBe('~/api')
  expect(shortPath('/srv/app')).toBe('/srv/app')
})
