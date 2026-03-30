# Shared Team Learnings
<\!-- Read by all agents at session start. Keep under 200 lines. -->
<\!-- For formal decisions, use ADRs instead. This file captures organic learnings. -->

## Coding Conventions

- oxlint/oxfmt tool preference promoted to `CLAUDE.md` Development section (see ADR-007).

## Process

- Always use `/dev-team:task` for implementation work — dogfood the agents.
- Spawn review agents as `general-purpose` subagents with the actual agent definition loaded from `.dev-team/agents/dev-team-*.md`. Do NOT use `pr-review-toolkit:*` as proxies — they have different behavior.
- Hooks over CLAUDE.md for enforcement (ADR-001). If agents keep flagging the same pattern, it should be a hook.
- **Review gate enforces the adversarial loop at commit time** (ADR-029). Two stateless gates: review evidence + findings resolution. Sidecar files in `.dev-team/.reviews/` keyed by agent + content hash. LIGHT reviews are advisory only. `--skip-review` is the escape hatch.
- **Research-first for architectural releases.** When a release involves architectural changes, run Turing research briefs before implementation. Findings shape ADRs and design decisions, reducing rework. Validated in v1.6.0 (2 briefs → 2 ADRs + 7 design principles) and v2.0 (2 briefs → 2 ADRs + adapter architecture).
- **Verify platform behavior against official docs, not third-party sources.** Turing research #406 initially got rules inheritance wrong by relying on inferred behavior. Always check official Claude Code documentation for behavioral claims about rules, subagents, and agent teams.
- **Agent teams sharing a working directory cause cross-branch contamination.** v1.7.0 delivery had repeated issues: agents switched branches under each other, stray commits landed on wrong branches (#447→#438, #436→#446, #440→#434), stashes went stale. Worktree isolation (one worktree per agent) prevents all of these. Prefer worktree-isolated agents for multi-branch parallel work.
- **"Require up-to-date branches" protection creates merge cascades.** Each merge makes other PRs stale, requiring sequential rebase+push. GitHub merge queues would automate this. For now, factor this into time estimates for multi-PR batches.
- **Parallel branches editing shared files create N-way merge conflicts.** When 4 branches all edit dev-team-learnings.md, merging requires sequential ordering with conflict resolution between each merge. Minimize parallel edits to shared files (learnings, process.md) — defer shared-file edits to the final merge when possible.
- **v1.8.0 delivered without `/dev-team:task` or agent reviews — process gap.** All 12 issues implemented directly by the orchestrator with Copilot as sole reviewer. No adversarial review loop. This bypassed the dogfooding requirement. Acceptable for hotfix-level urgency, but not for feature releases. The worktree serialization hooks (#482) and task skill decomposition (#481) shipped without in-team review.
- **Never set auto-merge before Copilot findings are addressed.** Every push triggers a Copilot re-review. Setting auto-merge preemptively causes PRs to merge with unresolved findings (v1.8.0 PR #484 merged with 3 unaddressed comments, requiring follow-up PR #487). The merge skill step order is: wait for Copilot → address all findings → then set auto-merge. **Enforced in merge skill since v1.10.0** (#489, PR #512).

## Design Principles

- **Skill composability: orchestration skills can invoke other skills.** /dev-team:extract and /dev-team:review are invoked by /dev-team:task as sub-skills. Use `disable-model-invocation: true` on sub-skills to prevent autonomous firing. The `--embedded` flag signals compact output mode for skill-to-skill invocation. See ADR-035 for the formal pattern.
- **Don't encode what agents already know.** AI agents have built-in knowledge of languages, frameworks, conventions, and standards. Hardcoding language-specific patterns (test file regex, linter commands, complexity keywords) into hooks or config creates static encyclopedias that are always incomplete. Instead, hooks should detect the ecosystem (read manifest files) and delegate language-specific reasoning to the agent. Include only what agents can't discover: tool preferences, legacy traps, test quirks, custom middleware warnings. (See: "AGENTS.md Verdict" — if the agent can discover it from code, delete it.)
- **Adapter registry for multi-runtime portability (ADR-036).** Canonical format = current dev-team format. Adapters translate to runtime-native formats. Adding a runtime = implementing RuntimeAdapter + registering it. No changes to init.ts or update.ts. MCP is the cross-runtime enforcement layer (ADR-037).

## Known Tech Debt

- **INFRA_HOOKS worktree serialization is temporary** — workaround for Claude Code bugs anthropics/claude-code#34645 and #39680. Remove when upstream fixes land.
- **Dual code paths: hook vs MCP review gate.** review_gate logic exists in both `dev-team-review-gate.js` (hook) and `src/mcp/tools/review-gate.ts` (MCP tool). K10 finding in v2.0 showed they diverged during initial implementation. Must be tested and reviewed together until extracted to shared module. See ADR-037.
- **Duplicate import in init.ts.** `import "./adapters/index.js"` appears twice (lines 23-24). Harmless but should be cleaned up.

## Quality Benchmarks

- Always run `npm run format` before committing new `.ts` files — oxfmt formatting is checked in CI.
- Finding Outcome Log vocabulary is standardized: outcomes are `fixed`, `accepted`, `deferred`, `overruled`, `ignored`. All skills and agents must use this vocabulary.
- Pre-commit gate: blocks commits without memory updates (override via `.dev-team/.memory-reviewed`).
- **Migration completeness**: Any change that moves/renames files must audit all modules that reference those paths. doctor.ts, status.ts, and skill definitions are recurring victims of path drift (3 instances across v1.5.0–v1.6.0).
- **process.exit stubs must throw a sentinel error.** When testing functions that call `process.exit()`, a no-op stub lets execution continue past the exit point, causing false passes. Use a throw-sentinel pattern (e.g., `throw new Error('__EXIT__')`). Independently confirmed by Szabo, Knuth, and Brooks in v1.7.0 review.
- **Input boundary validation for string-to-path conversions.** v2.0 had two path traversal findings (F-01 adapter name, R-02 MCP filePath). All user-facing strings that become file paths must be validated at the parsing/input boundary — not deeper in the call stack.

## Overruled Challenges
<\!-- When the human overrules an agent, record why — prevents re-flagging -->

