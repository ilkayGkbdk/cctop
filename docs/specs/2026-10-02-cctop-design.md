# cctop — design

*htop for Claude Code: see your context, rate limits and subagents live.*

Status: approved design, pre-implementation · 2026-10-02

## 1. Goal

An open-source Claude Code **mod** (function-hooks plugin) that shows, live and
inside Claude Code, what is otherwise invisible while Claude works:

- how full the context window is, what fills it, and how close auto-compact is;
- how much of the 5-hour and weekly rate-limit windows is used;
- how fast the model is streaming and what the session costs;
- which agents (main + subagents) are running, what each is doing right now,
  with the ability to stop one.

Success: a user installs it with one command, keeps it on every session, and the
README GIF makes the value obvious in 15 seconds. Target: 5k GitHub stars.

### Users and pains

Claude Code users, from casual to power users running parallel subagents:

1. Compaction arrives without warning and loses working context.
2. Rate limits are hit mid-task with no sense of how close they were.
3. Subagents are a black box: no view of what each is doing or costing.

### Why a mod and not an external TUI

Engine-only data is the differentiator: real rate-limit windows, the /context
category breakdown, subagent identities from `agent.spawn`, live streaming via
`turn.step`, and the ability to act (abort a turn, stop a subagent). An external
tool reading transcript JSONL can only estimate these.

## 2. Scope

### v1 (this spec)

- Panel (`/cctop`) with header meters, context map, process list.
- One-line band above the prompt while the panel is closed.
- Threshold toasts (context, 5-hour window).
- Keyboard interaction: select, sort, stop agent, abort turn, compact, quit.
- Configurable thresholds and band visibility via `userConfig`.

### Not in v1

