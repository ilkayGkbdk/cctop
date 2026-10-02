import type { ElementTable } from 'claude-code'

import type { AgentRow, Meters } from '../../types'
import type { Config } from '../model/config'

export type BandData = { meters: Meters; agents: AgentRow[]; columns: number; cfg: Config }

export const Band = (ui: ElementTable, _d: BandData) => {
  const { Text } = ui
  return <Text>cctop</Text>
}
