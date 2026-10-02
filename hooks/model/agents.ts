// The process list: main + subagents, driven by engine events.

import type { AgentRow, SortKey, ToolEntry } from '../../types'

export const MAIN = 'main'
export const HISTORY = 20
export const STOP_MESSAGE = 'Stopped by the user via cctop. Do not call more tools; reply with what you have so far.'

export type AgentAction =
  | { type: 'spawn'; id: string; subagentType: string; description: string; model?: string; at: number }
  | { type: 'step'; id: string; at: number }
  | { type: 'usage'; id: string; tokens: number }
  | { type: 'tool'; id: string; entry: ToolEntry }
  | { type: 'toolDone'; id: string }
  | { type: 'complete'; id: string; at: number }
  | { type: 'stop'; id: string; at: number }
  | { type: 'prompt'; at: number }

export const mainRow = (now: number): AgentRow => ({
  id: MAIN, type: 'claude', description: 'main', state: 'wait', startedAt: now, tokens: 0, tools: 0, now: '—', history: [],
})

const blank = (id: string, at: number): AgentRow => ({
  id, type: 'agent', description: '', state: 'run', startedAt: at, tokens: 0, tools: 0, now: 'starting…', history: [],
})

const isOver = (row: AgentRow) => row.state === 'done' || row.state === 'stopped'

const upsert = (rows: AgentRow[], id: string, at: number, fn: (row: AgentRow) => AgentRow): AgentRow[] =>
  rows.some(r => r.id === id) ? rows.map(r => (r.id === id ? fn(r) : r)) : [...rows, fn(blank(id, at))]

export const reduce = (rows: AgentRow[], a: AgentAction): AgentRow[] => {
  switch (a.type) {
    case 'spawn':
      return upsert(rows, a.id, a.at, r => ({
        ...r, type: a.subagentType, description: a.description, startedAt: Math.min(r.startedAt, a.at),
        ...(a.model !== undefined ? { model: a.model } : {}),
      }))
    case 'step':
      return upsert(rows, a.id, a.at, r => (isOver(r) ? r : { ...r, state: 'run', now: 'thinking…' }))
    case 'usage':
      return upsert(rows, a.id, 0, r => ({ ...r, tokens: a.tokens }))
    case 'tool':
      return upsert(rows, a.id, a.entry.at, r => ({
        ...r, state: isOver(r) ? r.state : 'run', tools: r.tools + 1,
        now: `${a.entry.tool} ${a.entry.target}`.trim(), history: [...r.history, a.entry].slice(-HISTORY),
      }))
    case 'toolDone':
      return rows.map(r => (r.id === a.id && !isOver(r) ? { ...r, state: 'wait' } : r))
    case 'complete':
      return rows.map(r => {
        if (r.id !== a.id) return r
        if (r.id === MAIN) return { ...r, state: 'wait', now: '—' }
        return r.state === 'stopped' ? { ...r, isClosed: true } : { ...r, state: 'done', endedAt: a.at, now: '—', isClosed: true }
      })
    case 'stop':
      return rows.map(r => (r.id === a.id ? { ...r, state: 'stopped', endedAt: a.at, now: 'stopped' } : r))
    case 'prompt':
      return rows.filter(r => r.id === MAIN || r.isClosed !== true).map(r => (r.id === MAIN ? { ...r, state: 'run', now: 'thinking…' } : r))
  }
}

const elapsed = (r: AgentRow, now: number) => (r.endedAt ?? now) - r.startedAt

export const sortRows = (rows: AgentRow[], key: SortKey, now: number): AgentRow[] => {
  const main = rows.filter(r => r.id === MAIN)
  const rest = rows.filter(r => r.id !== MAIN)
  const by =
    key === 'tokens' ? (a: AgentRow, b: AgentRow) => b.tokens - a.tokens
    : key === 'time' ? (a: AgentRow, b: AgentRow) => elapsed(b, now) - elapsed(a, now)
    : (a: AgentRow, b: AgentRow) => a.startedAt - b.startedAt
  return [...main, ...[...rest].sort(by)]
}

export const labelOf = (rows: AgentRow[], id: string): string => {
  if (id === MAIN) return 'main'
  const order = rows.filter(r => r.id !== MAIN).sort((a, b) => a.startedAt - b.startedAt)
  return `a${order.findIndex(r => r.id === id) + 1}`
}

export const canStop = (row: AgentRow | undefined): boolean =>
  row !== undefined && row.id !== MAIN && (row.state === 'run' || row.state === 'wait')

export const denyFor = (stopped: readonly string[], agentId: string | undefined): string | undefined =>
  agentId !== undefined && stopped.includes(agentId) ? STOP_MESSAGE : undefined

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

export const targetOf = (tool: string, args: Record<string, unknown>): string => {
  const path = str(args.file_path) ?? str(args.notebook_path) ?? str(args.path)
  if (path !== undefined) return path
  if (tool === 'Bash') return str(args.command)?.split('\n')[0] ?? ''
  if (tool === 'Grep' || tool === 'Glob') return `"${str(args.pattern) ?? ''}"`
  if (tool === 'WebFetch') return str(args.url) ?? ''
  if (tool === 'WebSearch') return str(args.query) ?? ''
  if (tool === 'Agent' || tool === 'Task') return str(args.description) ?? ''
  return ''
}
