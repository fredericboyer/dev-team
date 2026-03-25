# Agent Memory: Knuth (Quality Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Coverage Gaps Identified

### [2026-03-24] 308 tests using Node.js built-in test runner across 3 tiers
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json analysis
- **Tags**: testing, coverage, test-runner
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: 6 unit tests, 3 integration tests, 4 scenario tests. Node.js `node --test` runner, no third-party test framework. Tests are pre-compiled JS (not TS).

### [2026-03-24] Test directory structure: tests/unit + tests/integration + tests/scenarios
- **Type**: PATTERN [bootstrapped]
- **Source**: project structure analysis
- **Tags**: testing, structure
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Unit tests cover files, hooks, scan, skill-recommendations, create-agent, cli. Integration tests cover fresh-project, idempotency, update. Scenario tests cover node-project, python-project, upgrade-path, orchestration.

### [2026-03-24] No coverage tool configured — coverage is not measured
- **Type**: PATTERN [bootstrapped]
- **Source**: package.json analysis
- **Tags**: testing, coverage
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: No c8, istanbul, or similar coverage tool in devDependencies or scripts. Coverage gaps must be identified by code review, not metrics.

### [2026-03-24] mergeClaudeMd append-on-missing-END-marker duplicate BEGIN edge case
- **Type**: RISK [bootstrapped]
- **Source**: .dev-team/learnings.md (known tech debt)
- **Tags**: boundary-condition, merge-logic
- **Outcome**: pending-verification
- **Last-verified**: 2026-03-24
- **Context**: Known edge case where subsequent runs can produce duplicate BEGIN markers if END marker is missing. Tracked in shared learnings.

## Recurring Boundary Conditions


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
