import { expect, test } from 'claude-code/testing'

import { addSample, estimateTokens, pushSpark, sparkline, tokPerSec } from '../hooks/model/speed'

test('estimateTokens is ~4 chars per token, at least 1', () => {
  expect(estimateTokens('')).toBe(1)
  expect(estimateTokens('abcdefgh')).toBe(2)
})

test('tokPerSec over the sliding window', () => {
  let s = addSample([], 0, 50)
  s = addSample(s, 1000, 50)
  s = addSample(s, 2000, 50)
  expect(tokPerSec(s, 2000)).toBe(75)
  expect(tokPerSec(s, 10_000)).toBe(0)
})

test('addSample drops samples older than the window', () => {
  const s = addSample(addSample([], 0, 10), 5000, 10)
  expect(s.length).toBe(1)
})

test('a single burst counts over at least one second', () => {
  expect(tokPerSec(addSample([], 0, 40), 0)).toBe(40)
})

test('pushSpark keeps the last N', () => {
  const ring = [1, 2, 3].reduce((r, v) => pushSpark(r, v, 2), [] as number[])
  expect(ring).toEqual([2, 3])
})

test('sparkline scales to the max', () => {
  expect(sparkline([])).toBe('')
  expect(sparkline([0, 0])).toBe('▁▁')
  expect(sparkline([1, 8])).toBe('▁█')
  expect(sparkline([4, 8]).length).toBe(2)
})
