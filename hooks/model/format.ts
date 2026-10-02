// Text formatting shared by the panel, band and toasts.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const fmtTokens = (n: number): string => {
  if (n < 1000) return String(Math.round(n))
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

const two = (n: number) => String(n).padStart(2, '0')

export const fmtDuration = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`
}

export const fmtReset = (iso: string | undefined, now: number): string => {
  if (iso === undefined) return ''
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return ''
  const mins = Math.max(0, Math.round((at - now) / 60_000))
  if (mins >= 24 * 60) return DAYS[new Date(at).getDay()] ?? ''
  const h = Math.floor(mins / 60)
  return h > 0 ? `${h}h${two(mins % 60)}m` : `${mins}m`
}

export const fmtUsd = (n: number): string => `$${n.toFixed(2)}`

export const bar = (percent: number, width: number): string => {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  return '|'.repeat(filled) + ' '.repeat(width - filled)
}

export const rateLabel = (kind: string): string => {
  if (kind === 'five_hour') return '5H'
  if (kind === 'seven_day') return 'WEEK'
  if (kind === 'spend_limit') return 'SPEND'
  return kind.slice(0, 5).toUpperCase()
}

/** `claude-haiku-4-5-20251001` → `haiku-4-5`. */
export const shortModel = (model: string): string => model.replace(/^claude-/, '').replace(/-\d{8}$/, '')

/** The last two folders of a path, `~`-relative when that is as short. */
export const shortPath = (path: string): string => {
  const home = /^\/(?:Users|home)\/[^/]+/.exec(path)?.[0]
  const rel = home !== undefined ? `~${path.slice(home.length)}` : path
  const parts = rel.split('/').filter(Boolean)
  return parts.length <= 2 ? rel : `…/${parts.slice(-2).join('/')}`
}
