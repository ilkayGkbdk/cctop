export type Level = 'ok' | 'warn' | 'crit'

export type RateWindow = { kind: string; percent: number; resetsAt?: string }

export type Meters = {
  model?: string
  ctxTokens?: number
  ctxWindow?: number
  ctxPercent?: number
  rate: RateWindow[]
  costUsd?: number
  turnCostUsd?: number
  cacheShare?: number
  tokPerSec: number
  peakTokPerSec: number
  isStreaming: boolean
}

export type AgentState = 'run' | 'wait' | 'done' | 'stopped'

export type ToolEntry = { id: string; tool: string; target: string; at: number }

export type AgentRow = {
  id: string
  type: string
  description: string
  model?: string
  state: AgentState
  startedAt: number
  endedAt?: number
  tokens: number
  tools: number
  now: string
  history: ToolEntry[]
}

export type MapCell = { color: string; isFilled: boolean }

export type MapCategory = { name: string; tokens: number; percent: number; color: string; kind: string }

export type MapSnapshot = {
  categories: MapCategory[]
  grid: MapCell[][]
  totalTokens: number
  maxTokens: number
  autoCompactPercent?: number
  at: number
  isStale: boolean
}

export type SortKey = 'start' | 'tokens' | 'time'

export type Confirm = { kind: 'stop'; agentId: string } | { kind: 'abort' } | null

export type UiState = { selected: string; sort: SortKey; expanded: string | null; confirm: Confirm }

export type AlertState = { ctx: boolean; rate: boolean }

declare module 'claude-code' {
  interface PluginState {
    cctop: {
      meters: Meters
      agents: AgentRow[]
      spark: number[]
      map: MapSnapshot | null
      ui: UiState
      stopped: string[]
      turnId: string | null
      alerts: AlertState
      startedAt: number
      bandHidden: boolean
    }
  }
}
