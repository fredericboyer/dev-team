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
- **Last-verified**: 2026-03-26
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
- **Context**: dev-team-review-gate.js is a PreToolUse hook on Bash intercepting git commit. Two gates: (1) review evidence — checks sidecar files exist in .dev-team/.reviews/ for each staged impl file, (2) findings resolution — blocks on unresolved [DEFECT] findings. Content hash in sidecar filenames ensures stale reviews don't match. LIGHT reviews are advisory only. --skip-review is the escape hatch. Supersedes ADR-013 approach (tracking file removed in PR #113).

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
- **Last-verified**: 2026-03-26
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
- **Type**: SUGGESTION [open]
- **Source**: Codebase audit, Issue #440
- **Tags**: ci, security, npm, dx
- **Outcome**: accepted — issue created for v1.7.0
- **Last-verified**: 2026-03-26
- **Context**: CI runs build/test/lint/validate but does not run npm audit. Adding an audit step would catch known vulnerabilities in dependencies before release.

### [2026-03-26] review-gate.test.js excluded from test script
- **Type**: SUGGESTION [open]
- **Source**: Codebase audit, Issue #435
- **Tags**: testing, hooks, dx
- **Outcome**: accepted — issue created for v1.7.0
- **Last-verified**: 2026-03-26
- **Context**: review-gate.test.js exists but is not included in the npm test glob. Tests are not running in CI.

### [2026-03-27] Symlink creation extracted to ensureSymlink() in files.ts
- **Type**: DECISION [verified]
- **Source**: Issue #441
- **Tags**: duplication, files, dx
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: ~30 lines of identical symlink creation with Windows junction fallback existed in both init.ts and update.ts. Extracted to ensureSymlink() in files.ts. Also removed unused fs import from init.ts. Part of the hook/utility dedup series (#436, #437).

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-03-26] Audit baseline: 14 findings (0 DEFECT, 1 RISK, 1 QUESTION, 12 SUGGESTION)
- **Type**: CALIBRATION
- **Source**: Full codebase audit 2026-03-26
- **Tags**: audit, calibration, baseline
- **Outcome**: all accepted — 14 issues created
- **Last-verified**: 2026-03-26
- **Context**: First full tooling audit. Zero DEFECTs — tooling infrastructure is solid. High SUGGESTION count (12) reflects maturity — the codebase is past critical issues, now in refinement phase. Primary themes: hook code consolidation (D1/D2), CI hardening (npm audit), test coverage expansion, and migration completeness (cross-validates Knuth K1/K3).
