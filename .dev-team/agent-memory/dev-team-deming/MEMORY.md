# Agent Memory: Deming (Tooling & DX Optimizer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Tooling Decisions

### [2026-03-25] oxlint for linting, oxfmt for formatting — not ESLint/Prettier (ADR-007)
- **Type**: PATTERN [verified]
- **Source**: package.json + ADR-007 analysis
- **Tags**: linting, formatting, tooling, oxc
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: OXC toolchain chosen for speed. npm run lint uses oxlint on src/, scripts/, templates/hooks/. npm run format uses oxfmt. CI enforces both via lint-and-format job. Format check runs oxfmt --check.

### [2026-03-25] Hooks enforce quality gates — TDD, safety, review, lint, gate, watch list
- **Type**: PATTERN [verified]
- **Source**: templates/hooks/ analysis
- **Tags**: hooks, enforcement, dx
- **Outcome**: verified
- **Last-verified**: 2026-03-25
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
- **Type**: RISK [acknowledged]
- **Tags**: hooks, maintenance
- **Last-verified**: 2026-03-26
- **Context**: review-gate.js duplicates the pattern arrays from post-change-review.js for deriveRequiredAgents(). This is intentional — the hooks must be independently deployable (no shared imports in template hooks). If patterns change in one, they must change in both. Consider extracting shared patterns to a JSON file in a future iteration.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
