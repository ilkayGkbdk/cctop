// Threshold toasts: fire once per crossing, re-arm when the value drops back.

import type { AlertState, Meters } from '../../types'

export const checkAlerts = (
  prev: AlertState,
  m: Meters,
  cfg: { ctxWarnPercent: number; rateWarnPercent: number },
): { next: AlertState; fire: string[] } => {
  const fire: string[] = []
  const next = { ...prev }

  if (m.ctxPercent !== undefined) {
    const isHot = m.ctxPercent >= cfg.ctxWarnPercent
    if (isHot && !prev.ctx) fire.push(`cctop: context ${m.ctxPercent}% — compaction is near. /compact now, or /cctop to see what fills it.`)
    next.ctx = isHot
  }

  const five = m.rate.find(r => r.kind === 'five_hour')
  if (five !== undefined) {
    const isHot = five.percent >= cfg.rateWarnPercent
    if (isHot && !prev.rate) fire.push(`cctop: 5-hour limit ${five.percent}% used.`)
    next.rate = isHot
  }

  return { next, fire }
}
