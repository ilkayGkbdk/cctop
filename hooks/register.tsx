// cctop: htop for Claude Code. Only this file touches `$`: it turns engine
// events into model updates held in $.state, and wires the views' buttons.
// Every hook passes the event on unchanged, except tool calls of a subagent
// the user stopped.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRow, AlertState, MapSnapshot, Meters, UiState } from '../types'
import { checkAlerts } from './model/alerts'
import { configOf } from './model/config'
import type { Config } from './model/config'
import { markStale, toSnapshot } from './model/contextMap'
import { MAIN, canStop, denyFor, mainRow, reduce, targetOf } from './model/agents'
import type { AgentAction } from './model/agents'
import { applyMeasure, emptyMeters } from './model/meters'
import { addSample, estimateTokens, pushSpark, tokPerSec } from './model/speed'
import type { SpeedSample } from './model/speed'
import { Band } from './view/Band'
import { Panel } from './view/Panel'

type $ = EngineInterface

const PANE = 'cctop'
const FLUSH_MS = 250

const metersA = atom({ plugin: 'cctop', key: 'meters' } as const, emptyMeters())
const agentsA = atom({ plugin: 'cctop', key: 'agents' } as const, [] as AgentRow[])
const sparkA = atom({ plugin: 'cctop', key: 'spark' } as const, [] as number[])
const mapA = atom({ plugin: 'cctop', key: 'map' } as const, null as MapSnapshot | null)
const uiA = atom({ plugin: 'cctop', key: 'ui' } as const, { selected: MAIN, sort: 'start', expanded: null, confirm: null } as UiState)
const stoppedA = atom({ plugin: 'cctop', key: 'stopped' } as const, [] as string[])
const turnIdA = atom({ plugin: 'cctop', key: 'turnId' } as const, null as string | null)
const alertsA = atom({ plugin: 'cctop', key: 'alerts' } as const, { ctx: false, rate: false } as AlertState)
const startedAtA = atom({ plugin: 'cctop', key: 'startedAt' } as const, 0)
const bandHiddenA = atom({ plugin: 'cctop', key: 'bandHidden' } as const, false)

// Module variables reset on a hot reload; they only buffer what the next
// flush writes to $.state.
let cfg: Config = configOf({})
let samples: SpeedSample[] = []
let pendingActions: AgentAction[] = []
let pendingStreaming: boolean | undefined
let pendingModel: string | undefined
let flushTimer: { cancel: () => void } | undefined
let mapTimer: { cancel: () => void } | undefined
let costAtTurnStart: number | undefined

async function flush($: $) {
  flushTimer = undefined
  const now = await $.clock.now()
  const actions = pendingActions
  pendingActions = []
  if (actions.length > 0) await update($, agentsA, rows => actions.reduce(reduce, rows.length > 0 ? rows : [mainRow(now)]))
  const speed = tokPerSec(samples, now)
  const streaming = pendingStreaming
  const model = pendingModel
  pendingStreaming = undefined
  await update($, metersA, m => ({
    ...m,
    tokPerSec: speed,
    peakTokPerSec: Math.max(m.peakTokPerSec, speed),
    ...(streaming !== undefined ? { isStreaming: streaming } : {}),
    ...(model !== undefined ? { model } : {}),
  }))
  if (speed > 0 || streaming === true) await scheduleFlush($)
}

async function scheduleFlush($: $) {
  if (flushTimer !== undefined) return
  flushTimer = await $.clock.after(FLUSH_MS, () => void flush($).catch(() => undefined))
}

async function act($: $, action: AgentAction) {
  pendingActions.push(action)
  await scheduleFlush($)
}

async function seed($: $) {
  const usage = await $.session.usage()
  await update($, startedAtA, () => usage.startedAt)
  await update($, metersA, m => applyMeasure(m, usage.context ? { context: usage.context, rateLimits: usage.rateLimits, ...(usage.cost ? { cost: usage.cost } : {}) } : { context: { window: 0 }, rateLimits: [] }))
  const now = await $.clock.now()
  await update($, agentsA, rows => (rows.length > 0 ? rows : [mainRow(now)]))
}

