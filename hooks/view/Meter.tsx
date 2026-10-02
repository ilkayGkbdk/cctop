import type { ElementTable } from 'claude-code'

import type { Level } from '../../types'
import { bar } from '../model/format'
import { COLOR } from '../model/meters'

export const Meter = (ui: ElementTable, p: { label: string; percent: number; width: number; right: string; level: Level }) => {
  const { Box, Text } = ui
  const fill = bar(p.percent, p.width)
  const used = fill.trimEnd()
  return (
    <Box flexDirection="row">
      <Text bold>{` ${p.label.padEnd(5)}`}</Text>
      <Text>[</Text>
      <Text color={COLOR[p.level]}>{used}</Text>
      <Text>{' '.repeat(p.width - used.length)}</Text>
      <Text>]</Text>
      <Text>{` ${p.right}`}</Text>
    </Box>
  )
}
