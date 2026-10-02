# Records the README demo:  vhs docs/demo.tape
# Needs: vhs, a logged-in Claude Code, and the playground folder below.
# The raw recording runs in real time; docs/make-gif.sh trims and speeds it
# up into docs/cctop.gif.

Output docs/demo.mp4

Set Shell "zsh"
Set FontSize 15
Set Width 1800
Set Height 1000
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms

Hide
# Start clean: drop variables a parent Claude Code session would pass down.
Type "unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_JOB_DIR CLAUDE_CODE_MESSAGING_SOCKET CLAUDE_CODE_MESSAGING_TOKEN CLAUDE_CODE_EXECPATH CLAUDE_CODE_SESSION_ID CLAUDE_CODE_CHILD_SESSION CLAUDE_CODE_SESSION_ATTENDED CLAUDE_PID CLAUDE_EFFORT"
Enter
Type "cd ~/Development/Projects/claude-mods/playground && clear && claude --model haiku --plugin-dir ~/Development/Projects/claude-mods/cctop"
Enter
Sleep 8s
# Dismiss a first-run dialog if one shows (Esc keeps its default).
Escape
Sleep 2s
Show

Type "/cctop"
Sleep 400ms
Enter
Sleep 3s

Type "Run 3 Explore subagents in parallel: one maps src/, one reads package.json and test.js, one reviews config.yaml. Then summarize in 3 lines."
Sleep 500ms
Enter
Sleep 30s
