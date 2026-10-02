import type { ElementTable } from 'claude-code'

import type { AgentRow, MapSnapshot, Meters, UiState } from '../../types'
import type { Config } from '../model/config'

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

export const Panel = (ui: ElementTable, _d: PanelData, _h: PanelHandlers) => {
  const { Text } = ui
  return <Text>cctop</Text>
}
