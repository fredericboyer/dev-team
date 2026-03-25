# Agent Memory: Deming (Tooling & DX Optimizer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Tooling Decisions

### [2026-03-24] oxlint for linting, oxfmt for formatting — not ESLint/Prettier (ADR-007)
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json + ADR-007 analysis
- **Tags**: linting, formatting, tooling, oxc
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: TypeScript/OXC toolchain chosen for speed. npm run lint uses oxlint on src/, scripts/, templates/hooks/. npm run format uses oxfmt. CI enforces both via lint-and-format job. Format check runs oxfmt --check.

### [2026-03-24] 6 hooks enforce quality gates — TDD, safety, review, lint, gate, watch list
- **Type**: PATTERN [bootstrapped]
- **Source**: templates/hooks/ analysis
- **Tags**: hooks, enforcement, dx
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: dev-team-tdd-enforce.js (TDD), dev-team-safety-guard.js (safety), dev-team-post-change-review.js (review spawning), dev-team-pre-commit-lint.js (lint), dev-team-pre-commit-gate.js (blocking gate), dev-team-watch-list.js (file watch triggers). ADR-001: hooks over CLAUDE.md for enforcement.

### [2026-03-24] Agent and hook validation scripts run in CI
- **Type**: PATTERN [bootstrapped]
- **Source**: .github/workflows/ci.yml analysis
- **Tags**: ci, validation, agents, hooks
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: scripts/validate-agents.js checks agent frontmatter. scripts/validate-hooks.js verifies hook scripts load without errors. Both are separate CI jobs. Hook validation runs cross-platform (3 OS).

### [2026-03-24] TypeScript 6 with NodeNext resolution — pretest builds before test
- **Type**: PATTERN [bootstrapped]
- **Source**: tsconfig.json + package.json analysis
- **Tags**: typescript, build, tooling
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: TS 6.0.2 with ES2022 target, NodeNext modules (ADR-021). pretest script runs npm run build automatically. Source in src/, output in dist/. Tests run against compiled JS.

## Hook Effectiveness


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
