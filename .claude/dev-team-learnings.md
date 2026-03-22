# Shared Team Learnings
<!-- Read by all agents at session start. Keep under 200 lines. -->
<!-- For formal decisions, use ADRs instead. This file captures organic learnings. -->

## Coding Conventions

- TypeScript source in `src/`, compiled to `dist/` via `tsc`. Zero runtime dependencies.
- Use oxlint for linting, oxfmt for formatting (not ESLint/Prettier). See ADR-007.
- Hooks are shipped as plain JS (not TS) since they run in target projects.

## Process

- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Spawn review agents as `general-purpose` subagents with the actual agent definition loaded from `.claude/agents/dev-team-*.md`. Do NOT use `pr-review-toolkit:*` as proxies — they have different behavior.
- Don't ask for approval to continue between tasks. Just do the work. Only pause for critical decisions.
- Hooks over CLAUDE.md for enforcement (ADR-001). If agents keep flagging the same pattern, it should be a hook.

## Known Tech Debt

- `readFile()` in `src/files.ts` has broad catch — treats permission errors same as missing file (Szabo finding, tracked).
- `mergeClaudeMd` append-on-missing-END-marker can produce duplicate BEGIN markers on subsequent runs (Knuth finding, edge case).

## Quality Benchmarks

- 106 tests: 25 unit (files), 57 unit (hooks), 9 unit (scan), 7 integration (update), 8 scenario (Node.js, Python, upgrade path)
- 9 agents: Voss, Mori, Szabo, Knuth, Beck, Deming, Docs, Architect, Release
- 4 skills: challenge, task, review, audit
- All 5 hooks have block-path and skip-path coverage.
- CI: 3 OS x 3 Node versions + lint + format + agent validation + hook validation.
- Always run `npm run format` before committing new `.ts` files — oxfmt formatting is checked in CI.

## Overruled Challenges
<!-- When the human overrules an agent, record why — prevents re-flagging -->

