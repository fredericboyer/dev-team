# Shared Team Learnings
<!-- Read by all agents at session start. Keep under 200 lines. -->
<!-- For formal decisions, use ADRs instead. This file captures organic learnings. -->

## Coding Conventions

- oxlint/oxfmt tool preference promoted to `CLAUDE.md` Development section (see ADR-007).

## Process

- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Spawn review agents as `general-purpose` subagents with the actual agent definition loaded from `.dev-team/agents/dev-team-*.md`. Do NOT use `pr-review-toolkit:*` as proxies — they have different behavior.
- Hooks over CLAUDE.md for enforcement (ADR-001). If agents keep flagging the same pattern, it should be a hook.
- **Review gate enforces the adversarial loop at commit time** (ADR-029). Two stateless gates: review evidence + findings resolution. Sidecar files in `.dev-team/.reviews/` keyed by agent + content hash. LIGHT reviews are advisory only. `--skip-review` is the escape hatch.
- **Research-first for architectural releases.** When a release involves architectural changes, run Turing research briefs before implementation. Findings shape ADRs and design decisions, reducing rework. Validated in v1.6.0 (2 briefs → 2 ADRs + 7 design principles).
- **Verify platform behavior against official docs, not third-party sources.** Turing research #406 initially got rules inheritance wrong by relying on inferred behavior. Always check official Claude Code documentation for behavioral claims about rules, subagents, and agent teams.
- **Agent teams sharing a working directory cause cross-branch contamination.** v1.7.0 delivery had repeated issues: agents switched branches under each other, stray commits landed on wrong branches (#447→#438, #436→#446, #440→#434), stashes went stale. Worktree isolation (one worktree per agent) prevents all of these. Prefer worktree-isolated agents for multi-branch parallel work.
- **"Require up-to-date branches" protection creates merge cascades.** Each merge makes other PRs stale, requiring sequential rebase+push. GitHub merge queues would automate this. For now, factor this into time estimates for multi-PR batches.

## Design Principles

- **Don't encode what agents already know.** AI agents have built-in knowledge of languages, frameworks, conventions, and standards. Hardcoding language-specific patterns (test file regex, linter commands, complexity keywords) into hooks or config creates static encyclopedias that are always incomplete. Instead, hooks should detect the ecosystem (read manifest files) and delegate language-specific reasoning to the agent. Include only what agents can't discover: tool preferences, legacy traps, test quirks, custom middleware warnings. (See: "AGENTS.md Verdict" — if the agent can discover it from code, delete it.)

## Known Tech Debt

- `readFile()` in `src/files.ts` distinguishes ENOENT from EACCES/EPERM and logs a warning on permission errors, but still returns null in both cases — can mask security-relevant permission errors (#460, v1.8.0).
- ~~`mergeClaudeMd` duplicate BEGIN markers (#461, fixed v1.8.0).~~ Resolved: missing END marker now replaces from BEGIN to EOF instead of appending.
- ~~`doctor.ts` hookFileMap missing Agent teams guide hook (#431, fixed v1.6.1).~~ Resolved in PR #443.
- ~~`status.ts` checks wrong learnings path after v1.6.0 migration (#432, fixed v1.6.1).~~ Resolved in PR #443.
- ~~File operations (renameSync, copyFile) follow symlinks without lstat guards (#433, fixed v1.7.0).~~ Resolved: assertNotSymlink() guard added to files.ts, applied to copyFile + all renameSync calls in update.ts.
- ~~User-controlled regex patterns lack complexity bounds — ReDoS risk (#434, fixed v1.7.0).~~ Resolved: safe-regex.js shared module validates user-supplied patterns (nested quantifiers, length bounds).
- ~~Hook code duplication (#436, #437, fixed v1.7.0).~~ Resolved: cachedGitDiff extracted to lib/git-cache.js, fallback patterns removed (agents handle language-specific knowledge per ADR-034).

## Quality Benchmarks

- Always run `npm run format` before committing new `.ts` files — oxfmt formatting is checked in CI.
- Finding Outcome Log vocabulary is standardized: outcomes are `fixed`, `accepted`, `deferred`, `overruled`, `ignored`. All skills and agents must use this vocabulary.
- Pre-commit gate: blocks commits without memory updates (override via `.dev-team/.memory-reviewed`).
- **Migration completeness**: Any change that moves/renames files must audit all modules that reference those paths. doctor.ts, status.ts, and skill definitions are recurring victims of path drift (3 instances across v1.5.0–v1.6.0).
- **Retro must verify tech debt staleness.** v1.7.0 found 5 of 7 tech debt entries were already resolved. Retro skill should cross-check Known Tech Debt against recent PRs before reporting (#456).
- **process.exit stubs must throw a sentinel error.** When testing functions that call `process.exit()`, a no-op stub lets execution continue past the exit point, causing false passes. Use a throw-sentinel pattern (e.g., `throw new Error('__EXIT__')`). Independently confirmed by Szabo, Knuth, and Brooks in v1.7.0 review.

## Overruled Challenges
<!-- When the human overrules an agent, record why — prevents re-flagging -->

