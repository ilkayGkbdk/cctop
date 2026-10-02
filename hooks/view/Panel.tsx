import type { ElementTable } from 'claude-code'

import type { AgentRow, MapSnapshot, Meters, UiState } from '../../types'
import { labelOf } from '../model/agents'
import type { Config } from '../model/config'
import { fmtDuration, fmtReset, fmtTokens, fmtUsd, rateLabel } from '../model/format'
import { levelOf } from '../model/meters'
import { sparkline } from '../model/speed'
import { ContextMapView } from './ContextMap'
import { Meter } from './Meter'
import { ProcessList } from './ProcessList'

export type PanelData = {
  meters: Meters
  agents: AgentRow[]
  spark: number[]
  map: MapSnapshot | null
  ui: UiState
  startedAt: number
  cwd: string
  now: number
  columns: number
  cfg: Config
}

export type PanelHandlers = {
  onSelect: (id: string) => void
  onSort: () => void
  onStop: () => void
  onAbort: () => void
  onConfirm: () => void
  onCancel: () => void
  onCompact: () => void
  onClose: () => void
}

export const Panel = (ui: ElementTable, d: PanelData, act: PanelHandlers) => {
  const { Box, Text, Button } = ui
  const m = d.meters
  const barWidth = Math.max(10, Math.min(36, d.columns - 40))
  const home = d.cwd.replace(/^\/(?:Users|home)\/[^/]+/, '~')
  const ctxPercent = m.ctxPercent ?? 0
  const confirmText =
    d.ui.confirm === null ? undefined
    : d.ui.confirm.kind === 'stop' ? `Stop ${labelOf(d.agents, d.ui.confirm.agentId)}? Its next tool calls will be denied.`
    : 'Abort the current turn?'

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between">
        <Text>{` cctop 0.1 · ${m.model ?? '…'} · ${home} · up ${fmtDuration(d.now - d.startedAt)}`}</Text>
        {m.isStreaming ? <Text color="green">● streaming </Text> : <Text dimColor>○ idle </Text>}
      </Box>
      {m.ctxWindow !== undefined && m.ctxWindow > 0 &&
        Meter(ui, {
          label: 'CTX', percent: ctxPercent, width: barWidth, level: levelOf(ctxPercent, d.cfg.ctxWarnPercent),
          right: `${fmtTokens(m.ctxTokens ?? 0)}/${fmtTokens(m.ctxWindow)} ${ctxPercent}%${d.map?.autoCompactPercent !== undefined ? `   compact @ ${d.map.autoCompactPercent}%` : ''}`,
        })}
      {m.rate.map(r =>
        Meter(ui, {
          label: rateLabel(r.kind), percent: r.percent, width: barWidth,
          level: levelOf(r.percent, r.kind === 'five_hour' ? d.cfg.rateWarnPercent : 90),
          right: `${String(Math.round(r.percent)).padStart(3)}%   ${r.resetsAt !== undefined ? `resets ${fmtReset(r.resetsAt, d.now)}` : ''}`,
        }),
      )}
      {Meter(ui, {
        label: 'SPD', percent: m.peakTokPerSec > 0 ? (m.tokPerSec / m.peakTokPerSec) * 100 : 0, width: barWidth, level: 'ok',
        right: `${m.tokPerSec} tok/s`,
      })}
      {m.costUsd !== undefined && (
        <Box flexDirection="row" gap={2}>
          <Text bold>{` ${fmtUsd(m.costUsd)}`}</Text>
          <Text color="cyan">{sparkline(d.spark)}</Text>
          <Text dimColor>
            {[m.turnCostUsd !== undefined ? `last turn ${fmtUsd(m.turnCostUsd)}` : '', m.cacheShare !== undefined ? `cache ${m.cacheShare}%` : ''].filter(Boolean).join(' · ')}
          </Text>
        </Box>
      )}
      <Text> </Text>
      {ContextMapView(ui, d.map, d.columns)}
      <Text> </Text>
      {ProcessList(ui, { rows: d.agents, ui: d.ui, now: d.now, columns: d.columns }, act.onSelect)}
      <Text> </Text>
      {confirmText !== undefined ? (
        <Box flexDirection="row" gap={1}>
          <Text color="yellow" bold>{` ${confirmText}`}</Text>
          <Button key="yes" hotkey="y" variant="primary" label="Yes" onPress={act.onConfirm} />
          <Button key="no" hotkey="n" label="No" onPress={act.onCancel} />
        </Box>
      ) : (
        <Box flexDirection="row" gap={1}>
          <Text dimColor> Tab Select</Text>
          <Button key="sort" hotkey="s" plain label={`Sort:${d.ui.sort}`} onPress={act.onSort} />
          <Button key="stop" hotkey="x" plain label="Stop agent" onPress={act.onStop} />
          <Button key="abort" hotkey="a" plain label="Abort turn" onPress={act.onAbort} />
          <Button key="compact" hotkey="c" plain label="Compact" onPress={act.onCompact} />
          <Button key="close" hotkey="q" plain role="dismiss" label="Quit" onPress={act.onClose} />
        </Box>
      )}
    </Box>
  )
}
