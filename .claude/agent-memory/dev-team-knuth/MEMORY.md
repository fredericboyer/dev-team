# Agent Memory: Knuth (Quality Auditor)
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Coverage Gaps Identified

### [2026-03-25] No coverage tool configured — coverage is not measured
- **Type**: PATTERN [verified]
- **Source**: package.json analysis
- **Tags**: testing, coverage
- **Outcome**: verified
- **Last-verified**: 2026-03-26
- **Context**: No c8, istanbul, or similar coverage tool in devDependencies or scripts. Coverage gaps must be identified by code review, not metrics.

### [2026-03-29] mergeClaudeMd duplicate BEGIN — FIXED in v1.8.0
- **Type**: RISK [fixed]
- **Source**: #461, PR #479
- **Tags**: boundary-condition, merge-logic
- **Outcome**: fixed
- **Last-verified**: 2026-03-30
- **Context**: Missing END marker now triggers replace-from-BEGIN-to-EOF instead of append. Also fixed END-before-BEGIN edge case by searching for END only after BEGIN position. Two distinct boundary conditions fixed in same PR.

### [2026-03-29] v1.8.0: 18 new tests added — assertNotSymlink, assertNoSymlinkInPath, safeRegex
- **Type**: PATTERN [new]
- **Source**: #480, PR #480
- **Tags**: testing, coverage, symlink, regex
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Test coverage expanded for security-critical functions. Tests cover: leaf symlink rejection, ancestor symlink traversal, realpathSync design tradeoff, safeRegex nested quantifier rejection. Follows sentinel-throw pattern established in v1.7.0.

## Recurring Boundary Conditions

