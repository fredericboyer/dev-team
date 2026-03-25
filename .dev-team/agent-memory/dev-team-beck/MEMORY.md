# Agent Memory: Beck (Test Implementer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Test Patterns and Conventions

### [2026-03-24] Node.js built-in test runner with assert module — no third-party framework
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json analysis
- **Tags**: testing, framework, test-runner
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Tests use `node --test` with Node.js assert module. No Jest, Mocha, or Vitest. Test files are JS (compiled from TS via build step). Each test file is listed explicitly in the test script.

### [2026-03-24] Three-tier test structure: unit (6), integration (3), scenarios (4)
- **Type**: PATTERN [bootstrapped]
- **Source**: project structure analysis
- **Tags**: testing, structure
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: tests/unit/ covers individual modules (files, hooks, scan, skill-recommendations, create-agent, cli). tests/integration/ covers full install flows (fresh-project, idempotency, update). tests/scenarios/ covers end-to-end project types and orchestration.

### [2026-03-25] 306 tests across 13 test files — test script lists files explicitly
- **Type**: PATTERN [verified]
- **Source**: npm test output + .dev-team/learnings.md
- **Tags**: testing, count, ci
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: 306 test cases (per learnings.md benchmark). Tests run in ~9 seconds. New test files must be added to the explicit list in package.json scripts.test. CI runs tests on 3 OS (ubuntu, macos, windows) with Node 22.

### [2026-03-24] TDD enforced via hook — dev-team-tdd-enforce.js
- **Type**: PATTERN [bootstrapped]
- **Source**: templates/hooks/ analysis
- **Tags**: testing, tdd, hooks
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: TDD enforcement hook ensures tests exist for implementation changes. Part of the 6-hook enforcement suite. See ADR-004 for TDD enforcement rationale.

## Framework and Runner Notes


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
