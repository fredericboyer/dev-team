# Agent Memory: Knuth (Quality Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Coverage Gaps Identified

### [2026-03-25] Three-tier test structure using Node.js built-in test runner
- **Type**: PATTERN [verified]
- **Source**: package.json + project structure analysis
- **Tags**: testing, coverage, test-runner
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Node.js `node --test` runner, no third-party test framework. Tests are pre-compiled JS (not TS). Three tiers: unit (individual modules), integration (install flows), scenarios (end-to-end project types).

### [2026-03-25] No coverage tool configured — coverage is not measured
- **Type**: PATTERN [verified]
- **Source**: package.json analysis
- **Tags**: testing, coverage
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: No c8, istanbul, or similar coverage tool in devDependencies or scripts. Coverage gaps must be identified by code review, not metrics.

### [2026-03-25] mergeClaudeMd append-on-missing-END-marker duplicate BEGIN edge case
- **Type**: RISK [verified]
- **Source**: .dev-team/learnings.md (known tech debt)
- **Tags**: boundary-condition, merge-logic
- **Outcome**: verified
- **Last-verified**: 2026-03-25
- **Context**: Known edge case where subsequent runs can produce duplicate BEGIN markers if END marker is missing. Tracked in shared learnings.

## Recurring Boundary Conditions


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->