### [2026-03-25] Vocabulary alignment across agent/skill boundaries
- **Type**: PATTERN [verified]
- **Source**: v1.2.0 Branch A (#275, #266) — task skill review
- **Tags**: vocabulary, cross-agent, skill-definition
- **Outcome**: verified
- **Last-verified**: 2026-03-29
- **Context**: Finding outcome vocabularies must stay aligned between skill definitions that produce outcomes (task, review) and agents that consume them (Borges). The task skill originally used "addressed/deferred/disputed" but Borges expects "accepted/overruled/fixed/ignored". Mismatches break automated memory extraction.

## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

### [2026-03-25] v1.2.0–v1.7.0 calibration baseline (consolidated)
- **Type**: CALIBRATION
- **Tags**: audit, calibration, migration, path-correctness, testing
- **Last-verified**: 2026-03-27
- **Context**: v1.2.0: 17 findings, 0 overruled, 3/3 DEFECTs fixed. Naming/overlap suggestions tend to get deferred — raise threshold unless functionally ambiguous. Full audit (2026-03-26): 11 findings, all accepted. 2 DEFECTs were migration drift (doctor.ts + status.ts not updated when v1.6.0 moved files to .claude/rules/) — fixed in v1.6.1/v1.7.0. Coverage gaps on doctor.ts/status.ts/prompts.ts fixed (sentinel-throw pattern). Memory path deming/ → dev-team-deming/ fixed (path-correctness, 4th occurrence). lib copy: Chain B recursive approach superseded Chain A single-file at merge.

### [2026-03-29] v1.9.0: Skill composability — skill-calls-skill pattern verified
- **Type**: PATTERN [verified]
- **Source**: PR #492 finding #12, PR #496 finding #17
- **Tags**: skills, composability, architecture
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: /dev-team:extract is invoked by /dev-team:task and /dev-team:retro. /dev-team:review is invoked by /dev-team:task with --embedded flag. Skill-calls-skill runtime confirmed working. Edge cases documented: empty finding log handled, compact summary passthrough for subsequent review rounds. ADR-035 deferred to #493 for formal documentation of the composability pattern.

### [2026-03-29] v1.9.0: Vocabulary alignment reinforced — "consumed programmatically" wording fixed
- **Type**: SUGGESTION [accepted]
- **Source**: PR #496 finding #16
- **Tags**: vocabulary, skill-definition, review
- **Outcome**: accepted
- **Last-verified**: 2026-03-29
- **Context**: Review skill SKILL.md had misleading "consumed programmatically" wording. Fixed to clarify that the output is consumed by the orchestrating skill (task), not by a machine parser. Vocabulary alignment pattern continues (Seen: 3 times — v1.2.0 task skill, v1.9.0 extract skill, v1.9.0 review skill).

### [2026-03-29] v1.10.0: Missing gate in .claude copy of merge skill — FIXED
- **Type**: DEFECT [fixed]
- **Source**: PR #512, finding #7
- **Tags**: path-correctness, skill-definition, merge
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: Merge skill gate logic was updated in .claude/skills/ source but the installed copy was not staged. Path correctness pattern continues — Seen: 5 times (doctor.ts K1, status.ts K3, review skill path, memory dir deming/, merge skill .claude copy).

### [2026-03-29] v1.10.0: Stray commits from shared working directory — bundled wrong commits into PRs
- **Type**: RISK [accepted]
- **Source**: PR #509 finding #8, PR #511 finding #9
- **Tags**: agent-teams, working-directory, contention, stray-commits
- **Outcome**: accepted
- **Last-verified**: 2026-04-02
- **Context**: PR #509 bundled commits from #490 + #494; PR #511 bundled #490 + #493. Both caused by agents sharing a working directory. Reinforces v1.7.0 finding — worktree isolation prevents cross-branch contamination. Seen: 2nd occurrence (v1.7.0 had 3 stray commits, v1.10.0 had 2 bundled PRs).

### [2026-03-29] v1.10.1: 3 findings ignored — defense-in-depth, test scope, error handling
- **Type**: CALIBRATION
- **Source**: #515, PR #516
- **Tags**: calibration, hotfix
- **Outcome**: 0 accepted, 1 deferred, 2 ignored
- **Last-verified**: 2026-03-29
- **Context**: HOOK_FILES redundancy with ghost filter (ignored — defense in depth), hookRemovals test gap (deferred — unit tests cover it), removeHooksFromSettings swallowing invalid JSON (ignored — mergeSettings runs first). All advisory, no quality signal.

### [2026-03-26] Review skill had wrong path for agent-patterns.json
- **Type**: DEFECT [fixed]
- **Source**: PR #365 (fix/355), Copilot finding
- **Tags**: routing, review-skill, path
- **Outcome**: fixed
- **Last-verified**: 2026-03-26
- **Context**: Review skill referenced agent-patterns.json at wrong path. Corrected to `.dev-team/hooks/agent-patterns.json`. Path correctness is a recurring theme — verify paths in skill definitions during review. Seen: 4 times (this + doctor.ts K1 + status.ts K3 + memory dir deming/ v1.7.0).

### [2026-03-29] v1.11.0: Test coverage expanded — init error paths, update backup, createAgent, CLI help
- **Type**: PATTERN [new]
- **Source**: #540, #541, #542, #545, #548, PR #557
- **Tags**: testing, coverage, init, update, cli
- **Outcome**: fixed
- **Last-verified**: 2026-03-29
- **Context**: 5 test coverage issues addressed in single PR. New tests for: init error paths (missing package.json, invalid config), update backup flow, createAgent validation (empty name, missing fields), CLI --help output, hookRemovals integration. Continues the coverage expansion pattern from v1.7.0 (#438) and v1.8.0 (#480).

### [2026-03-30] v2.0: MCP deriveRequiredAgents diverged from hook — FIXED (K10)
- **Type**: DEFECT [fixed]
- **Source**: PR #572, Knuth finding K10
- **Tags**: mcp, review-gate, agent-patterns, code-sync, quality
- **Outcome**: fixed
- **Last-verified**: 2026-03-30
- **Context**: Initial MCP review_gate implementation used hardcoded agent routing instead of loading from agent-patterns.json. This diverged from the hook's approach and would drift as patterns evolve. Fixed: MCP tool now loads and parses agent-patterns.json with proper fallback. This is the dual-code-path sync risk noted in ADR-037 — first instance of the pattern drifting.

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
- **Last-verified**: 2026-04-03
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
