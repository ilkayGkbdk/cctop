# Contributing

## Setup

```sh
git clone https://github.com/ilkayGkbdk/cctop && cd cctop
claude --plugin-dir .        # edits hot-reload in that session
```

On first load Claude Code writes `.claude-plugin/types/` and `tsconfig.json` (both git-ignored), so your editor and `tsc -p .` know the API.

## Checks

```sh
claude plugin validate .
claude plugin test .
tsc -p .
```

All three must pass before a PR.

## Layout and rules

- `hooks/register.tsx` is the only file that touches `$` (the engine). Functions that receive `$` are top-level `function` declarations — the validator requires it.
- `hooks/model/*` are pure functions with unit tests in `tests/`. New behaviour starts as a failing test there.
- `hooks/view/*` take the surface's element table and plain data; never `$`. Don't name a variable `h` in a `.tsx` file — it is the JSX factory.
- `$.state` atoms are declared in `types/index.d.ts`, with literal `{ plugin: 'cctop', key: '...' }` refs.
- Every hook returns `next(e)`'s result; cctop observes, it does not steer Claude.
