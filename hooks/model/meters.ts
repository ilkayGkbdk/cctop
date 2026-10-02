// The header meters: engine measurements → plain values.

import type { Level, Meters } from '../../types'

export const COLOR: Record<Level, string> = { ok: 'green', warn: 'yellow', crit: 'red' }

export const levelOf = (percent: number, warnAt: number): Level => (percent >= warnAt ? 'crit' : percent >= 60 ? 'warn' : 'ok')

export const emptyMeters = (): Meters => ({ rate: [], tokPerSec: 0, peakTokPerSec: 0, isStreaming: false })

export type MeasureLike = {
  context: { tokens?: number; window: number; percent?: number }
  rateLimits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}

export const applyMeasure = (m: Meters, e: MeasureLike): Meters => ({
  ...m,
  ctxWindow: e.context.window,
  ...(e.context.tokens !== undefined ? { ctxTokens: e.context.tokens } : {}),
  ...(e.context.percent !== undefined ? { ctxPercent: e.context.percent } : {}),
  rate: e.rateLimits.map(r => ({ kind: r.kind, percent: r.percentUsed, ...(r.resetsAt !== undefined ? { resetsAt: r.resetsAt } : {}) })),
  ...(e.cost !== undefined ? { costUsd: e.cost.usd } : {}),
})
