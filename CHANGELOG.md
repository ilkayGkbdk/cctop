# Changelog

## 0.1.0 — 2026-10-02

- `/cctop` panel: context, 5-hour, weekly and speed meters; cost sparkline with last-turn cost and cache share
- Context map from the engine's `/context` breakdown (grid + legend; legend only below 90 columns)
- Process list of main + subagents: state, time, context size, tool count, current activity; expand to the last 20 tool calls
- Stop a subagent (soft kill), abort the turn, run `/compact` from the panel
- One-line band above the prompt; `/cctop band` toggles it
- Threshold toasts for context fill and the 5-hour window
- `userConfig`: `band`, `ctxWarnPercent`, `rateWarnPercent`, `mapPollMs`
