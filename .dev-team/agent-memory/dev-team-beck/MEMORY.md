# Agent Memory: Beck (Test Implementer)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Test Patterns and Conventions

### [2026-03-25] Node.js built-in test runner with assert module — no third-party framework
- **Type**: PATTERN [verified]
- **Source**: package.json analysis
- **Tags**: testing, framework, test-runner
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Tests use `node --test` with Node.js assert module. No Jest, Mocha, or Vitest. Test files are JS (compiled from TS via build step). Each test file is listed explicitly in the test script.

### [2026-03-25] Three-tier test structure: unit, integration, scenarios
- **Type**: PATTERN [verified]
- **Source**: project structure analysis
- **Tags**: testing, structure
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: tests/unit/ covers individual modules (files, hooks, scan, skill-recommendations, create-agent, cli). tests/integration/ covers full install flows (fresh-project, idempotency, update). tests/scenarios/ covers end-to-end project types and orchestration.

### [2026-03-25] Test files must be explicitly listed in package.json scripts.test
- **Type**: PATTERN [verified]
- **Source**: package.json analysis
- **Tags**: testing, ci
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: New test files must be added to the explicit list in package.json scripts.test. CI runs tests cross-platform (ubuntu, macos, windows) with Node 22.

### [2026-03-25] TDD enforced via hook — dev-team-tdd-enforce.js
- **Type**: PATTERN [verified]
- **Source**: templates/hooks/ analysis
- **Tags**: testing, tdd, hooks
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: TDD enforcement hook ensures tests exist for implementation changes. Part of the hook enforcement suite. See ADR-004 for TDD enforcement rationale.

## Framework and Runner Notes


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
