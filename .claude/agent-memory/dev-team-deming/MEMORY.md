# Agent Memory: Deming (Tooling & DX Optimizer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Tooling Decisions

### [2026-03-25] oxlint for linting, oxfmt for formatting — not ESLint/Prettier (ADR-007)
- **Type**: PATTERN [verified]
- **Source**: package.json + ADR-007 analysis
- **Tags**: linting, formatting, tooling, oxc
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: OXC toolchain chosen for speed. npm run lint uses oxlint on src/, scripts/, templates/hooks/. npm run format uses oxfmt. CI enforces both via lint-and-format job. Format check runs oxfmt --check.

### [2026-03-25] Hooks enforce quality gates — TDD, safety, review, lint, gate, watch list
- **Type**: PATTERN [verified]
- **Source**: templates/hooks/ analysis
- **Tags**: hooks, enforcement, dx
- **Outcome**: verified
- **Last-verified**: 2026-04-03
- **Context**: dev-team-tdd-enforce.js (TDD), dev-team-safety-guard.js (safety), dev-team-post-change-review.js (review spawning), dev-team-pre-commit-lint.js (lint), dev-team-pre-commit-gate.js (blocking gate), dev-team-watch-list.js (file watch triggers). ADR-001: hooks over CLAUDE.md for enforcement.

### [2026-03-25] Agent and hook validation scripts run in CI
- **Type**: PATTERN [verified]
- **Source**: .github/workflows/ci.yml analysis
- **Tags**: ci, validation, agents, hooks
- **Outcome**: verified
- **Last-verified**: 2026-04-03
- **Context**: scripts/validate-agents.js checks agent frontmatter. scripts/validate-hooks.js verifies hook scripts load without errors. Both are separate CI jobs. Hook validation runs cross-platform.

### [2026-03-25] TypeScript with NodeNext resolution — pretest builds before test
- **Type**: PATTERN [verified]
- **Source**: tsconfig.json + package.json analysis
- **Tags**: typescript, build, tooling
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: TypeScript with ES2022 target, NodeNext modules (ADR-021). pretest script runs npm run build automatically. Source in src/, output in dist/. Tests run against compiled JS.

### [2026-03-26] Review gate — stateless commit-time enforcement (ADR-029)
- **Type**: PATTERN [verified]
- **Source**: #263 implementation
- **Tags**: hooks, enforcement, review-loop, dx
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: Two gates: review evidence (sidecar files in .dev-team/.reviews/) + findings resolution (blocks unresolved DEFECTs). Content hash ensures stale reviews don't match. LIGHT advisory. --skip-review escape hatch. Supersedes ADR-013.

## Hook Effectiveness

