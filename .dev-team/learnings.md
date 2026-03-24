# Shared Team Learnings
<!-- Read by all agents at session start. Keep under 200 lines. -->
<!-- For formal decisions, use ADRs instead. This file captures organic learnings. -->

## Coding Conventions

- TypeScript source in `src/`, compiled to `dist/` via `tsc`. Zero runtime dependencies.
- Use oxlint for linting, oxfmt for formatting (not ESLint/Prettier). See ADR-007.
- Hooks are shipped as plain JS (not TS) since they run in target projects.

## Process

- **Before merging a PR, ALWAYS check for Copilot review comments** (`gh api repos/{owner}/{repo}/pulls/{pr}/reviews` and `gh api repos/{owner}/{repo}/pulls/{pr}/comments`). Address any findings before merging.
- **Security check at session start.** Run `/dev-team:security-status` at the beginning of every session to check code scanning, Dependabot, and secret scanning alerts. Also run before releases.
- **Use `/dev-team:merge` to merge PRs.** It handles Copilot review comments, auto-merge, CI monitoring, and post-merge actions automatically. Do not manually run `gh pr merge` or check Copilot comments separately.
- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Spawn review agents as `general-purpose` subagents with the actual agent definition loaded from `.dev-team/agents/dev-team-*.md`. Do NOT use `pr-review-toolkit:*` as proxies — they have different behavior.
- Don't ask for approval to continue between tasks. Just do the work. Only pause for critical decisions.
- Hooks over CLAUDE.md for enforcement (ADR-001). If agents keep flagging the same pattern, it should be a hook.
- Security check at session start is now enforced via skill preambles (task/review/audit). No longer needs manual reminder.
- "Be vocal about learnings" is now enforced via mandatory Learnings Output section in all implementing agent definitions.

## Known Tech Debt

- `readFile()` in `src/files.ts` has broad catch — treats permission errors same as missing file (Szabo finding, tracked).
- `mergeClaudeMd` append-on-missing-END-marker can produce duplicate BEGIN markers on subsequent runs (Knuth finding, edge case).

## Quality Benchmarks

- 273 tests total (was 117 at v0.3.0)
- 12 agents: Voss, Mori, Szabo, Knuth, Beck, Deming, Tufte, Brooks, Conway, Drucker, Borges, Hamilton
- 6 skills: challenge, task, review, audit, security-status, merge
- 6 hooks: TDD enforce, safety guard, post-change review, pre-commit gate (blocking), pre-commit lint, watch list
- 3 always-on reviewers: Szabo (security), Knuth (correctness), Brooks (architecture + quality attributes)
- CI: 3 OS x 3 Node versions + lint + format + agent validation + hook validation.
- Always run `npm run format` before committing new `.ts` files — oxfmt formatting is checked in CI.

### Learning capture metrics
- Non-empty agent memory files: 0 of 12 active agents (16 memory dirs exist, 4 are legacy pre-rename: architect, docs, lead, release)
- Last Borges run: not tracked yet (Borges spawning is now enforced via skill definitions)
- Pre-commit gate: blocks commits without memory updates (override via `.dev-team/.memory-reviewed`)
- All 7 implementing agents have mandatory Learnings Output section

## Overruled Challenges
<!-- When the human overrules an agent, record why — prevents re-flagging -->

