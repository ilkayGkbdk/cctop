# Launch kit

Drafts for the maintainer to post. Nothing here is posted automatically.

## GIF script (≤ 15 s)

Record in a fullscreen terminal (Ghostty/kitty/iTerm, ~140×40), dark theme.

1. `/cctop` — panel docks beside the transcript. (1 s)
2. Prompt: "Use three Explore subagents in parallel to map the auth flow." — three rows appear, `● streaming`, SPD bar moves. (5 s)
3. CTX bar climbs past 80 % → toast. (3 s)
4. `Tab` to `a2`, `x`, `y` → row turns `stopped`. (4 s)
5. Close with `q`; the band stays above the prompt. (2 s)

Recorded with `vhs docs/demo.tape` then `docs/make-gif.sh` (2× speed, ~1.6 MB).

## Show HN

**Title:** Show HN: cctop – htop for Claude Code (context, rate limits, subagents, live)

I kept getting surprised by Claude Code: compaction would kick in mid-task, I'd hit the 5-hour limit without warning, and parallel subagents were a black box.

cctop is a Claude Code mod (the new function-hooks plugin API) that shows all of it live, htop-style: context fill and what fills it, the 5-hour and weekly windows with reset times, tokens/sec while the model streams, session cost with a per-turn sparkline, and one row per running agent with what it's doing right now. You can stop a runaway subagent or abort the turn from the panel.

Because it runs inside Claude Code it reads the engine's own numbers instead of parsing transcripts. Local only, MIT, ~800 lines of TypeScript. Feedback very welcome — especially on what else belongs in the panel.

https://github.com/ilkayGkbdk/cctop

## r/ClaudeAI

**Title:** I made htop for Claude Code — live context, rate limits and subagents in a panel

GIF first, then: what it shows (3 bullets), install (2 lines), "it's a mod, so it reads real engine data", link. Ask: "what would you add?"

## X thread

1. Claude Code needed an htop. So I built one: cctop 🧵 [GIF]
2. Context fill + what fills it, with a warning before auto-compact. 5-hour and weekly limits with reset times.
3. Every subagent gets a row: what it's doing, for how long, how big its context is. Press x to stop one.
4. It's a Claude Code mod — runs inside, reads the engine's numbers, nothing leaves your machine. MIT: github.com/ilkayGkbdk/cctop

## Lists to PR

- awesome-claude-code style lists on GitHub (search "awesome claude code")
- Claude Code plugin / mod directories, if one exists at launch time
- Anthropic's Discord #showcase (if available)
