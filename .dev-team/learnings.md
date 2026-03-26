# Shared Team Learnings
<!-- Read by all agents at session start. Keep under 200 lines. -->
<!-- For formal decisions, use ADRs instead. This file captures organic learnings. -->

## Coding Conventions

- TypeScript source in `src/`, compiled to `dist/` via `tsc`. Zero runtime dependencies.
- Use oxlint for linting, oxfmt for formatting (not ESLint/Prettier). See ADR-007.
- Hooks are shipped as plain JS (not TS) since they run in target projects.

## Process

- **Security check at session start.** Run `/security-status` at the beginning of every session to check code scanning, Dependabot, and secret scanning alerts. Also run before releases.
- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Spawn review agents as `general-purpose` subagents with the actual agent definition loaded from `.dev-team/agents/dev-team-*.md`. Do NOT use `pr-review-toolkit:*` as proxies — they have different behavior.
- Don't ask for approval to continue between tasks. Just do the work. Only pause for critical decisions.
- **Follow through to completion without prompting.** When auto-merge is set or CI is pending, monitor and complete the next step (tag, release, cleanup) without waiting for the user to ask "is it done yet?"
- **When creating a PR for a tracked issue, link it in the PR body** (e.g., `Closes #NNN`). This lets the platform auto-close the issue on merge. Agents should include this when they know the issue number.
- Hooks over CLAUDE.md for enforcement (ADR-001). If agents keep flagging the same pattern, it should be a hook.
- **Every deferred finding must become a tracked GitHub issue.** When deferring a review or Copilot finding, create the issue immediately with origin (PR, reviewer), the finding, and assessment context. "Worth considering in a follow-up" without a tracked issue is not acceptable.
- **Close the GitHub milestone after creating the release PR.** Use `gh api repos/{owner}/{repo}/milestones/{number} -X PATCH -f state=closed`.
- **Release publishing is automated via CI.** After merging the release PR, push the git tag — the `release.yml` workflow handles npm publish and GitHub release creation automatically. Do NOT manually run `npm publish` or `gh release create` — this causes CI job failures (duplicate release) and wasted effort (no local npm auth).
- **Improvements must be project-agnostic and target `templates/`.** Never modify `.dev-team/` directly for improvements — those files get overwritten by `dev-team update`. All improvements go into `templates/` and ship in future versions. Project-specific conventions stay in local learnings only.
- **Dogfooding is the product loop.** Using dev-team on dev-team surfaces friction → `/dev-team:retro` captures patterns → issues target `templates/` → next release improves the tool for everyone. Every session is a test run.

## Known Tech Debt

- `readFile()` in `src/files.ts` distinguishes ENOENT from EACCES/EPERM and logs a warning on permission errors, but still returns null in both cases — can mask security-relevant permission errors (Szabo finding, tracked).
- `mergeClaudeMd` append-on-missing-END-marker can produce duplicate BEGIN markers on subsequent runs (Knuth finding, edge case).

## Quality Benchmarks

- Tests: `npm test` for current count. Three-tier structure: unit, integration, scenarios.
- Agents: see `src/init.ts` ALL_AGENTS array for current roster. ADR-022 governs proliferation (soft cap 15).
- Skills: see `templates/skills/` for current list. Framework skills ship with every install.
- Hooks: see `templates/hooks/` for current list. 3 always-on reviewers: Szabo, Knuth, Brooks.
- CI: 3 OS (ubuntu, macos, windows) x Node 22 + lint + format + agent validation + hook validation.
- Always run `npm run format` before committing new `.ts` files — oxfmt formatting is checked in CI.

### Learning capture metrics
- Non-empty agent memory files: all active agents have memory dirs
- Last Borges run: not tracked yet (Borges spawning is now enforced via skill definitions)
- Pre-commit gate: blocks commits without memory updates (override via `.dev-team/.memory-reviewed`)
- All implementing agents have mandatory Learnings Output section in their definitions
- First calibration metrics entry recorded for v1.2.0. All future tasks should append to `.dev-team/metrics.md`.
- Finding Outcome Log vocabulary is standardized: outcomes are `fixed`, `accepted`, `deferred`, `overruled`, `ignored`. All skills and agents must use this vocabulary.

## Overruled Challenges
<!-- When the human overrules an agent, record why — prevents re-flagging -->