async function pollMap($: $) {
  try {
    const usage = await $.session.usage({ breakdown: 'summary', columns: 60 })
    const b = usage.context.breakdown
    if (b === undefined) return
    const now = await $.clock.now()
    await update($, mapA, () => toSnapshot(b, now))
  } catch {
    await update($, mapA, markStale)
  }
}

async function ensureMapTimer($: $) {
  if (mapTimer !== undefined) return
  mapTimer = await $.clock.every(cfg.mapPollMs, () => void pollMap($).catch(() => undefined))
}

async function openPanel($: $) {
  await pollMap($)
  await $.ui.open({ id: PANE, title: 'cctop', focus: true, closeOnEscape: true, rows: 30, columns: 100 })
}

async function doSelect($: $, id: string) {
  await update($, uiA, ui => (ui.selected === id ? { ...ui, expanded: ui.expanded === id ? null : id } : { ...ui, selected: id, confirm: null }))
}

async function doSort($: $) {
  await update($, uiA, (ui): UiState => ({ ...ui, sort: ui.sort === 'start' ? 'tokens' : ui.sort === 'tokens' ? 'time' : 'start' }))
}

async function askStop($: $) {
  const ui = await read($, uiA)
  const rows = await read($, agentsA)
  if (!canStop(rows.find(r => r.id === ui.selected))) {
    $.ui.toast('cctop: select a running subagent first (Tab), then x.')
    return
  }
  await update($, uiA, (u): UiState => ({ ...u, confirm: { kind: 'stop', agentId: ui.selected } }))
}

async function askAbort($: $) {
  if ((await read($, turnIdA)) === null) {
    $.ui.toast('cctop: no turn is running.')
    return
  }
  await update($, uiA, (u): UiState => ({ ...u, confirm: { kind: 'abort' } }))
}

async function doConfirm($: $) {
  const { confirm } = await read($, uiA)
  await update($, uiA, u => ({ ...u, confirm: null }))
  if (confirm === null) return
  if (confirm.kind === 'stop') {
    await update($, stoppedA, s => [...s, confirm.agentId])
    await act($, { type: 'stop', id: confirm.agentId, at: await $.clock.now() })
    return
  }
  const turnId = await read($, turnIdA)
  if (turnId !== null) await $.turn.abort({ turnId }).catch(() => $.ui.toast('cctop: that turn already ended.'))
}

async function doCancel($: $) {
  await update($, uiA, u => ({ ...u, confirm: null }))
}

async function doCompact($: $) {
  if ((await read($, turnIdA)) !== null) {
    $.ui.toast('cctop: wait for the turn to finish, then c.')
    return
  }
  await $.command.run({ command: 'compact' })
}

async function doClose($: $) {
  mapTimer?.cancel()
  mapTimer = undefined
  await $.ui.close({ id: PANE })
}

