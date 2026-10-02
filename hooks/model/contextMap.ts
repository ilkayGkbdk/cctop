// The /context breakdown as the panel draws it.

import type { MapCell, MapSnapshot } from '../../types'

export type BreakdownLike = {
  categories: readonly { name: string; tokens: number; color: string; kind: string }[]
  totalTokens: number
  rawMaxTokens: number
  autoCompactThreshold?: number
  gridRows: readonly (readonly { color: string; isFilled: boolean }[])[]
}

export const toSnapshot = (b: BreakdownLike, at: number): MapSnapshot => {
  const max = Math.max(1, b.rawMaxTokens)
  return {
    categories: b.categories
      .filter(c => c.tokens > 0)
      .map(c => ({ name: c.name, tokens: c.tokens, percent: Math.round((c.tokens / max) * 100), color: c.color, kind: c.kind })),
    grid: b.gridRows.map(row => row.map(cell => ({ color: cell.color, isFilled: cell.isFilled }))),
    totalTokens: b.totalTokens,
    maxTokens: b.rawMaxTokens,
    ...(b.autoCompactThreshold !== undefined ? { autoCompactPercent: Math.round((b.autoCompactThreshold / max) * 100) } : {}),
    at,
    isStale: false,
  }
}

export const markStale = (m: MapSnapshot | null): MapSnapshot | null => (m === null ? null : { ...m, isStale: true })

export const runsOf = (row: readonly MapCell[]): { color: string; isFilled: boolean; count: number }[] => {
  const runs: { color: string; isFilled: boolean; count: number }[] = []
  for (const cell of row) {
    const last = runs[runs.length - 1]
    if (last !== undefined && last.color === cell.color && last.isFilled === cell.isFilled) last.count += 1
    else runs.push({ color: cell.color, isFilled: cell.isFilled, count: 1 })
  }
  return runs
}
