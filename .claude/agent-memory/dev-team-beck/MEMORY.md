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
- **Last-verified**: 2026-03-29 (confirmed: PR #557 added 5 new test files to scripts.test)
- **Context**: New test files must be added to the explicit list in package.json scripts.test. CI runs tests cross-platform (ubuntu, macos, windows) with Node 22.

### [2026-03-25] TDD enforced via hook — dev-team-tdd-enforce.js
- **Type**: PATTERN [verified]
- **Source**: templates/hooks/ analysis
- **Tags**: testing, tdd, hooks
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: TDD enforcement hook ensures tests exist for implementation changes. Part of the hook enforcement suite. See ADR-004 for TDD enforcement rationale.

### [2026-03-27] process.exit stubs must throw to halt execution
- **Type**: PATTERN [verified]
- **Source**: status.test.js implementation
- **Tags**: testing, process-exit, stub
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: When testing functions that call process.exit(), a no-op stub allows execution to continue past the exit point, causing crashes on subsequent code that assumes valid state. The stub must throw a sentinel error that the test harness catches.

### [2026-03-27] v1.7.0: doctor.test.js, status.test.js, prompts.test.js added (#438)
- **Type**: DECISION [verified]
- **Source**: PR #453 (#438)
- **Tags**: testing, coverage, doctor, status, prompts
- **Outcome**: fixed
- **Last-verified**: 2026-03-27
- **Context**: Three core modules had zero test coverage. Tests added using the sentinel-throw pattern for process.exit stubs. Key finding: process.exit stub must throw to halt execution — a no-op stub lets code continue past the exit point, causing crashes. This pattern is now established for all exit-testing.

### [2026-03-29] v1.8.0: 18 tests for security-critical functions (#480)
- **Type**: DECISION [new]
- **Source**: #480, PR #480
- **Tags**: testing, security, symlink, regex, coverage
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: assertNotSymlink, assertNoSymlinkInPath, and safeRegex each got dedicated test suites. Tests cover: leaf rejection, ancestor traversal, realpathSync tradeoff behavior, nested quantifier patterns, length bounds. Uses the sentinel-throw pattern for process.exit. Tightened existing test assertions (#474) to reduce false positive risk — narrower assertions catch regressions that broad ones miss.

### [2026-03-29] v1.11.0: Worktree hook tests and input validation (#529, #537)
- **Type**: DECISION [new]
- **Source**: #529, #537, PR #556
- **Tags**: testing, hooks, worktree, input-validation
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Worktree serialization hooks (WorktreeCreate/WorktreeRemove) gained proper test coverage and input validation. Tests verify lock acquisition, timeout behavior, and cleanup. Input validation guards against missing/invalid worktree paths.

### [2026-03-29] v1.11.0: Test coverage batch — init error paths, update backup, createAgent, CLI help
- **Type**: DECISION [new]
- **Source**: #540, #541, #542, #545, #548, PR #557
- **Tags**: testing, coverage, init, update, cli, createAgent
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Five coverage gaps closed in single PR: init error paths (missing package.json, config already exists), update backup flow, createAgent validation (empty name, missing fields), CLI --help output verification, hookRemovals integration test. Continues systematic coverage expansion pattern.

## Framework and Runner Notes


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