export const register: Register = (on, options) => {
  cfg = configOf(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'cctop', description: 'htop for Claude Code: context, limits, speed, cost, agents', argumentHint: '[band]' })
    await seed($).catch(() => undefined)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    try {
      const meters = await update($, metersA, m => applyMeasure(m, e))
      const { next: alerts, fire } = checkAlerts(await read($, alertsA), meters, cfg)
      await update($, alertsA, () => alerts)
      for (const text of fire) $.ui.toast(text)
    } catch {
      // never stand in the engine's way
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, stoppedA, () => []).catch(() => undefined)
    await act($, { type: 'prompt', at: await $.clock.now() }).catch(() => undefined)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, turnIdA, () => e.turnId).catch(() => undefined)
    costAtTurnStart = (await read($, metersA).catch(() => emptyMeters())).costUsd
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const id = e.agentId ?? MAIN
    pendingStreaming = true
    pendingModel = e.agentId === undefined ? e.model : pendingModel
    await act($, { type: 'step', id, at: await $.clock.now() }).catch(() => undefined)
    const stream = next(e)
    while (true) {
      const item = await stream.next()
      if (item.done === true) return item.value
      const chunk = item.value
      if (chunk.kind === 'text' || chunk.kind === 'thinking') {
        samples = addSample(samples, await $.clock.now(), estimateTokens(chunk.text))
      } else if (chunk.kind === 'stop' && chunk.usage !== null) {
        const u = chunk.usage
        pendingActions.push({ type: 'usage', id, tokens: u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens + u.output_tokens })
      }
      yield chunk
    }
  })

  on('turn.complete', async ($, e, next) => {
    try {
      const id = e.agentId ?? MAIN
      await act($, { type: 'complete', id, at: await $.clock.now() })
      if (e.agentId === undefined) {
        pendingStreaming = false
        await update($, turnIdA, () => null)
        const usage = await $.session.usage()
        const cost = usage.cost?.usd
        const turnCost = cost !== undefined && costAtTurnStart !== undefined ? Math.max(0, cost - costAtTurnStart) : undefined
        if (turnCost !== undefined) await update($, sparkA, ring => pushSpark(ring, turnCost))
        const u = e.usage
        const input = u === undefined ? 0 : u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
        await update($, metersA, m => ({
          ...m,
          ...(turnCost !== undefined ? { turnCostUsd: turnCost } : {}),
          ...(u !== undefined && input > 0 ? { cacheShare: Math.round((u.cache_read_input_tokens / input) * 100) } : {}),
        }))
      }
    } catch {
      // as above
    }
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined && result.agentId !== undefined) {
      await act($, { type: 'spawn', id: result.agentId, subagentType: e.subagentType, description: e.description, model: result.model, at: await $.clock.now() }).catch(() => undefined)
    }
    return result
  })

  on('tool.call', async ($, e, next) => {
    const deny = denyFor(await read($, stoppedA).catch(() => [] as string[]), e.agentId)
    if (deny !== undefined) return { deny }
    const id = e.agentId ?? MAIN
    await act($, { type: 'tool', id, entry: { id: e.tool_use_id, tool: e.tool, target: targetOf(e.tool, e as unknown as Record<string, unknown>), at: await $.clock.now() } }).catch(() => undefined)
    try {
      return await next(e)
    } finally {
      await act($, { type: 'toolDone', id }).catch(() => undefined)
    }
  })

  on('command.run', { command: 'cctop' }, async ($, e) => {
    if (e.args.trim() === 'band') {
      const hidden = await update($, bandHiddenA, h => !h)
      return { text: `cctop band ${hidden ? 'hidden' : 'shown'}.` }
    }
    await openPanel($)
    return { text: 'cctop opened — Tab select · s sort · x stop agent · a abort turn · c compact · q close' }
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    mapTimer?.cancel()
    mapTimer = undefined
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await ensureMapTimer($)
    const now = await $.clock.now()
    return Panel($.ui.resolve(e), {
      meters: await read($, metersA),
      agents: await read($, agentsA),
      spark: await read($, sparkA),
      map: await read($, mapA),
      ui: await read($, uiA),
      startedAt: await read($, startedAtA),
      cwd: await $.session.cwd(),
      now,
      columns: e.props.bodyColumns,
      cfg,
    }, {
      onSelect: id => void doSelect($, id),
      onSort: () => void doSort($),
      onStop: () => void askStop($),
      onAbort: () => void askAbort($),
      onConfirm: () => void doConfirm($),
      onCancel: () => void doCancel($),
      onCompact: () => void doCompact($),
      onClose: () => void doClose($),
    })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const meters = await read($, metersA)
    const isQuiet = !cfg.band || e.props.hasSurvey || meters.ctxWindow === undefined || meters.ctxWindow === 0 || (await read($, bandHiddenA))
    if (isQuiet) return next(e)
    const agents = await read($, agentsA)
    return Band($.ui.resolve(e), { meters, agents, columns: e.props.bodyColumns, cfg })
  })
}