### [2026-03-26] v1.5.0 era — pattern extraction and template organization (consolidated)
- **Type**: PATTERN [verified]
- **Tags**: hooks, templates, shared-protocol, guarded-files, dx
- **Last-verified**: 2026-03-26
- **Context**: Several foundational DX decisions consolidated: (1) Review gate pattern duplication resolved via agent-patterns.json extraction (PR #344). (2) SHARED.md protocol reduces agent definition duplication ~16% (ADR-030). (3) Process rules extracted from CLAUDE.md to dev-team-process.md (ADR-031). (4) process.md, learnings.md, metrics.md are guarded files — never overwritten on update (PR #398).

### [2026-03-26] Skill invocation control: orchestration vs advisory skills
- **Type**: DECISION [verified]
- **Source**: Issue #409, PR #414
- **Tags**: skills, invocation, dx, enforcement
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Orchestration skills (task, review, audit, retro) get `disable-model-invocation: true` to prevent accidental autonomous firing. Advisory/read-only skills (scorecard, challenge) can be autonomous. This is a design principle in CLAUDE.md.

### [2026-03-26] v1.6.0-v1.7.0 era hook improvements (consolidated)
- **Type**: PATTERN [verified]
- **Tags**: hooks, language-neutral, shared-module, ci, dx
- **Last-verified**: 2026-03-27
- **Context**: (1) Language delegation (ADR-034): hooks use structural proxies (nesting depth, control flow) instead of JS/TS-specific patterns — hooks detect, agents interpret. (2) cachedGitDiff extracted to `templates/hooks/lib/git-cache.js` from 3 hooks. (3) npm audit CI step added (#440). (4) review-gate.test.js added, runGate switched to spawnSync (#435). (5) ensureSymlink() extracted to files.ts (#441).

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-03-27] ReDoS guard: safe-regex.js shared module for user-controlled patterns
- **Type**: DECISION [verified]
- **Source**: Issue #434, branch fix/434-redos-guard
- **Tags**: hooks, security, shared-module, regex
- **Outcome**: fixed
- **Last-verified**: 2026-04-02
- **Context**: User-controlled regex from config.json (watchLists[].pattern, taskBranchPattern) was compiled without validation. Created `templates/hooks/lib/safe-regex.js` — checks for nested quantifiers and quantified backreferences, rejects patterns >1024 chars. Applied to dev-team-watch-list.js and dev-team-pre-commit-gate.js. agent-patterns.js left unchanged — it reads developer-authored agent-patterns.json (different trust boundary). Pattern: hooks should validate at system boundaries (user config) but can trust shipped data files.

### [2026-03-29] v1.8.0: Worktree serialization hooks — temporary infrastructure workaround
- **Type**: DECISION [new]
- **Source**: #482, PR #482
- **Tags**: hooks, worktrees, infrastructure, temporary
- **Outcome**: accepted
- **Last-verified**: 2026-04-03
- **Context**: WorktreeCreate/WorktreeRemove hooks use mkdir-based locking to serialize worktree creation (workaround for anthropics/claude-code#34645 and #39680). Classified as INFRA_HOOKS — always installed, not user-selectable. TEMPORARY: remove when upstream fixes land. Hooks are JS, no dependencies, cross-platform. Lock dir: `.dev-team/.worktree-lock`.

### [2026-03-29] v1.8.0–v1.10.0: Skill architecture evolution (consolidated)
- **Type**: DECISION [verified]
- **Source**: PRs #473, #492, #496, #510, #512
- **Tags**: skills, composability, extract, review, merge, retro, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Consolidated from 5 entries. Key decisions: (1) Retro skill cross-checks tech debt against issue tracker (#473). (2) Extract skill decomposed from task/retro into standalone dev-team-extract — first skill-calls-skill instance (#492). (3) Review delegation: task delegates to dev-team-review --embedded (#496). (4) Merge skill auto-merge timing guard — wait for Copilot before auto-merge (#512). (5) Scorecard updated for dev-team-extract awareness (#510). All stable — no changes since v1.10.0.

### [2026-03-29] v1.10.1: init/update bug trio — config completeness, init guard, settings merge
- **Type**: DECISION [new]
- **Source**: #515, PR #516
- **Tags**: init, update, settings, hooks, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Three bugs fixed: (1) init now appends INFRA_HOOKS labels to config.json hooks array, (2) init refuses when config.json exists (use --force), (3) mergeSettings updates attributes (timeout, type) on existing hooks via Object.assign. Also added removeHooksFromSettings for hook removal cleanup and hookRemovals migration in update.ts. HookEntry interface extended with timeout/blocking fields per Brooks review.

### [2026-03-29] v1.11.0: CI hardening — npm ci, Semgrep, release parallelization, validate-docs
- **Type**: DECISION [new]
- **Source**: #528, #530, #533, #546, #547, PR #552
- **Tags**: ci, security, dx, semgrep, validation
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: CI improvements: npm ci replaces npm install for reproducible builds, Semgrep SAST added (silent on failure per Brooks — deferred to full enforcement), release workflow parallelized, validate-docs job added. Lint scope extended to tests/ directory (#555). Duplicate hook removed (dev-team-watch-list.js had redundant copy).

### [2026-03-30] v2.0: Canonical format + adapter registry (ADR-036)
- **Type**: DECISION [new]
- **Source**: #501, PR #569
- **Tags**: architecture, adapters, multi-runtime, canonical-format, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-30
- **Context**: Agent definitions formalized via CanonicalAgentDefinition interface (portable + runtime-specific fields). Adapter registry pattern extracts agent copy logic from init.ts/update.ts. ClaudeCodeAdapter is identity transform — backward compatible. init.ts and update.ts now iterate registered adapters via getAdaptersForRuntimes(). `runtimes` config field + `--runtime` CLI flag control which adapters run. Duplicate `import "./adapters/index.js"` in init.ts noted but not blocking.

### [2026-04-02] v3.3.0: oxfmt config file (.oxfmtrc.json) added (#666)
- **Type**: DECISION [new]
- **Source**: #666, PR feat/666-oxfmt-config
- **Tags**: formatting, oxfmt, tooling, dx
- **Outcome**: fixed
- **Last-verified**: 2026-04-03 (v3.6.0 audit Q-01 reconfirmed oxfmt pre-stable status; D-S-03 flagged TypeScript 6 also pre-stable)
- **Context**: .oxfmtrc.json added to configure oxfmt behavior. Schema refs local node_modules path — standard practice for node tools. Branch contamination occurred on first attempt; redone in worktree isolation.

### [2026-04-02] v3.3.0: CLI negative assertions and hook unit tests (#672, #664)
- **Type**: DECISION [new]
- **Source**: #672, #664, PRs feat/672-cli-negative-assertions, feat/664-hook-unit-tests
- **Tags**: testing, cli, hooks, dx
- **Outcome**: fixed
- **Last-verified**: 2026-04-02
- **Context**: CLI tests expanded with negative assertions (error path coverage). Hook unit tests added for review-gate. Advisory finding: assertion in catch block can be silently swallowed — accepted.

### [2026-04-03] v3.5.0: validate:docs npm script parity fix (#714)
- **Type**: DEFECT [fixed]
- **Source**: #714, PR fix/714-validate-docs-script
- **Tags**: ci, scripts, package-json, parity, dx
- **Outcome**: fixed
- **Last-verified**: 2026-04-03
- **Context**: CI referenced `validate:docs` script but it was absent from package.json. This caused CI/local parity gap — the script ran in CI (via npm run) but couldn't be run locally without the package.json entry. Zero review findings on this PR. Reinforces: every CI npm run step must have a matching script in package.json.

### [2026-04-03] v3.6.0: console.warn over stderr, Windows chmod skip, type cast cleanup (PR #733)
- **Type**: PATTERN [verified]
- **Source**: PR #733, Copilot findings (5 SUGGESTION, all fixed)
- **Tags**: dx, tooling, windows, console, types
- **Outcome**: fixed
- **Last-verified**: 2026-04-03
- **Context**: Cluster of DX improvements: (1) Use `console.warn` not `process.stderr.write` for warning output — consistent with Node.js idiom. (2) Skip `chmod` on Windows where it's a no-op. (3) Cast to `NodeJS.ErrnoException` instead of `any` for typed error handling. (4) Keep JSDoc up-to-date when function signatures change. (5) Maintain warning prefix consistency (same prefix across all warning paths). Small fixes but pattern: when writing cross-platform Node.js CLI code, always consider Windows paths for chmod/permissions.

### [2026-04-03] v3.6.0: Review gate stale sidecar + branch detection risks — deferred (#736)
- **Type**: RISK [deferred]
- **Source**: PR #736, Copilot findings
- **Tags**: review-gate, sidecar, branch-detection, hooks, deferred
- **Outcome**: deferred
- **Last-verified**: 2026-04-03
- **Context**: Two risks deferred from PR #736: (1) Stale sidecar concern — sidecar files in `.dev-team/.reviews/` may persist across branch switches, causing stale review evidence to match a new commit. (2) Branch detection via HEAD — using HEAD for branch name detection can give wrong result in detached HEAD state or during rebase. Both accepted as known limitations for now. Unit tests for the hook were also deferred. Regex edge cases (x3) were accepted.

### [2026-03-30] v2.0.1: Scope reduction — cursor/windsurf adapters and MCP server removed
- **Type**: DECISION [removed]
- **Source**: #502–#506, #503, PRs #569–#572
- **Tags**: adapters, mcp, scope-reduction, dx
- **Outcome**: removed
- **Last-verified**: 2026-04-02
- **Context**: v2.0.1 removed cursor and windsurf adapters (current: claude, agents-md, copilot, codex) and the MCP enforcement server (ADR-037). MCP removed due to scope reduction — hooks remain primary enforcement. Adapter registry pattern retained for remaining runtimes.

### [2026-04-03] v3.6.0 audit: CI optimization opportunities — parallel jobs and validation dedup (R-01/R-03)
- **Type**: RISK [accepted]
- **Source**: v3.6.0 full codebase audit, Deming R-01/R-03
- **Tags**: ci, optimization, parallel, validation, dx
- **Outcome**: accepted
- **Last-verified**: 2026-04-03
- **Context**: Two CI optimization findings: (1) R-01: duplicate hook validation — validate-hooks runs both as standalone job and within test suite. Remove from validate job to reduce redundancy. (2) R-03: lint/typecheck/format run sequentially in CI but are independent — split into parallel jobs for faster CI. Both accepted — actionable CI improvements.

### [2026-04-03] v3.6.0 audit: Pre-stable tooling risk — oxfmt and TypeScript 6 (Q-01/D-S-03)
- **Type**: RISK [accepted]
- **Source**: v3.6.0 full codebase audit, Deming Q-01/D-S-03
- **Tags**: tooling, oxfmt, typescript, pre-stable, risk
- **Outcome**: accepted
- **Last-verified**: 2026-04-03
- **Context**: Both oxfmt and TypeScript 6 are pre-stable (pre-1.0 semver). Breaking changes possible on minor bumps. Monitor release channels for both. Mitigation: pin versions in package.json, test after upgrades. Acceptable risk given the speed benefits (oxfmt) and language features (TS 6).

### [2026-04-03] v3.6.0 audit: actions/checkout@v6 resolution unverified (R-05)
- **Type**: RISK [accepted]
- **Source**: v3.6.0 full codebase audit, Deming R-05
- **Tags**: ci, github-actions, checkout, version-pinning
- **Outcome**: accepted
- **Last-verified**: 2026-04-03
- **Context**: CI uses actions/checkout@v6 but resolution to a specific commit SHA was not verified. If v6 tag is moved or compromised, CI could pull unexpected code. Best practice: pin to full SHA or verify the tag resolves to expected commit. Low urgency — GitHub-owned actions have strong supply chain controls.
