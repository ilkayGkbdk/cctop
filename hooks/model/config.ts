// userConfig values with defaults and sane bounds.

export type Config = { band: boolean; ctxWarnPercent: number; rateWarnPercent: number; mapPollMs: number }

const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback

export const configOf = (options: Readonly<Record<string, unknown>>): Config => ({
  band: typeof options.band === 'boolean' ? options.band : true,
  ctxWarnPercent: num(options.ctxWarnPercent, 80, 1, 100),
  rateWarnPercent: num(options.rateWarnPercent, 90, 1, 100),
  mapPollMs: num(options.mapPollMs, 2000, 500, 60_000),
})
