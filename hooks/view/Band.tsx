import type { ElementTable } from 'claude-code'

import type { AgentRow, Meters } from '../../types'
import type { Config } from '../model/config'
import { fmtUsd, rateLabel } from '../model/format'
import { COLOR, levelOf } from '../model/meters'

export type BandData = { meters: Meters; agents: AgentRow[]; columns: number; cfg: Config }

const mini = (percent: number) => {
  const filled = Math.max(0, Math.min(8, Math.round(percent / 12.5)))
  return '▮'.repeat(filled) + '▯'.repeat(8 - filled)
}

export const Band = (ui: ElementTable, d: BandData) => {
  const { Box, Text } = ui
  const m = d.meters
  const ctx = m.ctxPercent ?? 0
  const running = d.agents.filter(a => a.id !== 'main' && (a.state === 'run' || a.state === 'wait')).length
  const isWide = d.columns >= 60
  return (
    <Box flexDirection="row" gap={2}>
      <Text bold>cctop</Text>
      <Text color={COLOR[levelOf(ctx, d.cfg.ctxWarnPercent)]}>{`CTX ${ctx}%${isWide ? ` ${mini(ctx)}` : ''}`}</Text>
      {m.rate.map(r => (
        <Text color={COLOR[levelOf(r.percent, d.cfg.rateWarnPercent)]}>{`${rateLabel(r.kind) === 'WEEK' ? 'WK' : rateLabel(r.kind)} ${Math.round(r.percent)}%`}</Text>
      ))}
      {isWide && m.tokPerSec > 0 && <Text dimColor>{`${m.tokPerSec} tok/s`}</Text>}
      {m.costUsd !== undefined && <Text>{fmtUsd(m.costUsd)}</Text>}
      {running > 0 && <Text color="cyan">{`⑂ ${running} agent${running === 1 ? '' : 's'}`}</Text>}
    </Box>
  )
}
