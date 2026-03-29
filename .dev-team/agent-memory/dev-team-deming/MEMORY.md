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
- **Last-verified**: 2026-03-29
- **Context**: dev-team-tdd-enforce.js (TDD), dev-team-safety-guard.js (safety), dev-team-post-change-review.js (review spawning), dev-team-pre-commit-lint.js (lint), dev-team-pre-commit-gate.js (blocking gate), dev-team-watch-list.js (file watch triggers). ADR-001: hooks over CLAUDE.md for enforcement.

### [2026-03-25] Agent and hook validation scripts run in CI
- **Type**: PATTERN [verified]
- **Source**: .github/workflows/ci.yml analysis
- **Tags**: ci, validation, agents, hooks
- **Outcome**: verified
- **Last-verified**: 2026-03-25
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

### [2026-03-26] Review gate pattern duplication with post-change-review
- **Type**: RISK [resolved]
- **Tags**: hooks, maintenance
- **Last-verified**: 2026-03-26
- **Context**: Pattern duplication was resolved by extracting shared patterns to `.dev-team/hooks/agent-patterns.json` (PR #344). Both hooks now import from a single source. Superseded by the shared pattern extraction approach.

### [2026-03-26] SHARED.md protocol reduces agent definition duplication by ~16%
- **Type**: DECISION [verified]
- **Source**: PR #376 (feat/353), ADR-030
- **Tags**: agents, templates, shared-protocol, dx
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: Common agent sections (progress reporting, memory hygiene, challenge protocol) extracted to SHARED.md. Agent definitions include it via reference. Reduces 1873→1574 total lines. ADR-030 governs the shared protocol pattern.

### [2026-03-26] Process rules extracted from CLAUDE.md to dev-team-process.md
- **Type**: DECISION [verified]
- **Source**: PR #373, ADR-031
- **Tags**: process, dx, claude-md, templates, guarded-files
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: CLAUDE.md was growing unwieldy. Process rules now live in a dedicated file, keeping CLAUDE.md under 100 lines. ADR-031 governs the extraction.

### [2026-03-26] process.md is a guarded file — never overwritten on update
- **Type**: DECISION [verified]
- **Source**: PR #398 (fix/397)
- **Tags**: update, guarded-files, process
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: process.md joins learnings.md and metrics.md as files that are never overwritten by `dev-team update`. update.ts only installs process.md if missing (for pre-v1.5.0 projects). The contradiction between "Never modify .dev-team/" and process.md being user-editable was resolved by clarifying which files are preserved vs overwritten.

### [2026-03-26] Skill invocation control: orchestration vs advisory skills
- **Type**: DECISION [verified]
- **Source**: Issue #409, PR #414
- **Tags**: skills, invocation, dx, enforcement
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Orchestration skills (task, review, audit, retro) get `disable-model-invocation: true` to prevent accidental autonomous firing. Advisory/read-only skills (scorecard, challenge) can be autonomous. This is a design principle in CLAUDE.md.

### [2026-03-26] Language delegation: hooks detect ecosystem, agents interpret
- **Type**: DECISION [verified]
- **Source**: Issue #385, PR #419, ADR-034
- **Tags**: hooks, language-neutral, delegation
- **Outcome**: accepted
- **Last-verified**: 2026-03-26
- **Context**: Hooks replaced JS/TS-specific patterns with language-agnostic structural proxies (nesting depth, control flow density). Test file detection expanded to Go/Python/Java conventions. Complexity scoring no longer keyword-based. Key principle: hooks handle detection and gating, agents handle language-specific interpretation.

### [2026-03-27] cachedGitDiff extracted to shared hook module
- **Type**: DECISION [verified]
- **Source**: Issue #436, branch fix/436-extract-cached-git-diff
- **Tags**: hooks, duplication, shared-module, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: cachedGitDiff was copy-pasted across 3 hooks (tdd-enforce, pre-commit-gate, review-gate). Extracted to `templates/hooks/lib/git-cache.js`. All 3 hooks now `require("./lib/git-cache")`. init.ts and update.ts updated to copy lib/ directory. Remaining duplication: fallback pattern arrays (#437, still open).

### [2026-03-26] CI gap: no npm audit step
- **Type**: SUGGESTION [resolved]
- **Source**: Codebase audit, Issue #440
- **Tags**: ci, security, npm, dx
- **Outcome**: fixed — `audit-dependencies` job added to CI (PR for #440)
- **Last-verified**: 2026-03-27
- **Context**: Added `audit-dependencies` job running `npm audit --audit-level=high` as a separate CI job, consistent with one-concern-per-job pattern. Only blocks on high/critical severity.

### [2026-03-27] review-gate.test.js added to test script (Issue #435)
- **Type**: SUGGESTION [resolved]
- **Source**: Codebase audit, Issue #435
- **Tags**: testing, hooks, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: review-gate.test.js was not in the npm test script. Added to package.json. Also fixed the runGate test helper: it used execFileSync which swallows stderr on exit 0 — switched to spawnSync to capture stderr in all cases. The --skip-review test was failing because the hook outputs via console.warn (stderr) but the helper only captured stderr on error paths.

### [2026-03-27] Symlink creation extracted to ensureSymlink() in files.ts
- **Type**: DECISION [verified]
- **Source**: Issue #441
- **Tags**: duplication, files, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: ~30 lines of identical symlink creation with Windows junction fallback existed in both init.ts and update.ts. Extracted to ensureSymlink() in files.ts. Also removed unused fs import from init.ts. Part of the hook/utility dedup series (#436, #437).

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-03-27] ReDoS guard: safe-regex.js shared module for user-controlled patterns
- **Type**: DECISION [verified]
- **Source**: Issue #434, branch fix/434-redos-guard
- **Tags**: hooks, security, shared-module, regex
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: User-controlled regex from config.json (watchLists[].pattern, taskBranchPattern) was compiled without validation. Created `templates/hooks/lib/safe-regex.js` — checks for nested quantifiers and quantified backreferences, rejects patterns >1024 chars. Applied to dev-team-watch-list.js and dev-team-pre-commit-gate.js. agent-patterns.js left unchanged — it reads developer-authored agent-patterns.json (different trust boundary). Pattern: hooks should validate at system boundaries (user config) but can trust shipped data files.

### [2026-03-29] v1.8.0: Worktree serialization hooks — temporary infrastructure workaround
- **Type**: DECISION [new]
- **Source**: #482, PR #482
- **Tags**: hooks, worktrees, infrastructure, temporary
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: WorktreeCreate/WorktreeRemove hooks use mkdir-based locking to serialize worktree creation (workaround for anthropics/claude-code#34645 and #39680). Classified as INFRA_HOOKS — always installed, not user-selectable. TEMPORARY: remove when upstream fixes land. Hooks are JS, no dependencies, cross-platform. Lock dir: `.dev-team/.worktree-lock`.

### [2026-03-29] v1.8.0: Retro skill verifies tech debt against issue tracker (#473)
- **Type**: DECISION [new]
- **Source**: #456, PR #473
- **Tags**: retro, tech-debt, staleness, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Retro skill Phase 1 (Learnings audit) now cross-checks Known Tech Debt entries against closed issues before reporting. Addresses the v1.7.0 finding where 5 of 7 tech debt entries were already resolved. Uses generic "check the issue tracker" language (not hardcoded gh CLI).

### [2026-03-29] v1.9.0: Extract skill — Borges extraction decomposed into standalone skill
- **Type**: DECISION [new]
- **Source**: #485, PR #492
- **Tags**: skills, extract, borges, dx, composability
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Borges extraction logic extracted from task and retro skills into /dev-team:extract. Orchestration skill with disable-model-invocation:true. Reduces duplication between task and retro (both previously embedded Borges instructions). Retro now delegates to extract instead of inlining. Task Step 4 invokes extract as sub-skill. This is the first instance of the skill-calls-skill composability pattern.

### [2026-03-29] v1.9.0: Review delegation — task skill delegates to /dev-team:review
- **Type**: DECISION [new]
- **Source**: #486, PR #496
- **Tags**: skills, review, task, delegation, dx
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Task skill Step 2 (Review) now delegates to /dev-team:review with --embedded flag instead of inlining review instructions. Review skill gains --embedded mode for compact output consumed by task orchestration. Compact summary passthrough documented for subsequent review rounds. --reviewers flag removed from review skill (breaking change — task controls reviewer selection).

### [2026-03-29] v1.10.0: Merge skill auto-merge timing guard (#489)
- **Type**: DECISION [new]
- **Source**: #489, PR #512
- **Tags**: skills, merge, auto-merge, timing, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Merge skill now enforces: wait for Copilot review → address all findings → then set auto-merge. Previously auto-merge could be set preemptively, causing PRs to merge with unresolved Copilot findings (v1.8.0 PR #484). Guard applies to both .dev-team/ and .claude/ copies.

### [2026-03-29] v1.10.0: Scorecard skill updated for /dev-team:extract awareness (#494)
- **Type**: DECISION [new]
- **Source**: #494, PR #510
- **Tags**: skills, scorecard, extract, borges, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Scorecard now checks for /dev-team:extract invocation (the new Borges entry point) in addition to direct Borges agent spawning. Without this, scorecard would always report "Borges not spawned" for v1.9.0+ workflows that use the extract skill.

### [2026-03-29] v1.10.1: init/update bug trio — config completeness, init guard, settings merge
- **Type**: DECISION [new]
- **Source**: #515, PR #516
- **Tags**: init, update, settings, hooks, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Three bugs fixed: (1) init now appends INFRA_HOOKS labels to config.json hooks array, (2) init refuses when config.json exists (use --force), (3) mergeSettings updates attributes (timeout, type) on existing hooks via Object.assign. Also added removeHooksFromSettings for hook removal cleanup and hookRemovals migration in update.ts. HookEntry interface extended with timeout/blocking fields per Brooks review.