- File radar / repo treemap (v1.1, as a panel tab).
- External `npx cctop --attach` viewer (v2).
- Persisting or analysing past sessions (out of scope; Flight Recorder's job).
- Themes beyond the default (good-first-issue material).

## 3. Screen design

### Panel (`/cctop`), ~100 columns

```
 cctop 0.1 · opus-5-5 · ~/proj/api · up 00:42:17                 ● streaming
 CTX  [||||||||||||||||||||||||||||       ] 112k/200k 56%   compact @ 80%
 5H   [||||||||||                         ]  27%   resets 2h14m
 WEEK [||||||||||||||||                   ]  41%   resets Thu
 SPD  [|||||||||||||||||||||              ]  84 tok/s
 $ 3.42  ▁▂▂▃▅▇▆▃▂▁▂▄▆█▅  last turn $0.31 · cache 91%

 CONTEXT MAP                                    by category
 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■  ■ system   9.8k  5%
 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■□□□□□□□□□□□□□□  ■ tools   14.1k  7%
 □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  ■ memory   3.2k  2%
                                                ■ messages 85k  42%
                                                □ free     88k  44%

  ID   AGENT          STATE    TIME   TOKENS  TOOLS  NOW
▶ main claude         run     12:04   84.1k     37  Edit src/auth/AuthService.cs
  a1   Explore        run      0:41   12.7k      9  Grep "JwtOptions"
  a2   code-reviewer  wait     1:12    8.3k      4  Read tests/AuthTests.cs
  a3   Plan           done     2:30   21.0k     11  —

 Tab Select  s Sort  x Stop agent  a Abort turn  c Compact  q Quit
```

- **Header meters.** Bars colour green → yellow → red by fill (thresholds in
  §6). `compact @ N%` shows the auto-compact threshold when the engine reports
  one. `SPD` is output tokens per second over a sliding window; its bar scales
  to the session's peak.
- **Cost line.** Session USD, a sparkline of per-turn cost (last 30 turns), the
  last turn's cost, and cache-read share of input tokens for the last turn.
- **Context map.** The /context grid (`gridRows`) drawn as run-length coloured
  `Text` segments per grid row (grid colours are theme keys, which `Raster`
  cannot take), each square in its category colour; legend with tokens and percent per category.
  Below 90 body columns the grid is hidden and only the legend shows.
- **Process list.** One row per agent: `main` plus each subagent from
  `agent.spawn`. Columns: id, agent type, state (`run` streaming or in a tool,
  `wait` idle between steps, `done`, `stopped`), elapsed time, tokens (the agent's
  current context size: last step's input + cache + output), tool count, current activity (tool + target, or `thinking…`). Finished agents stay
  listed, dimmed, until the next user prompt. `Enter` on a row expands its last
  20 tool calls inline.
- **Keys** (while the panel has focus; the engine allows only lowercase
  letters and digits as hotkeys, and arrows scroll a pane): `Tab`/click
  selects a row, `Enter` on a selected row expands it, `s` cycles sort
  (start / tokens / time), `x` stops the selected subagent (confirm `y`/`n`),
  `a` aborts the current turn (confirm `y`/`n`), `c` runs `/compact`,
  `q`/`Esc` closes. The footer lists every key.

### Band (panel closed)

```
 cctop  CTX 56% ▮▮▮▮▮▯▯▯  5H 27%  WK 41%  84 tok/s  $3.42  ⑂ 3 agents
```

Hidden when there is nothing to show yet (no measurement received) or when
disabled in config. Segments with no data are omitted, never shown as `n/a`.

### Toasts

- Context fill crosses `ctxWarnPercent` (default 80): "Context 80% — compaction
  is near. /compact now or /cctop to see what fills it."
- 5-hour window crosses `rateWarnPercent` (default 90).
- Each fires once per crossing (re-arms when the value drops below again).

## 4. Data flow

| Engine event / call | Updates |
| --- | --- |
| `session.measure` | context fill and window, rate-limit windows, session cost. Push-based: fires only on change. |
| `turn.start` | current `turnId` (for abort), turn start time, cost at turn start |
| `turn.complete` | per-turn cost → sparkline sample; for a subagent (`agentId`), marks it `done` |
| `turn.step` (streaming) | streamed output size → tok/s; `● streaming`; per-agent tokens from step usage |
| `agent.spawn` | new process row: `agentId`, `subagentType`, `description`, model, start time |
| `tool.call` | the agent's current activity and tool count, last-20 history; denies calls of a soft-killed agent |
| `$.session.usage({ breakdown: 'summary' })` | context map; polled every 2 s only while the panel is open (local estimate, no API request) |

All hooks pass events through unchanged (`next(e)`), except `tool.call` for an
agent the user stopped, which returns `{ deny }`.

### State

Live values live in `$.state` atoms under plugin `cctop`, so a hot reload keeps
them and only readers redraw:

- `meters`: context, rate limits, cost, speed, streaming flag.
- `agents`: process rows and their last-20 tool calls.
- `spark`: per-turn cost samples (ring of 30).
- `map`: last context breakdown (categories + grid) and its timestamp.
- `ui`: selection, sort, expanded row, pending confirmation.

Writes from `turn.step` are throttled to at most 4 per second. User settings
come from `userConfig`; cctop writes nothing to disk.

## 5. Module layout

```
.claude-plugin/plugin.json      manifest, userConfig
hooks/hooks.json
hooks/register.tsx              thin wiring: events → model → state; commands; render hooks
hooks/model/meters.ts           pure: measurement → bar values, colours, labels
hooks/model/agents.ts           pure: agent table reducer (spawn / step / tool / complete / kill)
hooks/model/speed.ts            pure: sliding-window tok/s, sparkline sampling
hooks/view/Meter.tsx            one htop bar
hooks/view/ContextMap.tsx       Raster grid + legend
hooks/view/ProcessList.tsx      agent table, selection, expansion
hooks/view/Panel.tsx            panel composition
hooks/view/Band.tsx             one-line band
types/index.d.ts                $.state contract
tests/                          unit tests for model/, engine tests for hooks and views
docs/specs/                     this file
README.md  CHANGELOG.md  CONTRIBUTING.md  LICENSE (MIT)
.github/workflows/ci.yml
```

Rule: `model/` and `view/` never receive `$`; only `register.tsx` touches the
engine. Views take the surface's element table and plain data.

## 6. Configuration (`userConfig`)

| Field | Default | Meaning |
| --- | --- | --- |
| `band` | `true` | show the band above the prompt |
| `ctxWarnPercent` | `80` | context toast threshold; also the bar's red threshold |
| `rateWarnPercent` | `90` | 5-hour toast threshold |
| `mapPollMs` | `2000` | context map refresh while the panel is open |

Bar colours: green below 60 %, yellow from 60 %, red from the warn threshold.

## 7. Error handling and degraded data

- No subscription → no rate-limit windows: the `5H`/`WEEK` rows and band
  segments are hidden.
- No cost ledger → the `$` line and band segment are hidden.
- `usage({ breakdown })` rejects or is unavailable → the map keeps its last
  value, dimmed, with "stale" in its header; the panel otherwise works.
- Any hook failure must not affect Claude: each hook catches its own errors
  around state updates and always returns `next(e)`'s result.
- Soft-kill applies only to a subagent cctop has listed as running, after `y`.

## 8. Known limitations

- Stopping a single subagent is a **soft kill**: the engine exposes no per-agent
  abort, so cctop denies the agent's subsequent tool calls with "stopped by the
  user via cctop"; a response already streaming finishes. `a` aborts the whole
  turn via `$.turn.abort`.
- Context map categories are the engine's local estimate (`summary`), so their
  total can differ slightly from the measured fill.
- Requires a Claude Code version with the function-hooks mods API; the README
  states the minimum version.

## 9. Testing

- **Unit (model/):** bar values and colour thresholds; agent reducer
  transitions (spawn → step → tool → complete, stop, unknown agent); tok/s over
  a sliding window; sparkline ring.
- **Engine (`claude plugin test`):** fake `session.measure`, `agent.spawn`,
  `tool.call`, `turn.step` and `turn.complete`; mount the panel and band on
  `terminal` and `desktop`; assert texts and key handling; assert a soft-killed
  agent's next `tool.call` is denied and others pass.
- **Manual:** hot-reloaded in a live session with parallel subagents.
- **CI:** `claude plugin validate`, `tsc`, `claude plugin test` on push and PR.

## 10. Release and launch

- MIT, `v0.1.0` tag, CHANGELOG.
- README: GIF first (≤15 s: three subagents, context filling, warning toast,
  `k` stopping one), one-line pitch, one-line install (`--plugin-dir`, then
  `CLAUDE_CODE_PLUGIN_DIRS` for permanent use; a marketplace entry if one is
  available at release), "Why" built on the three pains, keys, config,
  limitations.
- `docs/launch.md`: draft texts for Show HN, r/ClaudeAI, X, and awesome-list
  PRs. Posting is the maintainer's call.
- `CONTRIBUTING.md` and a few good-first-issues (themes, file radar).
