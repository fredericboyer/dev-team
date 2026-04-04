# Agent Memory: Knuth (Quality Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Coverage Gaps Identified

### [2026-03-25→2026-03-30] v1.2.0–v2.0 consolidated calibration
- **Type**: CALIBRATION [compressed]
- **Tags**: testing, coverage, boundary-condition, path-correctness, calibration, vocabulary
- **Last-verified**: 2026-04-04
- **Context**: **Coverage**: No coverage tool configured (reconfirmed v3.6.0); coverage gaps identified by code review. Test expansion in v1.7.0–v1.11.0 (symlink guards, sentinel-throw, init/update error paths, createAgent, CLI help). **Boundary conditions**: mergeClaudeMd BEGIN/END edge cases fixed (v1.8.0). Vocabulary alignment across agent/skill boundaries — 3 instances fixed (v1.2.0, v1.9.0 x2). **Path correctness**: recurring 6-time pattern (doctor.ts, status.ts, review skill, memory dir, merge skill .claude copy, agent-patterns.json). **Calibration**: v1.2.0 17 findings 0 overruled; v1.10.1 hotfix 2 ignored (defense-in-depth, error handling — no quality signal). **Composability**: skill-calls-skill pattern verified (v1.9.0). **Dual-code-path**: MCP deriveRequiredAgents diverged from hook (v2.0 K10, fixed). **Working directory**: stray commits from shared directory (v1.10.0, 2 bundled PRs).

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-04-02] v3.3.0: .mergify.yml inline comment DEFECT — FULL review justified
- **Type**: DEFECT [fixed]
- **Source**: #671, review-677 finding #4
- **Tags**: mergify, config, review-tier, quality
- **Outcome**: fixed
- **Last-verified**: 2026-04-02
- **Context**: FULL review on COMPLEX task (#671 Mergify ADR) found missing inline comment in .mergify.yml pull_request_rules. Fixed in commit 959bd64. This validates the LIGHT/FULL review tier system — LIGHT reviews (advisory-only) wouldn't have caught this.

### [2026-04-02] v3.3.0: Hook unit test hermeticity and hash robustness — advisory
- **Type**: SUGGESTION [accepted]
- **Source**: #664, Copilot findings #20-#21
- **Tags**: testing, hooks, hermeticity, advisory
- **Outcome**: accepted
- **Last-verified**: 2026-04-02
- **Context**: Copilot flagged test hermeticity (review-gate tests) and hash computation robustness as advisory. Both accepted — tests use tmpdir for isolation, hash computation follows existing patterns. No functional risk.

### [2026-04-03] v3.5.0: init.ts/update.ts tests (#715, PR #718) — coverage pattern
- **Type**: PATTERN [verified]
- **Source**: #715, PR #718
- **Tags**: testing, coverage, init, update
- **Outcome**: fixed
- **Last-verified**: 2026-04-03
- **Context**: Tests cover exported constants (ALL_AGENTS, QUALITY_HOOKS, INFRA_HOOKS, PRESETS) and pure utility functions (compareSemver, cleanupLegacyMemoryDirs, migrateToV3Layout) — testable without CLI mocking. Interactive run() branches remain untested (issue-scoped exclusion). FULL review (2 rounds): K1 (log format includes() — fixed), K2 (mixed pre-release compareSemver bug — deferred to #720), K3 (preset parsing gap — deferred to #720), K4 (step 5 symlink test — deferred to #719). cleanupLegacyMemoryDirs log format inconsistency was the K1 finding — source appends "/" to dir names but test matched with includes() missing the mismatch.

### [2026-04-03] v3.5.0: compareSemver pre-release parsing gap — deferred to #720 (K2/K3)
- **Type**: RISK [deferred]
- **Source**: #715, PR #718, Knuth findings K2/K3
- **Tags**: semver, compareSemver, edge-case, parsing
- **Outcome**: deferred — #720
- **Last-verified**: 2026-04-03 (v3.6.0 audit K-05 reconfirmed — still open)
- **Context**: compareSemver has a known parsing bug: multi-segment pre-release strings (e.g. "1.0.0-1.0.0") are misparsed when the pre-release label contains dots resembling a version tuple. Separately, mixed pre-release vs release comparison (e.g. "1.0.0-beta" vs "1.0.0") may produce inconsistent ordering. Both deferred to #720 — out of scope for the test coverage PR.

### [2026-04-03] v3.6.0: Regex edge cases in review gate hook — accepted (PR #736)
- **Type**: RISK [accepted]
- **Source**: PR #736, Copilot findings (x3)
- **Tags**: hooks, regex, review-gate, edge-cases
- **Outcome**: accepted
- **Last-verified**: 2026-04-03
- **Context**: Three regex edge cases flagged in the review gate hook (PR #736), all accepted. Deferred hook unit tests and stale sidecar risk also noted. Pattern: the review gate hook accumulates deferred findings — stale sidecar, branch detection, regex edge cases, and missing unit tests are now a cluster of known debt in this file. A dedicated hardening issue should consolidate these.

### [2026-04-03] v3.4.0: TOML escaping test coverage added (#665)
- **Type**: PATTERN [new]
- **Source**: #665, PR feat/665-toml-escaping-tests
- **Tags**: testing, toml, escaping, coverage
- **Outcome**: fixed
- **Last-verified**: 2026-04-03
- **Context**: Tests added for TOML string escaping edge cases. 0 agent review rounds — Copilot only. Continues the test coverage expansion pattern from v1.7.0/v1.8.0/v1.11.0.

### [2026-03-30] v2.0: Comprehensive test suites for canonical format and all adapters
- **Type**: PATTERN [new]
- **Source**: PRs #569, #570, #571, #572
- **Tags**: testing, adapters, canonical, mcp, coverage
- **Outcome**: fixed
- **Last-verified**: 2026-03-30
- **Context**: Test suites added for canonical format and adapters. cursor-adapter.test.js, windsurf-adapter.test.js, mcp-server.test.js, and mcp-review-gate.test.js removed in v2.0.1. Current adapter test files: canonical.test.js, agents-md-adapter.test.js, copilot-adapter.test.js, codex-adapter.test.js. Each adapter has generate+update tests.

### [2026-04-03] v3.6.0 audit: Merge-gate hook has zero unit tests (K-01)
- **Type**: RISK [accepted]
- **Source**: v3.6.0 full codebase audit, Knuth K-01
- **Tags**: testing, hooks, merge-gate, coverage
- **Outcome**: accepted
- **Last-verified**: 2026-04-03
- **Context**: dev-team-merge-gate.js shipped in v3.6.0 (PR #736) without unit tests. Highest priority test gap from this audit. The review gate hook (dev-team-review-gate.js) already accumulates deferred test debt — merge-gate adds to the untested hooks cluster. Pattern: new hooks should ship with tests. Seen: 2nd hook test gap (review-gate + merge-gate).

### [2026-04-03] v3.6.0 audit: Worktree-remove containment check untested (K-02)
- **Type**: RISK [accepted]
- **Source**: v3.6.0 full codebase audit, Knuth K-02
- **Tags**: testing, hooks, worktree, containment, coverage
- **Outcome**: accepted
- **Last-verified**: 2026-04-03
- **Context**: worktree-remove hook containment check (path traversal guard from #725 fix) has no regression test. If the containment logic regresses, worktree removal could operate outside the project boundary. Lower priority than K-01 but important for security regression protection.

### [2026-04-04] v3.8.0: Sanitization mismatch cross-convergence with Szabo (PR #793)
- **Type**: DEFECT [fixed]
- **Source**: #781, PR #793, Knuth K-02 + Szabo S-01
- **Tags**: sanitization, cross-agent, hooks, review-gate, merge-gate
- **Outcome**: fixed
- **Last-verified**: 2026-04-04
- **Context**: Branch sanitization logic diverged between review-gate and merge-gate hooks. Knuth K-02 and Szabo S-01 independently converged on the same finding — unified to ADR-043 spec. CODE_FILE_PATTERN also diverged between hooks (K-03, fixed). Cross-agent convergence validates review quality. Pattern: when hooks share concepts (branch names, file patterns), keep logic in a shared module or spec reference.

### [2026-04-04] v3.8.0: Boundary test gaps as recurring theme
- **Type**: PATTERN [new]
- **Source**: PRs #789-#797, multiple findings
- **Tags**: testing, boundary, hooks, coverage
- **Outcome**: accepted
- **Last-verified**: 2026-04-04
- **Context**: Boundary test gaps appeared across multiple PRs: boundary depth (5) untested (#791 K-04), no test for assessment sidecar branch mismatch (#793 K-04), missing branch field allows bypass (#794 K-02), no test for malformed assessment JSON (#794 K-03), no test for detached HEAD fail-open (#796 K-05). Seen: recurring pattern across v1.11.0, v3.5.0, v3.6.0, v3.8.0. Hook boundary conditions are consistently undertested.
