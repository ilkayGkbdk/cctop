// Live speed (tok/s over a sliding window) and the per-turn cost sparkline.

export type SpeedSample = { at: number; tokens: number }

export const WINDOW_MS = 3000
const BLOCKS = '▁▂▃▄▅▆▇█'

export const estimateTokens = (text: string): number => Math.max(1, Math.round(text.length / 4))

export const addSample = (samples: SpeedSample[], at: number, tokens: number): SpeedSample[] => [
  ...samples.filter(s => at - s.at <= WINDOW_MS),
  { at, tokens },
]

export const tokPerSec = (samples: SpeedSample[], now: number): number => {
  const live = samples.filter(s => now - s.at <= WINDOW_MS)
  const first = live[0]
  if (first === undefined) return 0
  const total = live.reduce((n, s) => n + s.tokens, 0)
  const seconds = Math.max(1000, now - first.at) / 1000
  return Math.round(total / seconds)
}

export const pushSpark = (ring: number[], value: number, size = 30): number[] => [...ring, value].slice(-size)

export const sparkline = (ring: readonly number[]): string => {
  const max = Math.max(0, ...ring)
  return ring.map(v => (max <= 0 ? BLOCKS[0] : BLOCKS[Math.min(7, Math.floor((v / max) * 7.999))])).join('')
}
