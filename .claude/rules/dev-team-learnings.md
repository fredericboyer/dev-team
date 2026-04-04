# Shared Team Learnings
<\!-- Read by all agents at session start. Keep under 200 lines. -->
<\!-- For formal decisions, use ADRs instead. This file captures organic learnings. -->

## Coding Conventions

- oxlint/oxfmt tool preference promoted to `CLAUDE.md` Development section (see ADR-007).

## Process

- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Spawn review agents as `general-purpose` subagents with the actual agent definition loaded from `.claude/agents/dev-team-*.agent.md`. Do NOT use `pr-review-toolkit:*` as proxies — they have different behavior.
- Hooks over CLAUDE.md for enforcement (ADR-001). If agents keep flagging the same pattern, it should be a hook.
- **Review gate enforces the adversarial loop at commit time** (ADR-029). Two stateless gates: review evidence + findings resolution. Sidecar files in `.dev-team/.reviews/` keyed by agent + content hash. LIGHT reviews are advisory only. `--skip-review` is the escape hatch.
- **Research-first for architectural releases.** When a release involves architectural changes, run Turing research briefs before implementation. Findings shape ADRs and design decisions, reducing rework. Validated in v1.6.0 (2 briefs → 2 ADRs + 7 design principles) and v2.0 (2 briefs → 2 ADRs + adapter architecture).
- **Verify platform behavior against official docs, not third-party sources.** Turing research #406 initially got rules inheritance wrong by relying on inferred behavior. Always check official Claude Code documentation for behavioral claims about rules, subagents, and agent teams.
- **Agent teams sharing a working directory cause cross-branch contamination.** Recurred in v1.7.0, v1.10.0, v3.3.0, v3.4.0, v3.5.0, v3.6.0, and v3.8.0 (shared working directory, stash conflicts, cherry-pick artifacts). Worktree isolation prevents cross-branch contamination but not stale-base contamination. Prefer worktree-isolated agents for multi-branch parallel work.
- **Push local commits before branching worktrees.** v3.4.0 had universal shared file contamination — every worktree agent inherited unpushed Borges memory and metrics changes from local main (aeda27f). Root cause: worktrees branched from local main with unpushed commits. Ensure main is clean and pushed before spawning worktree agents.
- **Start reviews/merges immediately as each PR lands — don't batch.** The task skill says "review each branch the moment its implementing agent finishes." v3.2.0 repeated the v1.8.0 pattern: waited for all Wave 1 agents to finish before starting any reviews. Pipeline: implement → review → merge per branch, not implement-all → review-all → merge-all.
- **Verify task completion — "completed" doesn't mean delivered.** v3.2.0 had an agent mark a task completed without creating a PR. The orchestrator must verify that a PR exists for every completed implementation task before accepting the completion.
- **Cap parallel agents at 4-6 per wave.** v3.2.0 spawned 12 parallel agents in Wave 1. Multiple agents contaminated the main working directory — likely worktree creation failed or was overwhelmed under load. Verify worktree creation succeeded before letting each agent proceed.
- **"Require up-to-date branches" protection creates merge cascades.** Each merge makes other PRs stale, requiring sequential rebase+push. GitHub native auto-merge handled all v3.3.0 merges successfully. GitHub branch protection rulesets with `required_review_thread_resolution` enforce thread resolution natively (ADR-042). In v3.6.0 this protection was disabled mid-release to reduce cascade overhead — a valid trade-off when branches are known-clean and merge order is controlled.
- **Parallel branches editing shared files create N-way merge conflicts.** When 4 branches all edit dev-team-learnings.md, merging requires sequential ordering with conflict resolution between each merge. Minimize parallel edits to shared files (learnings, process.md) — defer shared-file edits to the final merge when possible.
- **v1.8.0 delivered without `/dev-team:task` or agent reviews — process gap.** All 12 issues implemented directly by the orchestrator with Copilot as sole reviewer. No adversarial review loop. This bypassed the dogfooding requirement. Acceptable for hotfix-level urgency, but not for feature releases. The worktree serialization hooks (#482) and task skill decomposition (#481) shipped without in-team review.
- **LIGHT/FULL review tiers validated in practice.** v3.3.0 was the first release to differentiate: SIMPLE tasks got LIGHT (advisory-only) reviews, COMPLEX tasks got FULL reviews. The FULL review on a COMPLEX task caught the only DEFECT. v3.8.0 reinforced: FULL reviews (4 PRs) caught all 3 DEFECTs; LIGHT reviews (4 PRs) caught 0. The tier system correctly concentrates review effort.
- **Never merge with unresolved review threads.** The merge skill (rewritten in v3.2.0, ADR-040) is reviewer-agnostic: query all unresolved threads via GraphQL `reviewThreads`, address each (fix or defer), resolve via `resolveReviewThread` mutation. GitHub branch protection rulesets enforce `required_review_thread_resolution` at the platform level (ADR-042). Two-phase Copilot polling: wait for workflow to appear (2min), wait to complete (3min). Don't block on human reviewers — set auto-merge and let platform gates enforce.
- **Copilot re-reviews on push create thread resolution cascades.** When fixing review findings and pushing, Copilot triggers a new review pass that opens new threads. Plan for 2-3 rounds of thread resolution per PR. This is inherent to the Copilot review model and not a process failure.
- **Implementer agents must remain alive until review findings are routed.** v3.8.0 added a hook (#795) to enforce this — if an implementer shuts down before review findings are addressed, the hook blocks shutdown. This closes the gap where review findings were produced but had no agent to route them to.
- **Semgrep SAST: added v1.11.0 (#552), removed v3.2.0 (#595).** Removed due to CI complexity and overlap with GitHub CodeQL (already enabled). CodeQL provides equivalent coverage with zero config overhead. If SAST re-evaluation is needed, prefer native platform tooling over third-party runners.

## Design Principles

- **Skill composability: orchestration skills can invoke other skills.** /dev-team:extract and /dev-team:review are invoked by /dev-team:task as pipeline steps. Pipeline step skills use `disable-model-invocation: false` (user-entry skills use `true`). The `--embedded` flag has been removed — pipeline skills always return structured output. See ADR-035 for the composability pattern.
- **Don't encode what agents already know.** AI agents have built-in knowledge of languages, frameworks, conventions, and standards. Hardcoding language-specific patterns (test file regex, linter commands, complexity keywords) into hooks or config creates static encyclopedias that are always incomplete. Instead, hooks should detect the ecosystem (read manifest files) and delegate language-specific reasoning to the agent. Include only what agents can't discover: tool preferences, legacy traps, test quirks, custom middleware warnings. (See: "AGENTS.md Verdict" — if the agent can discover it from code, delete it.)
- **Adapter registry for multi-runtime portability (ADR-036).** ~~Superseded by ADR-040 (GitHub-first, Claude Code-only). Non-Claude adapters planned for removal in #660.~~

## Known Tech Debt

- **INFRA_HOOKS worktree serialization is temporary** — workaround for Claude Code bugs anthropics/claude-code#34645 and #39680. Remove when upstream fixes land.
- **compareSemver multi-segment pre-release parsing gap** — deferred to #720. Known edge case: `compareSemver("1.0.0-1.0.0", ...)` misparses when pre-release string contains dots resembling version segments (Knuth K2/K3, v3.5.0 review).
- **Symlink guard coverage gaps in init.ts/update.ts** — deferred to #719. Symlink test coverage for ancestor-path traversal scenarios in the main entry points (Szabo S-01, Knuth K4, v3.5.0 review).

## Quality Benchmarks

- Always run `npm run format` before committing new `.ts` files — oxfmt formatting is checked in CI.
- Finding Outcome Log vocabulary is standardized: outcomes are `fixed`, `accepted`, `deferred`, `overruled`, `ignored`. All skills and agents must use this vocabulary.
- Pre-commit gate: blocks commits without memory updates (override via `.dev-team/.memory-reviewed`).
- **Migration completeness**: Any change that moves/renames files must audit all modules that reference those paths. doctor.ts, status.ts, and skill definitions are recurring victims of path drift (3 instances across v1.5.0–v1.6.0).
- **process.exit stubs must throw a sentinel error.** When testing functions that call `process.exit()`, a no-op stub lets execution continue past the exit point, causing false passes. Use a throw-sentinel pattern (e.g., `throw new Error('__EXIT__')`). Independently confirmed by Szabo, Knuth, and Brooks in v1.7.0 review.
- **Input boundary validation for string-to-path conversions.** v2.0 had a path traversal finding (F-01 adapter name). All user-facing strings that become file paths must be validated at the parsing/input boundary — not deeper in the call stack.
- ~~**init.ts and update.ts core entry points have no unit tests.**~~ **Resolved in v3.5.0 (#715, PR #718).** 657 lines of tests added covering exported constants, pure utility functions (compareSemver, cleanupLegacyMemoryDirs, migrateToV3Layout). Interactive run() branches remain untested by design.
- ~~**CI scripts must exist in package.json for local parity.**~~ **Resolved in v3.5.0 (#714, PR #717).** validate:docs script added to package.json.

## Overruled Challenges
<\!-- When the human overrules an agent, record why — prevents re-flagging -->
