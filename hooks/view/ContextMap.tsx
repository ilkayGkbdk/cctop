import type { ElementTable } from 'claude-code'

import type { MapSnapshot } from '../../types'
import { runsOf } from '../model/contextMap'
import { fmtTokens } from '../model/format'

const GRID_MIN_COLUMNS = 90

export const ContextMapView = (ui: ElementTable, map: MapSnapshot | null, columns: number) => {
  const { Box, Text } = ui
  if (map === null) return <Text dimColor> CONTEXT MAP  measuring…</Text>
  const showGrid = columns >= GRID_MIN_COLUMNS
  return (
    <Box flexDirection="column">
      <Text bold>{` CONTEXT MAP${map.isStale ? '  (stale)' : ''}`}</Text>
      <Box flexDirection="row" gap={2}>
        {showGrid && (
          <Box flexDirection="column" marginLeft={1}>
            {map.grid.map(row => (
              <Box flexDirection="row">
                {runsOf(row).map(run => (
                  <Text color={run.color} dimColor={map.isStale}>
                    {(run.isFilled ? '█' : '░').repeat(run.count)}
                  </Text>
                ))}
              </Box>
            ))}
          </Box>
        )}
        <Box flexDirection="column" marginLeft={showGrid ? 0 : 1}>
          {map.categories.map(c => (
            <Box flexDirection="row" gap={1}>
              <Text color={c.color}>{c.kind === 'free' ? '□' : '■'}</Text>
              <Text>{c.name.slice(0, 18).padEnd(18)}</Text>
              <Text>{fmtTokens(c.tokens).padStart(6)}</Text>
              <Text dimColor>{`${c.percent}%`.padStart(4)}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
