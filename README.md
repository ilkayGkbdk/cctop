# cctop

**htop for Claude Code — see your context, rate limits and subagents live.**

```
 cctop 0.1 · opus-5-5 · ~/proj/api · up 42:17                     ● streaming
 CTX  [||||||||||||||||||||||||||||       ] 112k/200k 56%   compact @ 80%
 5H   [||||||||||                         ]  27%   resets 2h14m
 WEEK [||||||||||||||||                   ]  41%   resets Thu
 SPD  [|||||||||||||||||||||              ]  84 tok/s
 $3.42  ▁▂▂▃▅▇▆▃▂▁▂▄▆█▅  last turn $0.31 · cache 91%

  ID   AGENT          STATE    TIME   TOKENS  TOOLS  NOW
▶ main claude         run     12:04   84.1k     37  Edit src/auth/AuthService.cs
  a1   Explore        run      0:41   12.7k      9  Grep "JwtOptions"
  a2   code-reviewer  wait     1:12    8.3k      4  Read tests/AuthTests.cs
```

## Why

- **Compaction sneaks up on you.** cctop shows how full the context window is, what fills it, and how far auto-compact is — and warns you at 80 %.
- **Rate limits hit mid-task.** The 5-hour and weekly windows are right there, with their reset times.
- **Subagents are a black box.** Every running agent gets a row: what it is doing now, how long, how big its context is — and you can stop one.

cctop is a Claude Code **mod**: it runs inside Claude Code and reads the engine's own numbers (the `/context` breakdown, rate-limit windows, subagent ids, the live token stream). Nothing leaves your machine and nothing is written to disk.

## Install

Requires a Claude Code build with function-hooks mods (built and tested on **2.1.287**).

```sh
git clone https://github.com/ilkayGkbdk/cctop ~/.claude/cctop
claude --plugin-dir ~/.claude/cctop
```

To load it in every session, add it to the `env` block of `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/cctop" } }
```

## Use

| | |
| --- | --- |
| `/cctop` | open the panel (docked beside the transcript in fullscreen, above the prompt otherwise) |
| `/cctop band` | hide / show the one-line band above the prompt |

The band, while the panel is closed:

```
 cctop  CTX 56% ▮▮▮▮▯▯▯▯  5H 27%  WK 41%  84 tok/s  $3.42  ⑂ 3 agents
```

Keys in the panel:

| Key | Action |
| --- | --- |
| `Tab` / click | select an agent row; again to expand its last 20 tool calls |
| `s` | sort: start → tokens → time |
| `x` | stop the selected subagent (asks `y`/`n`) |
| `a` | abort the current turn (asks `y`/`n`) |
| `c` | run `/compact` (when no turn is running) |
| `q` / `Esc` | close |

## Configure

Set with `/config` (or `pluginConfigs.cctop.options` in settings):

| Option | Default | |
| --- | --- | --- |
| `band` | `true` | show the band above the prompt |
| `ctxWarnPercent` | `80` | context toast, and where the bar turns red |
| `rateWarnPercent` | `90` | 5-hour window toast |
| `mapPollMs` | `2000` | context map refresh while the panel is open |

## How it works

| Engine event | cctop uses it for |
| --- | --- |
| `session.measure` | context fill, rate-limit windows, session cost (push, only on change) |
| `turn.start` / `turn.complete` | turn id for abort, per-turn cost sparkline, cache share |
| `turn.step` (stream) | live tok/s, `● streaming`, per-agent context size |
| `agent.spawn` | a new row per subagent |
| `tool.call` | each agent's current activity and history; denies a stopped subagent's calls |
| `$.session.usage({ breakdown: 'summary' })` | the context map, only while the panel is open (local estimate, no API request) |

Every hook passes the event through unchanged — except tool calls of a subagent you stopped.

## Limitations

- **Stopping a subagent is a soft kill.** The engine has no per-agent abort, so cctop denies that agent's next tool calls with "stopped by the user via cctop"; a response already streaming finishes. `a` aborts the whole turn.
- The context map's categories are the engine's local estimate, so their total can differ slightly from the measured fill.
- Rate-limit rows appear only on a Claude subscription; cost only where Claude Code keeps a cost ledger.
- The mods API is early access and may change between Claude Code releases.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues: themes, a file-radar tab.

## License

MIT
