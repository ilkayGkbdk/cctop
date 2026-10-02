import type { ElementTable } from 'claude-code'

import type { AgentRow, UiState } from '../../types'
import { labelOf, sortRows } from '../model/agents'
import { fmtDuration, fmtTokens } from '../model/format'

const STATE_COLOR: Record<AgentRow['state'], string | undefined> = { run: 'green', wait: undefined, done: undefined, stopped: 'red' }

export const ProcessList = (ui: ElementTable, p: { rows: AgentRow[]; ui: UiState; now: number; columns: number }, onSelect: (id: string) => void) => {
  const { Box, Text, Button } = ui
  const rows = sortRows(p.rows, p.ui.sort, p.now)
  const nowWidth = Math.max(10, p.columns - 56)
  return (
    <Box flexDirection="column">
      <Text bold inverse>{'  ID   AGENT          STATE    TIME   TOKENS  TOOLS  NOW'.padEnd(Math.max(0, p.columns - 1))}</Text>
      {rows.map(row => {
        const isSelected = row.id === p.ui.selected
        const isOver = row.state === 'done' || row.state === 'stopped'
        return (
          <Box flexDirection="column">
            <Box flexDirection="row">
              <Button key={`row-${row.id}`} plain label={`${isSelected ? '▶' : ' '} ${labelOf(p.rows, row.id).padEnd(4)}`} onPress={() => onSelect(row.id)} />
              <Text dimColor={isOver}>{` ${row.type.slice(0, 14).padEnd(14)} `}</Text>
              <Text color={STATE_COLOR[row.state]} dimColor={isOver}>{row.state.padEnd(8)}</Text>
              <Text dimColor={isOver}>{fmtDuration((row.endedAt ?? p.now) - row.startedAt).padStart(5)}</Text>
              <Text dimColor={isOver}>{fmtTokens(row.tokens).padStart(9)}</Text>
              <Text dimColor={isOver}>{String(row.tools).padStart(7)}  </Text>
              <Text dimColor={isOver} wrap="truncate-end">{row.now.slice(0, nowWidth)}</Text>
            </Box>
            {p.ui.expanded === row.id && row.history.slice().reverse().map(entry => (
              <Text dimColor wrap="truncate-end">{`        ${entry.tool.padEnd(8)} ${entry.target}`.slice(0, p.columns - 1)}</Text>
            ))}
          </Box>
        )
      })}
    </Box>
  )
}
